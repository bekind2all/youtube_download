import { VideoData, SearchState, AnalysisData } from './types';

export const searchYouTube = async (params: { query: string; maxResults: number; order: string; videoType: string; isKoreanOnly?: boolean; youtubeApiKey?: string | null }): Promise<VideoData[]> => {
  const youtubeApiKey = localStorage.getItem('youtubeApiKey') || undefined;

  const response = await fetch('/api/youtube/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, youtubeApiKey }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'YouTube 검색 중 오류가 발생했습니다.');
  }

  return data.items;
};

export const analyzeWithGemini = async (videoData: VideoData[], searchQuery: string, geminiApiKey?: string | null): Promise<AnalysisData> => {
  geminiApiKey = geminiApiKey || localStorage.getItem('geminiApiKey') || undefined;

  const response = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoData, searchQuery, geminiApiKey }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gemini 분석 중 오류가 발생했습니다.');
  }

  return data;
};

export const saveToGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string,
  analysis: AnalysisData,
  query: string,
  videos: VideoData[]
): Promise<void> => {
  const response = await fetch('/api/sheets/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, spreadsheetId, analysis, query, videos }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Google Sheets 저장 중 오류가 발생했습니다.');
  }
};
