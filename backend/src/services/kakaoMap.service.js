const config = require('../config/env');

const LOCAL_BASE = 'https://dapi.kakao.com/v2/local';
const NAVI_BASE = 'https://apis-navi.kakaomobility.com/v1';

function hasApiKey() {
  return !!config.kakaoRestApiKey;
}

function authHeaders() {
  return { Authorization: `KakaoAK ${config.kakaoRestApiKey}` };
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.max(1, Math.ceil(seconds / 60));
  if (mins < 60) return `약 ${mins}분`;
  const hours = Math.floor(mins / 60);
  const remain = mins % 60;
  return remain ? `약 ${hours}시간 ${remain}분` : `약 ${hours}시간`;
}

function toCoord(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  return `${point.lng},${point.lat}`;
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function mockPoint(label) {
  const seed = [...String(label || 'catchup')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return {
    lat: 37.5 + (seed % 100) / 10000,
    lng: 127.0 + (seed % 100) / 10000,
    address: label || '모의 주소',
    name: label || '모의 장소',
  };
}

function estimatePath(origin, destination, points = 16) {
  const path = [];
  for (let i = 0; i <= points; i += 1) {
    const t = i / points;
    path.push({
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lng: origin.lng + (destination.lng - origin.lng) * t,
    });
  }
  return path;
}

function estimateRoute(origin, destination, mode) {
  const straight = haversineMeters(origin, destination);

  if (mode === 'walk') {
    const distance = Math.round(straight * 1.2);
    const duration = Math.max(60, Math.round((distance / 1000 / 4.5) * 3600));
    return { distance, duration, provider: 'estimate' };
  }

  if (mode === 'transit') {
    const distance = Math.round(straight * 1.4);
    const duration = Math.max(300, Math.round((distance / 1000 / 22) * 3600));
    return { distance, duration, provider: 'estimate' };
  }

  const distance = Math.round(straight * 1.35);
  const duration = Math.max(300, Math.round((distance / 1000 / 30) * 3600));
  return { distance, duration, provider: 'estimate' };
}

function dedupePath(path) {
  if (path.length < 2) return path;
  const result = [path[0]];
  for (let i = 1; i < path.length; i += 1) {
    const prev = result[result.length - 1];
    const cur = path[i];
    if (Math.abs(prev.lat - cur.lat) > 0.000001 || Math.abs(prev.lng - cur.lng) > 0.000001) {
      result.push(cur);
    }
  }
  return result;
}

function extractPolyline(route) {
  const path = [];

  for (const section of route?.sections || []) {
    for (const road of section.roads || []) {
      const vertexes = road.vertexes || [];
      for (let i = 0; i < vertexes.length; i += 2) {
        const lng = Number(vertexes[i]);
        const lat = Number(vertexes[i + 1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          path.push({ lat, lng });
        }
      }
    }

    for (const guide of section.guides || []) {
      const lng = Number(guide.x);
      const lat = Number(guide.y);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        path.push({ lat, lng });
      }
    }
  }

  return dedupePath(path);
}

async function reverseGeocode(lat, lng) {
  if (!hasApiKey() || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL(`${LOCAL_BASE}/geo/coord2address.json`);
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) return null;

  const data = await response.json();
  const doc = data.documents?.[0];
  if (!doc) return null;

  return doc.road_address?.address_name || doc.address?.address_name || null;
}

async function findNearbyCategory(categoryCode, lat, lng, radius = 1500) {
  if (!hasApiKey()) return [];

  const url = new URL(`${LOCAL_BASE}/search/category.json`);
  url.searchParams.set('category_group_code', categoryCode);
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', String(radius));
  url.searchParams.set('size', '3');

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) return [];

  const data = await response.json();
  return (data.documents || []).map((doc) => ({
    name: doc.place_name,
    distance: Number(doc.distance) || 0,
    lat: Number(doc.y),
    lng: Number(doc.x),
  }));
}

async function findNearbyBusStop(lat, lng) {
  if (!hasApiKey()) return [];

  const url = new URL(`${LOCAL_BASE}/search/keyword.json`);
  url.searchParams.set('query', '버스정류장');
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', '1200');
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', '2');

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) return [];

  const data = await response.json();
  return (data.documents || []).map((doc) => ({
    name: doc.place_name,
    distance: Number(doc.distance) || 0,
  }));
}

