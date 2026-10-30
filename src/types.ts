export interface VideoData {
  id: string;
  thumbnail: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  url: string;
}

export interface SearchState {
  query: string;
  maxResults: number;
  order: string;
  videoType: string;
  isKoreanOnly?: boolean;
}

export interface VideoAnalysis {
  id: string;
  summary: string;
  analysis: string;
  teachingPoints: string[];
}

export interface AnalysisData {
  videoAnalyses?: VideoAnalysis[];
  commonTraits: string[];
  frequentKeywords: string[];
  titlePatterns: string[];
  highViewsTraits: string[];
  highEngagementTraits: string[];
  contentTrends: string[];
  newVideoIdeas: string[];
  recommendedTitles: string[];
  recommendedThumbnailTexts: string[];
  precautions: string[];
}
