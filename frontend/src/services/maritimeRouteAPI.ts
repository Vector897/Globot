/**
 * Maritime Route API Service
 * 提供从外部API获取真实航运路线的功能
 * 
 * 可用的API选项：
 * 1. OpenRouteService (免费，但需要API密钥)
 * 2. GraphHopper (免费层有限制)
 * 3. 自定义后端服务（推荐：使用真实AIS数据）
 */

export interface RouteAPIResponse {
  coordinates: [number, number][];
  distance: number; // 海里
  duration?: number; // 小时
}

/**
 * 使用OpenRouteService获取航运路线
 * 注意：需要API密钥，且OpenRouteService主要针对陆路交通
 * 对于海运，建议使用专门的航运API
 */
export async function getRouteFromOpenRouteService(
  start: [number, number],
  end: [number, number],
  apiKey?: string
): Promise<RouteAPIResponse | null> {
  if (!apiKey) {
    console.warn('OpenRouteService API key not provided');
    return null;
  }

  try {
    // OpenRouteService的路线API
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 提取坐标点
    const coordinates: [number, number][] = data.features[0]?.geometry?.coordinates?.map(
      (coord: number[]) => [coord[0], coord[1]]
    ) || [];

    return {
      coordinates,
      distance: data.features[0]?.properties?.segments?.[0]?.distance || 0,
      duration: data.features[0]?.properties?.segments?.[0]?.duration || 0
    };
  } catch (error) {
    console.error('Error fetching route from OpenRouteService:', error);
    return null;
  }
}

/**
 * 使用GraphHopper获取路线
 * 注意：GraphHopper也主要针对陆路，海运需要特殊配置
 */
export async function getRouteFromGraphHopper(
  start: [number, number],
  end: [number, number],
  apiKey?: string
): Promise<RouteAPIResponse | null> {
  if (!apiKey) {
    console.warn('GraphHopper API key not provided');
    return null;
  }

  try {
    const url = `https://graphhopper.com/api/1/route?point=${start[1]},${start[0]}&point=${end[1]},${end[0]}&vehicle=car&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    const coordinates: [number, number][] = data.paths[0]?.points?.coordinates?.map(
      (coord: number[]) => [coord[0], coord[1]]
    ) || [];

    return {
      coordinates,
      distance: data.paths[0]?.distance || 0,
      duration: data.paths[0]?.time || 0
    };
  } catch (error) {
    console.error('Error fetching route from GraphHopper:', error);
    return null;
  }
}

/**
 * 从后端API获取真实航运路线
 * 推荐：在后端集成MarineTraffic或类似服务
 */
export async function getMaritimeRouteFromBackend(
  start: [number, number],
  end: [number, number]
): Promise<RouteAPIResponse | null> {
  try {
    const response = await fetch('/api/v2/maritime-route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin: { longitude: start[0], latitude: start[1] },
        destination: { longitude: end[0], latitude: end[1] }
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      coordinates: data.waypoints || [],
      distance: data.distance || 0,
      duration: data.duration || 0
    };
  } catch (error) {
    console.error('Error fetching maritime route from backend:', error);
    return null;
  }
}

/**
 * 计算大圆航线（Great Circle Route）
 * 这是两点间最短的球面距离，但不考虑避开陆地
 */
export function calculateGreatCircleRoute(
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] {
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;
  
  const coordinates: [number, number][] = [[lon1, lat1]];
  
  // 转换为弧度
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;
  
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat2Rad - lat1Rad) / 2) ** 2 +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin((lon2Rad - lon1Rad) / 2) ** 2
    )
  );
  
  // 生成中间点
  for (let i = 1; i < numPoints; i++) {
    const f = i / numPoints;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(lat1Rad) * Math.cos(lon1Rad) + b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y = a * Math.cos(lat1Rad) * Math.sin(lon1Rad) + b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);
    
    const lat = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)) * 180 / Math.PI;
    const lon = Math.atan2(y, x) * 180 / Math.PI;
    
    coordinates.push([lon, lat]);
  }
  
  coordinates.push([lon2, lat2]);
  return coordinates;
}

/**
 * 推荐的航运API服务：
 * 
 * 1. MarineTraffic API (https://www.marinetraffic.com/en/ais-api-services)
 *    - 提供真实AIS船舶数据
 *    - 可以获取历史航线
 *    - 需要付费订阅
 * 
 * 2. VesselFinder API
 *    - 类似MarineTraffic
 *    - 提供船舶追踪和航线数据
 * 
 * 3. 自定义解决方案：
 *    - 在后端使用OpenStreetMap的海洋数据
 *    - 使用路径规划算法（如A*）在海洋网格中寻找路径
 *    - 结合真实AIS数据优化航线
 */