async function buildTransitGuides(origin, destination) {
  const [originSubways, destSubways, busStops] = await Promise.all([
    findNearbyCategory('SW8', origin.lat, origin.lng),
    findNearbyCategory('SW8', destination.lat, destination.lng),
    findNearbyBusStop(origin.lat, origin.lng),
  ]);

  const startSubway = originSubways[0]?.name;
  const endSubway = destSubways[0]?.name;
  const startBus = busStops[0]?.name;
  const destName = destination.name || destination.address;

  const guides = [];

  if (startSubway) {
    guides.push({
      instruction: `현재 위치에서 ${startSubway}까지 도보 이동`,
      type: 'walk',
    });
    guides.push({
      instruction: `${startSubway}에서 승차`,
      type: 'subway',
    });
    guides.push({
      instruction: `${endSubway || destName} 방향 열차·버스 이용`,
      type: 'transit',
    });
    if (endSubway) {
      guides.push({
        instruction: `${endSubway}에서 하차`,
        type: 'subway',
      });
    }
    guides.push({
      instruction: `${destName}까지 도보 이동`,
      type: 'walk',
    });
  } else if (startBus) {
    guides.push({
      instruction: `현재 위치에서 ${startBus}까지 도보 이동`,
      type: 'walk',
    });
    guides.push({
      instruction: `${startBus}에서 승차`,
      type: 'bus',
    });
    guides.push({
      instruction: `${destName} 방향 버스 이용`,
      type: 'transit',
    });
    guides.push({
      instruction: `${destName} 근처에서 하차 후 도보`,
      type: 'walk',
    });
  } else {
    guides.push(
      { instruction: '가까운 지하철역·버스정류장으로 도보 이동', type: 'walk' },
      { instruction: `${destName} 방향 대중교통 이용`, type: 'transit' },
      { instruction: '목적지 근처에서 하차 후 도보', type: 'walk' }
    );
  }

  return guides;
}

async function buildTransitLegs(origin, destination) {
  const [originSubways, destSubways, busStops] = await Promise.all([
    findNearbyCategory('SW8', origin.lat, origin.lng),
    findNearbyCategory('SW8', destination.lat, destination.lng),
    findNearbyBusStop(origin.lat, origin.lng),
  ]);

  const startSubway = originSubways[0];
  const endSubway = destSubways[0];
  const startBus = busStops[0];
  const destName = destination.placeName || destination.name || destination.address;
  const legs = [];

  if (startSubway) {
    legs.push({
      type: 'walk',
      title: '도보',
      detail: `현재 위치 → ${startSubway.name}${startSubway.distance ? ` (${startSubway.distance}m)` : ''}`,
    });
    legs.push({
      type: 'subway',
      title: startSubway.name,
      detail: '지하철 승차',
      badge: '지하철',
    });
    if (endSubway && endSubway.name !== startSubway.name) {
      legs.push({
        type: 'transit',
        title: '이동',
        detail: `${endSubway.name} 방향 열차 이용`,
        badge: '열차',
      });
      legs.push({
        type: 'subway',
        title: endSubway.name,
        detail: '하차',
        badge: '하차',
      });
    }
    legs.push({
      type: 'walk',
      title: '도보',
      detail: `${destName}까지 이동`,
    });
    return legs;
  }

  if (startBus) {
    legs.push({
      type: 'walk',
      title: '도보',
      detail: `현재 위치 → ${startBus.name}${startBus.distance ? ` (${startBus.distance}m)` : ''}`,
    });
    legs.push({
      type: 'bus',
      title: startBus.name,
      detail: `${destName} 방향 버스 승차`,
      badge: '버스',
    });
    legs.push({
      type: 'walk',
      title: '도보',
      detail: '하차 후 목적지까지 도보',
    });
    return legs;
  }

  return [
    { type: 'walk', title: '도보', detail: '가까운 역·정류장까지 이동' },
    { type: 'transit', title: '대중교통', detail: `${destName} 방향 이용`, badge: '추천' },
    { type: 'walk', title: '도보', detail: '목적지까지 도보' },
  ];
}

