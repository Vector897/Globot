import {
  MARITIME_NODES,
  MARITIME_EDGES,
  SeaNode,
  SeaEdge
} from './routeData';
import { MAJOR_PORTS } from '../data/ports';

// ============================================================
// Public Interfaces
// ============================================================

export interface GlobalPort {
  name: string;
  coordinates: [number, number];
  country: string;
  region: string;
}

export interface Route {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  color: string;
  strokeWidth: number;
  waypoints: [number, number][];
  waypointNames: string[];
  distance: number;       // nautical miles
  estimatedTime: number;  // days
  description: string;
}

export interface RouteOptions {
  avoidHighRisk?: boolean;
  weatherPenalty?: number;
}

// ============================================================
// Precomputed Adjacency List  (O(1) neighbor lookup per node)
// ============================================================

interface AdjEntry {
  neighborId: string;
  edge: SeaEdge;
}

const ADJACENCY: Record<string, AdjEntry[]> = {};

// Build once at module load
(function buildAdjacency() {
  for (const key in MARITIME_NODES) {
    ADJACENCY[key] = [];
  }
  for (const edge of MARITIME_EDGES) {
    ADJACENCY[edge.from]?.push({ neighborId: edge.to, edge });
    ADJACENCY[edge.to]?.push({ neighborId: edge.from, edge });
  }
})();

// ============================================================
// Binary Min-Heap Priority Queue  (O(log n) enqueue/dequeue)
// ============================================================

interface HeapNode {
  id: string;
  priority: number;
}

class MinHeap {
  private heap: HeapNode[] = [];

  get size() { return this.heap.length; }

