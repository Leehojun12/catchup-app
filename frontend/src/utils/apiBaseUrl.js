import Constants from 'expo-constants';

const API_PORT = 3000;

function extractHost(uri) {
  if (!uri || typeof uri !== 'string') return null;
  const cleaned = uri.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const hostname = cleaned.split(':')[0]?.split('/')[0];
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  return hostname;
}

function getMetroHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
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

export function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Explicit LAN / remote URL set by developer
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }

  // Physical device: reuse the same host Metro uses (e.g. 192.168.x.x)
  const metroHost = getMetroHost();
  if (metroHost) {
    return `http://${metroHost}:${API_PORT}/api`;
  }

  return (envUrl || `http://localhost:${API_PORT}/api`).replace(/\/$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

if (__DEV__) {
  console.log('[API] base URL →', API_BASE_URL);
}
