import { getApiBaseUrl } from '../utils/apiBaseUrl';

// Module-level auth token, set by AuthContext after login.
let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

function connectionHint(baseUrl) {
  if (baseUrl.startsWith('https://') && baseUrl.includes('onrender.com')) {
    return (
      'Render 서버가 깨어 있는지 확인해주세요. (무료 플랜은 첫 요청에 30~60초 걸릴 수 있어요)\n' +
      'frontend/.env 의 EXPO_PUBLIC_API_URL이 본인 서비스 URL인지 확인하세요.'
    );
  }
  return (
    'PC에서 `cd backend && npm run dev`로 서버를 실행했는지, ' +
    'iPhone과 PC가 같은 Wi-Fi에 연결되어 있는지 확인해주세요.'
  );
}

const RENDER_COLD_START_MS = 90000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RENDER_COLD_START_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('서버 응답 시간이 초과되었습니다. Render 무료 플랜은 첫 요청에 1분 정도 걸릴 수 있어요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || '요청에 실패했습니다');
  }
  return data;
}

async function request(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = options.token || authToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetchWithTimeout(`${baseUrl}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error(`서버에 연결할 수 없습니다.\n${connectionHint(baseUrl)}\n(${baseUrl})`);
  }

  return parseResponse(response);
}

async function requestMultipart(path, formData) {
  const baseUrl = getApiBaseUrl();
  const headers = {};
  const token = authToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetchWithTimeout(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new Error(`서버에 연결할 수 없습니다.\n${connectionHint(baseUrl)}`);
  }

  return parseResponse(response);
}

export const api = {
  // Auth
  sendSmsCode: (phone) =>
    request('/auth/sms/send', { method: 'POST', body: { phone } }),

  verifySmsCode: (phone, code) =>
    request('/auth/sms/verify', { method: 'POST', body: { phone, code } }),

  signup: (payload) =>
    request('/auth/signup', { method: 'POST', body: payload }),

  // payload: { code, redirectUri } (real OAuth) or { accessToken } (dev mock)
  kakaoLogin: (payload) =>
    request('/auth/kakao', { method: 'POST', body: payload }),

  naverLogin: (payload) =>
    request('/auth/naver', { method: 'POST', body: payload }),

  getMe: () => request('/auth/me', { method: 'GET' }),

  updateProfile: (updates) =>
    request('/auth/me', { method: 'PATCH', body: updates }),

  // Reminders
  syncReminders: (events) =>
    request('/reminders/sync', { method: 'POST', body: { events } }),

  // AI / content
  transcribeAudio: (formData) => requestMultipart('/ai/transcribe', formData),

  parseChatText: (text) =>
    request('/ai/parse', { method: 'POST', body: { text } }),

  chatWithAi: (messages, context) =>
    request('/ai/chat', { method: 'POST', body: { messages, context } }),

  getPlaceInfo: (keyword) =>
    request('/recommendations/place', { method: 'POST', body: { keyword } }),

  getYouTubeVideos: (keyword) =>
    request('/recommendations/youtube', { method: 'POST', body: { keyword } }),

  getChecklist: (event) =>
    request('/recommendations/checklist', { method: 'POST', body: { event } }),
};
