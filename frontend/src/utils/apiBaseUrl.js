import Constants from 'expo-constants';

const API_PORT = 3000;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function extractHost(uri) {
  if (!uri || typeof uri !== 'string') return null;
  const cleaned = uri.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const hostname = cleaned.split(':')[0]?.split('/')[0];
  if (!hostname || LOCAL_HOSTS.has(hostname)) {
    return null;
  }
  return hostname;
}

function getMetroHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoConfig?.extra?.expoGo?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.manifest?.debuggerHost,
    Constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host) return host;
  }
  return null;
}

function isBareRenderDomain(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'onrender.com' || hostname === 'www.onrender.com';
  } catch {
    return false;
  }
}

/** Normalize EXPO_PUBLIC_API_URL → always ends with /api */
export function normalizeApiBaseUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let url = raw.trim().replace(/\/+$/, '');
  if (!url) return null;

  if (isBareRenderDomain(url)) {
    console.warn(
      '[API] EXPO_PUBLIC_API_URL이 Render 홈페이지(onrender.com)로 설정되어 있습니다.\n' +
        '      Render 대시보드의 서비스 URL을 사용하세요. 예: https://catchup-api.onrender.com/api'
    );
    return null;
  }

  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
}

function getConfiguredRemoteUrl() {
  const fromEnv = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (fromEnv) return fromEnv;

  const fromExtra = normalizeApiBaseUrl(Constants.expoConfig?.extra?.apiUrl);
  if (fromExtra) return fromExtra;

  return null;
}

export function getMetroApiBaseUrl() {
  const metroHost = getMetroHost();
  if (metroHost) {
    return `http://${metroHost}:${API_PORT}/api`;
  }
  return `http://localhost:${API_PORT}/api`;
}

export function getTransitProxyBaseUrl() {
  const explicit = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_TRANSIT_PROXY_URL);
  if (explicit) return explicit;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return getMetroApiBaseUrl();
  }

  return null;
}

export function getApiBaseUrl() {
  const remoteUrl = getConfiguredRemoteUrl();
  if (remoteUrl) {
    return remoteUrl;
  }

  return getMetroApiBaseUrl();
}

export const API_BASE_URL = getApiBaseUrl();

if (__DEV__) {
  console.log('[API] base URL →', API_BASE_URL);
  const transitProxy = getTransitProxyBaseUrl();
  if (transitProxy) {
    console.log('[API] transit proxy →', transitProxy);
  }
  if (!getConfiguredRemoteUrl()) {
    console.warn(
      '[API] EXPO_PUBLIC_API_URL이 없습니다. frontend/.env 파일을 만들고 Render URL을 설정하세요.\n' +
        '      예: EXPO_PUBLIC_API_URL=https://your-service.onrender.com/api'
    );
  }
}
