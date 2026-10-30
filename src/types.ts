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

export interface SearchUiState {
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
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

// Download Types (Windows PC Local Server)
export type DownloadQuality = 'best' | '2160' | '1440' | '1080' | '720' | '480';

export type DownloadJobStatus =
  | 'queued'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadJob {
  id: string;
  url: string;
  status: DownloadJobStatus;
  progress: number; // 0..100
  detail?: string;
  folder?: string;
  file?: string;
  error?: string;
}

export interface LocalServerStatus {
  ready: boolean;
  ytDlp?: string | null;
  ffmpeg?: boolean;
  folder?: string;
  platform?: string;
}