  enqueue(id: string, priority: number) {
    this.heap.push({ id, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue(): HeapNode | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  private _bubbleUp(idx: number) {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.heap[idx].priority >= this.heap[parentIdx].priority) break;
      [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
      idx = parentIdx;
    }
  }

  private _sinkDown(idx: number) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

// ============================================================
// Route Memoization Cache
// ============================================================

const routeCache = new Map<string, Route[]>();

function cacheKey(origin: [number, number], destination: [number, number], options?: RouteOptions): string {
  // Round to 2 decimal places to avoid floating-point key mismatches
  const o = `${origin[0].toFixed(2)},${origin[1].toFixed(2)}`;
  const d = `${destination[0].toFixed(2)},${destination[1].toFixed(2)}`;
  const opts = options ? `|risk=${options.avoidHighRisk}|wx=${options.weatherPenalty}` : '';
  return `${o}->${d}${opts}`;
}

// ============================================================
// Main Entry Point
// ============================================================

export function calculateRoutes(
  origin: [number, number],
  destination: [number, number],
  options?: RouteOptions
): Route[] {
  // Check cache first
  const key = cacheKey(origin, destination, options);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const originPort = findNearestPort(origin);
  const destPort = findNearestPort(destination, new Set([originPort.name]));

  if (!originPort || !destPort) {
    const fallback = calculateDynamicRoutes(
      originPort || { coordinates: origin, name: 'Origin', region: 'Unknown', country: '' } as GlobalPort,
      destPort || { coordinates: destination, name: 'Dest', region: 'Unknown', country: '' } as GlobalPort,
    );
    routeCache.set(key, fallback);
    return fallback;
  }

  // Graph-based pathfinding (primary strategy)
  try {
    const graphRoutes = findGraphRoutes(originPort, destPort, options);
    if (graphRoutes && graphRoutes.length > 0) {
      routeCache.set(key, graphRoutes);
      return graphRoutes;
    }
  } catch (e) {
    console.warn('[RouteCalculator] Graph pathfinding failed, using direct fallback:', e);
  }

  // Fallback: direct great-circle route for disconnected graph regions
  const fallback = calculateDynamicRoutes(originPort, destPort);
  routeCache.set(key, fallback);
  return fallback;
}

// ============================================================
// Graph Pathfinding (A*)
// ============================================================

function findGraphRoutes(origin: GlobalPort, dest: GlobalPort, options?: RouteOptions): Route[] | null {
  const startNode = findNearestGraphNode(origin.coordinates);
  const endNode = findNearestGraphNode(dest.coordinates);
  if (!startNode || !endNode) return null;

  // A* heuristic: haversine distance to destination (in nm)
  const heuristic = (nodeId: string): number => {
    const node = MARITIME_NODES[nodeId];
    const target = MARITIME_NODES[endNode.id];
    return haversineNm(node.coordinates[1], node.coordinates[0], target.coordinates[1], target.coordinates[0]);
  };

  // "Fastest" path — minimise distance (with optional weather penalty)
  const fastestPath = runAStar(startNode.id, endNode.id, (edge) => {
    let cost = edge.distance;
    if (options?.weatherPenalty) {
      cost *= (1 + options.weatherPenalty * 0.1);
    }
    return cost;
  }, heuristic);

  // "Safest" path — heavily penalise high-risk edges
  const safePath = runAStar(startNode.id, endNode.id, (edge) => {
    let riskMultiplier = edge.risk;
    if (options?.avoidHighRisk && edge.risk > 1) {
      riskMultiplier = edge.risk * 10;
    }
    return edge.distance * (riskMultiplier > 1 ? riskMultiplier * 5 : 1);
  }, heuristic);

  // "Economical" path — balance distance + moderate risk penalty
  const econPath = runAStar(startNode.id, endNode.id, (edge) => {
    let cost = edge.distance;
    if (edge.risk > 1) {
      cost *= (1 + (edge.risk - 1) * 2); // moderate risk penalty
    }
    return cost;
  }, heuristic);

  const routes: Route[] = [];

  if (fastestPath) {
    routes.push(buildRouteObject(fastestPath, origin, dest, 'route-fastest', 'Fastest Route', '#3498db'));
  }

  if (safePath && !arraysEqual(fastestPath, safePath)) {
    routes.push(buildRouteObject(safePath, origin, dest, 'route-safe', 'Safest Route', '#2ecc71'));
  }

  if (econPath && !arraysEqual(econPath, fastestPath) && !arraysEqual(econPath, safePath)) {
    routes.push(buildRouteObject(econPath, origin, dest, 'route-economical', 'Economical Route', '#e8a547'));
  }

  return routes.length > 0 ? routes : null;
}

// ============================================================
// A* Implementation (uses MinHeap + precomputed adjacency)
// ============================================================

function runAStar(
  startId: string,
  endId: string,
  costFn: (e: SeaEdge) => number,
  heuristic: (id: string) => number
): string[] | null {
  const pq = new MinHeap();
  const gScore: Record<string, number> = {};
  const previous: Record<string, string | null> = {};

  for (const key in MARITIME_NODES) {
    gScore[key] = Infinity;
    previous[key] = null;
  }

  gScore[startId] = 0;
  pq.enqueue(startId, heuristic(startId));

  while (pq.size > 0) {
    const current = pq.dequeue();
    if (!current) break;
    if (current.id === endId) break;

    // Use precomputed adjacency list instead of scanning all edges
    const neighbors = ADJACENCY[current.id] || [];

    for (const { neighborId, edge } of neighbors) {
      const tentativeG = gScore[current.id] + costFn(edge);

      if (tentativeG < gScore[neighborId]) {
        previous[neighborId] = current.id;
        gScore[neighborId] = tentativeG;
        pq.enqueue(neighborId, tentativeG + heuristic(neighborId));
      }
    }
  }

  // Reconstruct path
  if (gScore[endId] === Infinity) return null;

  const path: string[] = [];
  let curr: string | null = endId;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }
  return path;
}

// ============================================================
// Route Object Builder (with endpoint deduplication)
// ============================================================

// Distance threshold (nm) — if origin/dest is closer than this to
// the first/last graph node we skip the extra endpoint to avoid spikes.
const DEDUP_THRESHOLD_NM = 30;

function buildRouteObject(
  nodeIds: string[],
  origin: GlobalPort,
  dest: GlobalPort,
  id: string,
  name: string,
  color: string
): Route {
  const waypoints: [number, number][] = [];
  const waypointNames: string[] = [];

  // Conditionally add origin (skip if very close to first graph node)
  const firstNode = MARITIME_NODES[nodeIds[0]];
  const distToFirst = haversineNm(
    origin.coordinates[1], origin.coordinates[0],
    firstNode.coordinates[1], firstNode.coordinates[0]
  );
  if (distToFirst > DEDUP_THRESHOLD_NM) {
    waypoints.push(origin.coordinates);
    waypointNames.push(origin.name);
  }

  // Add the first graph node
  waypoints.push(firstNode.coordinates);
  waypointNames.push(firstNode.name);

  // Stitch geometry through each edge
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const uId = nodeIds[i];
    const vId = nodeIds[i + 1];
    const vNode = MARITIME_NODES[vId];

    // Find edge via adjacency (fast)
    const adj = ADJACENCY[uId]?.find(a => a.neighborId === vId);
    const edge = adj?.edge;

    if (edge && edge.geometry) {
      let segmentPoints = edge.geometry;
      // Reverse geometry if edge is defined in opposite direction
      if (edge.from === vId && edge.to === uId) {
        segmentPoints = [...edge.geometry].reverse();
      }
      // Append intermediate + endpoint, skipping first (already added as uNode)
      segmentPoints.slice(1).forEach(pt => waypoints.push(pt));
    } else {
      waypoints.push(vNode.coordinates);
    }
    waypointNames.push(vNode.name);
  }

  // Conditionally add destination (skip if very close to last graph node)
  const lastNode = MARITIME_NODES[nodeIds[nodeIds.length - 1]];
  const distToLast = haversineNm(
    dest.coordinates[1], dest.coordinates[0],
    lastNode.coordinates[1], lastNode.coordinates[0]
  );
  if (distToLast > DEDUP_THRESHOLD_NM) {
    waypoints.push(dest.coordinates);
    waypointNames.push(dest.name);
  }

  const dist = calculateTotalDistance(waypoints);

  // Risk level heuristic based on nodes traversed
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (nodeIds.includes('bab_el_mandeb') || nodeIds.includes('suez_s')) riskLevel = 'high';
  else if (nodeIds.includes('malacca_exit')) riskLevel = 'medium';

  return {
    id,
    name,
    riskLevel,
    color,
    strokeWidth: 3,
    waypoints,
    waypointNames,
    distance: dist,
    estimatedTime: Math.round((dist / 20 / 24) * 10) / 10, // days @ ~20kts, 1 decimal
    description: `${name} via ${nodeIds.length} waypoints`
  };
}

// ============================================================
// Dynamic Fallback (straight-line for disconnected graphs)
// ============================================================

function calculateDynamicRoutes(originPort: GlobalPort, destPort: GlobalPort): Route[] {
  const waypoints: [number, number][] = [originPort.coordinates, destPort.coordinates];
  const dist = calculateTotalDistance(waypoints);
  return [{
    id: 'dyn-direct',
    name: 'Direct Route',
    riskLevel: 'medium',
    color: '#95a5a6',
    strokeWidth: 1,
    waypoints,
    waypointNames: [originPort.name, destPort.name],
    distance: dist,
    estimatedTime: Math.round((dist / 15 / 24) * 10) / 10, // days @ ~15kts conservative
    description: 'Direct calculated path'
  }];
}

// ============================================================
// Helpers
// ============================================================

function findNearestPort(coord: [number, number], excludeNames: Set<string> = new Set()): GlobalPort {
  let nearest = MAJOR_PORTS[0];
  let minDistance = Infinity;
  for (const port of MAJOR_PORTS) {
    if (excludeNames.has(port.name)) continue;
    const dist = haversineNm(coord[1], coord[0], port.coordinates[1], port.coordinates[0]);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = port;
    }
  }
  return nearest;
}

function findNearestGraphNode(coords: [number, number]): SeaNode | null {
  let nearest: SeaNode | null = null;
  let minDist = Infinity;

  for (const key in MARITIME_NODES) {
    const node = MARITIME_NODES[key];
    const d = haversineNm(coords[1], coords[0], node.coordinates[1], node.coordinates[0]);
    if (d < minDist) {
      minDist = d;
      nearest = node;
    }
  }
  if (minDist > 3000) {
    console.warn(`[RouteCalculator] Nearest sea node for ${coords} is far: ${minDist.toFixed(0)} nm`);
  }
  return nearest;
}

function calculateTotalDistance(waypoints: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lng1, lat1] = waypoints[i];
    const [lng2, lat2] = waypoints[i + 1];
    total += haversineNm(lat1, lng1, lat2, lng2);
  }
  return Math.round(total);
}

/**
 * Haversine distance in **nautical miles**.
 * Using Earth mean radius of 3440.065 nm.
 */
function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function arraysEqual(a: string[] | null, b: string[] | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