async function enrichOrigin(origin) {
  const isCurrentLocation =
    origin.address === '현재 위치' ||
    origin.name === '현재 위치' ||
    !origin.address;

  if (!isCurrentLocation) return origin;

  const address = await reverseGeocode(origin.lat, origin.lng);
  return {
    ...origin,
    name: '현재 위치',
    address: address || '현재 위치',
    shortAddress: address ? address.split(' ').slice(-2).join(' ') : 'GPS 위치',
  };
}
function extractGuides(route, mode, transitGuides = null) {
  const guides = [];

  for (const section of route?.sections || []) {
    for (const guide of section.guides || []) {
      const text = guide.guidance || guide.name || guide.road_name || '';
      if (!text) continue;
      guides.push({
        instruction: text.replace(/<[^>]*>/g, ''),
        distance: guide.distance || 0,
        duration: guide.duration || 0,
        type: mode,
      });
    }
  }

  if (guides.length) return guides.slice(0, 12);

  if (mode === 'transit' && transitGuides?.length) {
    return transitGuides;
  }

  if (mode === 'transit') {
    return [
      { instruction: '가까운 지하철역·버스정류장으로 도보 이동', type: 'walk' },
      { instruction: '목적지 방향 대중교통 이용', type: 'transit' },
      { instruction: '목적지 근처에서 하차 후 도보', type: 'walk' },
    ];
  }

  if (mode === 'walk') {
    return [{ instruction: '보행자 도로와 횡단보도를 이용해 이동하세요', type: 'walk' }];
  }

  return [{ instruction: '추천 경로를 따라 이동하세요', type: 'car' }];
}

function buildModeResult(
  routeData,
  origin,
  destination,
  mode,
  {
    transitGuides = null,
    transitLegs = null,
    transitAlternatives = null,
    fallbackPath = null,
    summaryOverride = null,
  } = {}
) {
  let path = routeData.raw ? extractPolyline(routeData.raw) : [];
  if (path.length < 2 && fallbackPath?.length > 1) {
    path = fallbackPath;
  }
  if (path.length < 2) {
    path = estimatePath(origin, destination);
  }

  const guides = extractGuides(routeData.raw, mode, transitGuides);
  const walkSteps =
    mode === 'walk' && routeData.distance
      ? `${Math.round(routeData.distance / 0.7).toLocaleString()}걸음 예상`
      : null;

  return {
    label: mode === 'transit' ? '대중교통' : mode === 'walk' ? '도보' : '자동차',
    distance: routeData.distance,
    duration: routeData.duration,
    distanceText: formatDistance(routeData.distance),
    durationText: formatDuration(routeData.duration),
    provider: routeData.provider,
    path,
    guides,
    transitLegs: mode === 'transit' ? transitLegs : undefined,
    transitAlternatives: mode === 'transit' ? transitAlternatives : undefined,
    paymentText:
      mode === 'transit' && routeData.payment
        ? `${Number(routeData.payment).toLocaleString()}원`
        : undefined,
    walkSteps,
    summary:
      summaryOverride ||
      (mode === 'transit'
        ? '역·버스 기준 추천 경로'
        : mode === 'walk'
          ? walkSteps
          : '최단 시간 추천'),
  };
}

