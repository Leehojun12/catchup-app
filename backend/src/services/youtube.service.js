const config = require('../config/env');

async function searchVideos(keyword) {
  if (!config.youtubeApiKey) {
    return [
      {
        id: 'mock1',
        title: `${keyword} 브이로그 | 현지 리뷰`,
        channel: 'CatchUp Mock',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
      },
      {
        id: 'mock2',
        title: `${keyword} 맛집 추천 TOP5`,
        channel: 'CatchUp Mock',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword + ' 리뷰')}`,
      },
    ];
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: keyword,
    type: 'video',
    maxResults: '5',
    key: config.youtubeApiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!response.ok) {
    throw new Error('YouTube API 요청 실패');
  }

  const data = await response.json();
  return data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

module.exports = { searchVideos };
