const dayjs = require('dayjs');
const config = require('../config/env');

const PARSE_PROMPT = `You are a calendar event extractor for Korean chat messages.
Extract event info and return JSON only with this schema:
{
  "title": string,
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm" or null,
  "endTime": "HH:mm" or null,
  "location": string or null,
  "members": string[],
  "memo": string or null,
  "allDay": boolean
}
Convert relative dates like "내일", "다음주 금요일" using the reference date provided.`;

function mockParseChatText(text) {
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const timeMatch = text.match(/(\d{1,2})\s*시/);
  const hour = timeMatch ? String(timeMatch[1]).padStart(2, '0') : '19';

  const locationMatch = text.match(/([가-힣a-zA-Z0-9]+(?:동|역|고기집|카페|식당|회의|집)[가-힣a-zA-Z0-9\s]*)/);
  const memberMatch = text.match(/([가-힣]{2,4})(?:랑|하고|와|이랑)/g);

  const members = memberMatch
    ? memberMatch.map((m) => m.replace(/(랑|하고|와|이랑)/, '').trim())
    : [];

  const event = {
    title: locationMatch ? locationMatch[1].trim() : '새 일정',
    date: text.includes('내일') || text.includes('tomorrow') ? tomorrow : dayjs().format('YYYY-MM-DD'),
    startTime: `${hour}:00`,
    endTime: null,
    location: locationMatch ? locationMatch[1].trim() : null,
    members,
    memo: text.slice(0, 100),
    allDay: false,
  };

  const missingFields = [];
  if (!event.title) missingFields.push('title');
  if (!event.date) missingFields.push('date');

  return { event, missingFields };
}

async function parseWithOpenAI(text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PARSE_PROMPT },
        {
          role: 'user',
          content: `Reference date: ${dayjs().format('YYYY-MM-DD')} (${dayjs().format('dddd')})\n\nChat:\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error('AI 파싱에 실패했습니다');
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  const missingFields = [];
  if (!parsed.title) missingFields.push('title');
  if (!parsed.date) missingFields.push('date');

  return { event: parsed, missingFields };
}

async function parseChatText(text) {
  if (config.openaiApiKey) {
    try {
      return await parseWithOpenAI(text);
    } catch (error) {
      console.warn('OpenAI parse failed, falling back to mock:', error.message);
    }
  }
  return mockParseChatText(text);
}

async function getPlaceInfo(keyword) {
  return {
    name: keyword,
    summary: `${keyword}에 대한 AI 요약 정보입니다. 분위기는 캐주얼하고 접근성이 좋습니다.`,
    highlights: [
      '대화에서 추출된 장소 키워드 기반 정보',
      '실제 서비스에서는 Google Places / 네이버 API 연동',
      '영업시간·리뷰는 외부 API로 보완 필요',
    ],
  };
}

async function generateChecklist(event) {
  const base = ['신분증', '휴대폰'];
  if (event.location?.includes('고기')) return [...base, '에어컨 겉옷', '치실'];
  if (event.title?.includes('회의')) return ['노트북', '충전기', '회의 링크 확인'];
  return base;
}

async function transcribeAudio(buffer, mimeType = 'audio/m4a') {
  if (!config.openaiApiKey) {
    const error = new Error(
      'OPENAI: 음성 인식을 위해 서버에 OPENAI_API_KEY가 필요합니다. 직접 입력해주세요.'
    );
    error.status = 503;
    throw error;
  }

  const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'm4a';
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), `recording.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'ko');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`음성 인식에 실패했습니다${detail ? `: ${detail.slice(0, 120)}` : ''}`);
  }

  const data = await response.json();
  return data.text?.trim() || '';
}

const CHAT_SYSTEM_PROMPT = `You are CatchUp, a friendly Korean calendar assistant.
Help users manage schedules, suggest plans, answer questions about their upcoming events, and give practical advice.
Reply in Korean unless the user writes in another language.
Keep answers concise and easy to read on mobile (short paragraphs or bullet points when helpful).
If the user wants to add an event, ask for title, date, time, and location if missing.`;

function mockChatReply(messages, context) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const text = lastUser?.content?.trim() || '';

  if (!text) {
    return '무엇을 도와드릴까요? 일정 확인이나 추가 방법을 알려드릴 수 있어요.';
  }

  if (/일정|스케줄|약속/.test(text) && /추가|등록|만들/.test(text)) {
    return '일정을 추가하려면 캘린더 오른쪽 위 + 버튼을 눌러 음성 입력이나 직접 입력을 선택해주세요. 제목, 날짜, 시작 시간, 장소를 알려주시면 더 정확히 도와드릴 수 있어요.';
  }

  const upcoming = context?.upcomingEvents || [];
  if (/다음|오늘|이번|일정|뭐/.test(text) && upcoming.length > 0) {
    const lines = upcoming.slice(0, 5).map((e) => {
      const time = e.startTime ? ` ${e.startTime}` : '';
      const place = e.location ? ` · ${e.location}` : '';
      return `- ${e.date}${time}: ${e.title}${place}`;
    });
    return `다가오는 일정이에요:\n${lines.join('\n')}\n\n더 자세히 알고 싶은 일정이 있으면 말씀해주세요.`;
  }

  if (upcoming.length === 0 && /일정|스케줄/.test(text)) {
    return '등록된 다가오는 일정이 없어요. + 버튼으로 새 일정을 추가해보세요.';
  }

  return `"${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"에 대해 도와드릴게요. CatchUp에서는 일정 확인, 추가 방법, 장소·준비물 추천 등을 도와드릴 수 있어요.`;
}

async function chatWithOpenAI(messages, context) {
  const contextBlock = context?.upcomingEvents?.length
    ? `\n\nUser upcoming events (reference only):\n${JSON.stringify(context.upcomingEvents.slice(0, 10), null, 2)}`
    : '\n\nUser has no upcoming events registered.';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT + contextBlock },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error('AI 대화에 실패했습니다');
  }

  const data = await response.json();
  return data.choices[0].message.content?.trim() || '답변을 생성하지 못했습니다.';
}

async function chatWithAi(messages, context = {}) {
  const safeMessages = (messages || []).filter(
    (m) => m?.role && m?.content?.trim() && ['user', 'assistant'].includes(m.role)
  );

  if (safeMessages.length === 0) {
    return { reply: mockChatReply([], context) };
  }

  if (config.openaiApiKey) {
    try {
      const reply = await chatWithOpenAI(safeMessages, context);
      return { reply };
    } catch (error) {
      console.warn('OpenAI chat failed, falling back to mock:', error.message);
    }
  }

  return { reply: mockChatReply(safeMessages, context) };
}

module.exports = {
  parseChatText,
  getPlaceInfo,
  generateChecklist,
  transcribeAudio,
  chatWithAi,
};