async function localSearch(path, query) {
  const url = new URL(`${LOCAL_BASE}${path}`);
  url.searchParams.set('query', query);
  url.searchParams.set('size', '1');

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`카카오 주소 검색 실패: ${detail}`);
  }

  const data = await response.json();
  const doc = data.documents?.[0];
  if (!doc) return null;

  return {
    lat: Number(doc.y),
    lng: Number(doc.x),
    address: doc.road_address_name || doc.address_name || query,
    name: doc.place_name || doc.address_name || query,
  };
}

async function geocode(query) {
  if (!query?.trim()) {
    throw new Error('주소 또는 장소명이 필요합니다');
  }

  if (!hasApiKey()) {
    return mockPoint(query.trim());
  }

  const normalized = query.trim();
  const byAddress = await localSearch('/search/address.json', normalized);
  if (byAddress) return byAddress;

  const byKeyword = await localSearch('/search/keyword.json', normalized);
  if (byKeyword) return byKeyword;

  throw new Error('주소나 장소를 찾을 수 없습니다');
}

async function resolvePoint({ address, name, lat, lng }) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      lat,
      lng,
      address: address || name || '선택한 위치',
      name: name || address || '선택한 위치',
    };
  }

  const query = [address, name].filter(Boolean).join(' ').trim();
  return geocode(query);
}

const NAVI_ENDPOINTS = {
  car: '/directions',
  walk: '/directions/walking',
};

async function fetchNaviRoute(mode, origin, destination) {
  if (!hasApiKey()) {
    const estimate = estimateRoute(origin, destination, mode);
    return { ...estimate, provider: 'mock', raw: null };
  }

  const endpoint = NAVI_ENDPOINTS[mode];
  if (!endpoint) {
    const estimate = estimateRoute(origin, destination, mode);
    return { ...estimate, provider: 'estimate', raw: null };
  }

  const body = {
    origin: toCoord(origin),
    destination: toCoord(destination),
    summary: false,
  };
  if (mode === 'car') {
    body.priority = 'RECOMMEND';
  }

  const response = await fetch(`${NAVI_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const estimate = estimateRoute(origin, destination, mode);
    return { ...estimate, provider: 'estimate', raw: null };
  }

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route?.summary) {
    const estimate = estimateRoute(origin, destination, mode);
    return { ...estimate, provider: 'estimate', raw: null };
  }

  return {
    distance: route.summary.distance,
    duration: route.summary.duration,
    provider: 'kakao',
    raw: route,
  };
}

async function getRouteInfo({ origin, destination }) {
  const resolvedOrigin = await enrichOrigin(await resolvePoint(origin));
  const resolvedDestination = await resolvePoint(destination);
  if (destination?.name) {
    resolvedDestination.placeName = destination.name;
  }

  const [transitGuides, transitLegs, walkRoute] = await Promise.all([
    buildTransitGuides(resolvedOrigin, resolvedDestination),
    buildTransitLegs(resolvedOrigin, resolvedDestination),
    fetchNaviRoute('walk', resolvedOrigin, resolvedDestination),
  ]);

  const walkPath = walkRoute.raw ? extractPolyline(walkRoute.raw) : null;
  const carRoute = await fetchNaviRoute('car', resolvedOrigin, resolvedDestination);

  const modes = {
    car: buildModeResult(carRoute, resolvedOrigin, resolvedDestination, 'car'),
    walk: buildModeResult(walkRoute, resolvedOrigin, resolvedDestination, 'walk'),
    transit: buildModeResult(
      { ...estimateRoute(resolvedOrigin, resolvedDestination, 'transit'), raw: null },
      resolvedOrigin,
      resolvedDestination,
      'transit',
      {
        transitGuides,
        transitLegs,
        fallbackPath: walkPath,
        summaryOverride: '근처 역·정류장 기준 추천',
      }
    ),
  };

  return {
    origin: resolvedOrigin,
    destination: resolvedDestination,
    modes,
    car: modes.car,
    walk: modes.walk,
    transit: modes.transit,
  };
}

module.exports = {
  geocode,
  getRouteInfo,
  formatDistance,
  formatDuration,
};
