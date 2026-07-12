const config = require('../config/env');

const ODSAY_BASE = 'https://api.odsay.com/v1/api';

function hasApiKey() {
  return !!config.odsayApiKey;
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

function formatLegDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain ? `${hours}시간 ${remain}분` : `${hours}시간`;
}

function normalizeLanes(lane) {
  if (!lane) return [];
  return Array.isArray(lane) ? lane : [lane];
}

function parseSubPathLeg(subPath) {
  const duration = formatLegDuration(subPath.sectionTime);

  if (subPath.trafficType === 3) {
    const distanceText = subPath.distance ? `${subPath.distance}m` : '';
    return {
      type: 'walk',
      title: '도보',
      detail: [distanceText, duration].filter(Boolean).join(' · ') || '이동',
      duration,
      distance: subPath.distance || 0,
    };
  }

  if (subPath.trafficType === 1) {
    const lineName = normalizeLanes(subPath.lane)[0]?.name || '지하철';
    const stationCount = subPath.stationCount || 0;
    const stations = subPath.passStopList?.stations || [];
    const via =
      stations.length > 2
        ? `${stations
            .slice(1, -1)
            .map((s) => s.stationName)
            .slice(0, 2)
            .join(', ')}${stationCount > 2 ? ` 외 ${stationCount - 1}개 역` : ''}`
        : stationCount > 0
          ? `${stationCount}개 역`
          : '';

    return {
      type: 'subway',
      title: `${subPath.startName} → ${subPath.endName}`,
      detail: [lineName, subPath.way ? `${subPath.way} 방면` : '', via, duration]
        .filter(Boolean)
        .join(' · '),
      badge: lineName.includes('호선') ? lineName.replace('수도권 ', '') : '지하철',
      line: lineName,
      duration,
      startStation: subPath.startName,
      endStation: subPath.endName,
      stationCount,
      stations: stations.map((s) => s.stationName),
    };
  }

  if (subPath.trafficType === 2) {
    const lanes = normalizeLanes(subPath.lane);
    const busNos = lanes.map((l) => l.busNo || l.busNoF || l.name).filter(Boolean);
    const busLabel = busNos.length ? `${busNos.join(', ')}번` : '버스';
    const stopCount = subPath.stationCount || 0;

    return {
      type: 'bus',
      title: busLabel,
      detail: [`${subPath.startName} → ${subPath.endName}`, stopCount ? `${stopCount}개 정류장` : '', duration]
        .filter(Boolean)
        .join(' · '),
      badge: '버스',
      busNumbers: busNos,
      duration,
      startStation: subPath.startName,
      endStation: subPath.endName,
    };
  }

  return null;
}

function buildPathSummary(info) {
  const parts = [];
  if (info.subwayTransitCount) parts.push(`지하철 ${info.subwayTransitCount}회`);
  if (info.busTransitCount) parts.push(`버스 ${info.busTransitCount}회`);
  if (info.totalWalk) parts.push(`도보 ${info.totalWalk}m`);
  return parts.join(' · ') || '추천 경로';
}

