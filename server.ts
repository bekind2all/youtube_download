import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { attachDownloads } from './downloads';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4317);

app.use(express.json({ limit: '10mb' }));
attachDownloads(app);

// Helper to parse ISO 8601 duration
function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0') || 0;
  const minutes = parseInt(match[2] || '0') || 0;
  const seconds = parseInt(match[3] || '0') || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0초';
  const hours = parseInt(match[1] || '0') || 0;
  const minutes = parseInt(match[2] || '0') || 0;
  const seconds = parseInt(match[3] || '0') || 0;
  
  let result = '';
  if (hours > 0) result += `${hours}시간 `;
  if (minutes > 0) result += `${minutes}분 `;
  if (seconds > 0 || result === '') result += `${seconds}초`;
  return result.trim();
}

import { handleSaveSheets } from './save-sheets-api';

app.post('/api/sheets/save', handleSaveSheets);

app.post('/api/youtube/search', async (req, res) => {
  try {
    const { query, maxResults, order, videoType, isKoreanOnly, youtubeApiKey, geminiApiKey } = req.body;
    const apiKey = youtubeApiKey || process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'YouTube API 키가 설정되지 않았습니다.' });
    }

    let durationParam = 'any';
    if (videoType === 'shorts') durationParam = 'short';
    else if (videoType === 'normal') durationParam = 'medium';

    // 1. Search List
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('type', 'video');
    
    if (isKoreanOnly) {
      searchUrl.searchParams.append('regionCode', 'KR');
      searchUrl.searchParams.append('relevanceLanguage', 'ko');
    }

    // Fetch more if we need to filter out shorts/normals manually to reach maxResults
    const fetchCount = videoType === 'all' ? maxResults : 50; 
    searchUrl.searchParams.append('maxResults', fetchCount.toString());
    searchUrl.searchParams.append('order', order);
    
    // Add "한국어" or similar to the query to strongly bias towards Korean content if requested
    const finalQuery = isKoreanOnly && !query.includes('한국') && !/[가-힣]/.test(query) ? `${query} 한국어` : query;
    searchUrl.searchParams.append('q', finalQuery);
    searchUrl.searchParams.append('key', apiKey);
    
    if (durationParam !== 'any') {
      searchUrl.searchParams.append('videoDuration', durationParam);
    }
    const searchRes = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error('YouTube API Error:', searchData);
      const errorMessage = searchData.error?.message || 'YouTube API 요청 중 오류가 발생했습니다.';
      if (searchData.error?.errors?.[0]?.reason === 'quotaExceeded') {
        return res.status(429).json({ error: 'YouTube API 할당량이 초과되었습니다.' });
      }
      return res.status(searchRes.status).json({ error: `YouTube API 오류: ${errorMessage}` });
    }

    if (!searchData.items || searchData.items.length === 0) {
      return res.json({ items: [] });
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    // 2. Videos List
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.append('part', 'snippet,statistics,contentDetails');
    videosUrl.searchParams.append('id', videoIds);
    videosUrl.searchParams.append('key', apiKey);

    const videosRes = await fetch(videosUrl.toString());
    const videosData = await videosRes.json();

    if (!videosRes.ok) {
       console.error('YouTube Videos API Error:', videosData);
       const errorMessage = videosData.error?.message || '영상 세부 정보를 가져오는 중 오류가 발생했습니다.';
       return res.status(videosRes.status).json({ error: `YouTube API 오류: ${errorMessage}` });
    }

    let items = videosData.items.map((item: any) => {
      const views = parseInt(item.statistics.viewCount || '0', 10);
      const likes = parseInt(item.statistics.likeCount || '0', 10);
      const comments = parseInt(item.statistics.commentCount || '0', 10);
      const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
      
      const durationSeconds = parseDuration(item.contentDetails.duration);

      return {
        id: item.id,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: formatDuration(item.contentDetails.duration),
        durationSeconds,
        views,
        likes,
        comments,
        engagement,
        url: `https://www.youtube.com/watch?v=${item.id}`
      };
    });

    // Manual filtering for Shorts vs Normal
    if (videoType === 'shorts') {
       items = items.filter((item: any) => item.durationSeconds <= 60);
    } else if (videoType === 'normal') {
       items = items.filter((item: any) => item.durationSeconds > 60);
    }

    // Limit to maxResults
    items = items.slice(0, maxResults);

    res.json({ items });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: '서버 내부 통신 실패' });
  }
});

app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { videoData, searchQuery, geminiApiKey } = req.body;
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
당신은 유튜브 콘텐츠 전문가입니다. 다음은 "${searchQuery}" 검색어에 대한 유튜브 영상 데이터입니다.
이 데이터를 바탕으로 개별 영상의 세부 분석과 인기 콘텐츠의 전반적인 특징을 분석해 주세요.

데이터 목록:
${JSON.stringify(videoData, null, 2)}

반드시 제공된 데이터만을 기반으로 분석해야 하며, 실제로 수집되지 않은 조회수, 채널 정보, 시장 데이터를 지어내지 마세요.
데이터가 부족하여 판단하기 어려운 항목은 "현재 검색 결과만으로 판단하기 어렵습니다"라고 명시하세요.

다음 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
{
  "videoAnalyses": [
    {
      "id": "해당 영상의 id",
      "summary": "해당 영상의 간단 내용 (1-2문장)",
      "analysis": "해당 영상 분석 요약 (1-2문장)",
      "teachingPoints": ["AI활용법 강사인 내가 참고할 포인트 1", "포인트 2", "포인트 3"]
    }
  ],
  "commonTraits": ["특징1", "특징2", ...],
  "frequentKeywords": ["키워드1", "키워드2", ...],
  "titlePatterns": ["패턴1", "패턴2", ...],
  "highViewsTraits": ["특징1", ...],
  "highEngagementTraits": ["특징1", ...],
  "contentTrends": ["트렌드1", ...],
  "newVideoIdeas": ["아이디어1", ...], // 5개
  "recommendedTitles": ["제목1", ...], // 10개
  "recommendedThumbnailTexts": ["문구1", ...], // 10개
  "precautions": ["주의점1", ...]
}

주의사항:
- "videoAnalyses" 배열에는 제공된 영상 중 상위 최대 10개에 대해서만 분석을 작성해주세요.
- 각 영상의 id는 제공된 데이터의 id와 정확히 일치해야 합니다.
`;

    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) throw error;
        console.warn(`Gemini API call failed, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response || !response.text) {
        return res.status(500).json({ error: 'Gemini 모델이 응답을 반환하지 않았습니다.' });
    }

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    const errorMessage = error?.message || 'Gemini 분석 중 오류가 발생했습니다.';
    res.status(500).json({ error: `Gemini API 오류: ${errorMessage}` });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
