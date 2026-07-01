// Sends a KakaoTalk "to me" message (메시지 - 나에게 보내기) using the
// Kakao Memo API. Requires the user's Kakao access token with the
// `talk_message` scope. Falls back to a console mock in dev.
const DEV_MOCK_TOKEN = 'dev-mock-token';

async function sendToMe(kakaoAccessToken, { title, text, linkUrl }) {
  if (!kakaoAccessToken || kakaoAccessToken === DEV_MOCK_TOKEN) {
    console.log(`[KakaoTalk Mock] ${title}\n${text}`);
    return { success: true, provider: 'mock' };
  }

  const template = {
    object_type: 'text',
    text: `${title}\n${text}`,
    link: {
      web_url: linkUrl || 'https://catchup.app',
      mobile_web_url: linkUrl || 'https://catchup.app',
    },
    button_title: '앱에서 보기',
  };

  const body = new URLSearchParams({ template_object: JSON.stringify(template) });

  const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kakaoAccessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`카카오톡 메시지 발송 실패: ${detail}`);
  }

  return { success: true, provider: 'kakao' };
}

module.exports = { sendToMe };