function parseTransitPath(path) {
  const info = path.info || {};
  const transitLegs = (path.subPath || []).map(parseSubPathLeg).filter(Boolean);
  const transitGuides = transitLegs.map((leg) => ({
    instruction: `${leg.title} — ${leg.detail}`,
    type: leg.type,
  }));

  return {
    pathType: path.pathType,
    distance: info.totalDistance || 0,
    duration: Math.max(60, (info.totalTime || 1) * 60),
    durationMinutes: info.totalTime || 0,
    payment: info.payment || 0,
    subwayTransitCount: info.subwayTransitCount || 0,
    busTransitCount: info.busTransitCount || 0,
    totalWalk: info.totalWalk || 0,
    firstStartStation: info.firstStartStation || '',
    lastEndStation: info.lastEndStation || '',
    mapObj: info.mapObj || '',
    subPath: path.subPath || [],
    transitLegs,
    transitGuides,
    summary: buildPathSummary(info),
    label: `${info.totalTime || 0}분 · ${buildPathSummary(info)}`,
  };
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

function extractPathFromSubPath(subPaths = []) {
  const path = [];

  for (const subPath of subPaths) {
    const stations = subPath.passStopList?.stations || [];
    if (stations.length) {
      for (const station of stations) {
        if (Number.isFinite(station.y) && Number.isFinite(station.x)) {
          path.push({ lat: station.y, lng: station.x });
        }
      }
      continue;
    }

    if (Number.isFinite(subPath.startY) && Number.isFinite(subPath.startX)) {
      path.push({ lat: subPath.startY, lng: subPath.startX });
    }
    if (Number.isFinite(subPath.endY) && Number.isFinite(subPath.endX)) {
      path.push({ lat: subPath.endY, lng: subPath.endX });
    }
  }

  return dedupePath(path);
}

async function loadLanePolyline(mapObj) {
  if (!hasApiKey() || !mapObj) return null;

  const url = new URL(`${ODSAY_BASE}/loadLane`);
  url.searchParams.set('apiKey', config.odsayApiKey);
  url.searchParams.set('mapObject', `0:0@${mapObj}`);
  url.searchParams.set('lang', '0');

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.error?.length) return null;

  const path = [];
  for (const lane of data.result?.lane || []) {
    for (const section of lane.section || []) {
      for (const pos of section.graphPos || []) {
        if (Number.isFinite(pos.y) && Number.isFinite(pos.x)) {
          path.push({ lat: pos.y, lng: pos.x });
        }
      }
    }
  }

  const deduped = dedupePath(path);
  return deduped.length > 1 ? deduped : null;
}

async function searchTransitPaths(origin, destination, opt = 0) {
  if (!hasApiKey()) {
    throw new Error('ODSAY_API_KEY가 설정되지 않았습니다');
  }

  const url = new URL(`${ODSAY_BASE}/searchPubTransPathT`);
  url.searchParams.set('apiKey', config.odsayApiKey);
  url.searchParams.set('SX', String(origin.lng));
  url.searchParams.set('SY', String(origin.lat));
  url.searchParams.set('EX', String(destination.lng));
  url.searchParams.set('EY', String(destination.lat));
  url.searchParams.set('OPT', String(opt));
  url.searchParams.set('SearchType', '0');
  url.searchParams.set('SearchPathType', '0');
  url.searchParams.set('lang', '0');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('ODsay 대중교통 API 호출에 실패했습니다');
  }

  const data = await response.json();
  if (data.error?.length) {
    throw new Error(data.error[0]?.message || 'ODsay API 오류');
  }

  const paths = data.result?.path || [];
  if (!paths.length) return null;

  return paths.slice(0, 3).map(parseTransitPath);
}

async function buildTransitAlternatives(alternatives = []) {
  return Promise.all(
    alternatives.map(async (alt, index) => {
      const lanePath = await loadLanePolyline(alt.mapObj);
      const fallbackPath = extractPathFromSubPath(alt.subPath);
      const path = lanePath?.length > 1 ? lanePath : fallbackPath;

      return {
        id: `alt-${index + 1}`,
        label: alt.label,
        durationText: formatDuration(alt.duration),
        distanceText: formatDistance(alt.distance),
        paymentText: alt.payment ? `${alt.payment.toLocaleString()}원` : null,
        summary: alt.summary,
        transitLegs: alt.transitLegs,
        path,
        pathType: alt.pathType,
      };
    })
  );
}

async function buildTransitRouteMode(origin, destination, walkFallbackPath = null) {
  const paths = await searchTransitPaths(origin, destination);
  if (!paths?.length) return null;

  const best = paths[0];
  const lanePath = await loadLanePolyline(best.mapObj);
  const stationPath = extractPathFromSubPath(best.subPath);
  const path =
    lanePath?.length > 1
      ? lanePath
      : stationPath?.length > 1
        ? stationPath
        : walkFallbackPath?.length > 1
          ? walkFallbackPath
          : null;

  const transitAlternatives = await buildTransitAlternatives(paths.slice(1));

  return {
    label: '대중교통',
    distance: best.distance,
    duration: best.duration,
    distanceText: formatDistance(best.distance),
    durationText: formatDuration(best.duration),
    provider: 'odsay',
    path,
    guides: best.transitGuides,
    transitLegs: best.transitLegs,
    transitAlternatives,
    paymentText: best.payment ? `${best.payment.toLocaleString()}원` : undefined,
    summary: best.summary,
  };
}

module.exports = {
  hasApiKey,
  buildTransitRouteMode,
};
