type LonLat = [number, number];

const EARTH_RADIUS_NM = 3440.065;
const DEFAULT_MAX_SEGMENT_NM = 45;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineNm(start: LonLat, end: LonLat): number {
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_NM * c;
}

function normalizeLongitude(lon: number): number {
  const wrapped = ((lon + 180) % 360 + 360) % 360;
  return wrapped - 180;
}

function shortestDeltaLongitude(startLon: number, endLon: number): number {
  let delta = endLon - startLon;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

export function densifyPath(path: LonLat[], maxSegmentNm = DEFAULT_MAX_SEGMENT_NM): LonLat[] {
  if (!Array.isArray(path) || path.length < 2) return path;

  const densified: LonLat[] = [path[0]];

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    const segmentDistanceNm = haversineNm(start, end);
    const steps = Math.max(1, Math.ceil(segmentDistanceNm / maxSegmentNm));
    const deltaLon = shortestDeltaLongitude(start[0], end[0]);
    const deltaLat = end[1] - start[1];

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const interpolatedLon = normalizeLongitude(start[0] + deltaLon * t);
      const interpolatedLat = start[1] + deltaLat * t;
      densified.push([interpolatedLon, interpolatedLat]);
    }
  }

  return densified;
}

export function densifyPathMap(
  pathMap: Record<string, LonLat[]>,
  maxSegmentNm = DEFAULT_MAX_SEGMENT_NM
): Record<string, LonLat[]> {
  const output: Record<string, LonLat[]> = {};
  Object.entries(pathMap || {}).forEach(([routeId, path]) => {
    output[routeId] = densifyPath(path, maxSegmentNm);
  });
  return output;
}
