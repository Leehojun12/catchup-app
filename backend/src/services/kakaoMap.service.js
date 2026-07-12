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

async function getDrivingRoute(origin, destination) {
  if (!hasApiKey()) {
    const distance = Math.round(haversineMeters(origin, destination) * 1.35);
    const duration = Math.max(300, Math.round((distance / 1000 / 30) * 3600));
    return { distance, duration, provider: 'mock' };
  }

  const response = await fetch(`${NAVI_BASE}/directions`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin: toCoord(origin),
      destination: toCoord(destination),
      priority: 'RECOMMEND',
    }),
  });

  if (!response.ok) {
    const distance = Math.round(haversineMeters(origin, destination) * 1.35);
    const duration = Math.max(300, Math.round((distance / 1000 / 30) * 3600));
    return { distance, duration, provider: 'estimate' };
  }

  const data = await response.json();
  const summary = data.routes?.[0]?.summary;
  if (!summary) {
    const distance = Math.round(haversineMeters(origin, destination) * 1.35);
    const duration = Math.max(300, Math.round((distance / 1000 / 30) * 3600));
    return { distance, duration, provider: 'estimate' };
  }

  return {
    distance: summary.distance,
    duration: summary.duration,
    provider: 'kakao',
  };
}

async function getRouteInfo({ origin, destination }) {
  const resolvedOrigin = await resolvePoint(origin);
  const resolvedDestination = await resolvePoint(destination);
  const route = await getDrivingRoute(resolvedOrigin, resolvedDestination);

  return {
    origin: resolvedOrigin,
    destination: resolvedDestination,
    distance: route.distance,
    duration: route.duration,
    distanceText: formatDistance(route.distance),
    durationText: formatDuration(route.duration),
    provider: route.provider,
  };
}

module.exports = {
  geocode,
  getRouteInfo,
  formatDistance,
  formatDuration,
};
