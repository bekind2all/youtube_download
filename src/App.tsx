import React, { useState } from 'react';
import { searchYouTube, analyzeWithGemini, saveToGoogleSheets } from './api';
import { VideoData, AnalysisData } from './types';
import SearchForm from './components/SearchForm';
import ResultsSummary from './components/ResultsSummary';
import VideoCard from './components/VideoCard';
import GeminiAnalysis from './components/GeminiAnalysis';
import AuthButton from './components/AuthButton';
import DownloadPanel from './components/DownloadPanel';
import { Settings, FileSpreadsheet, Download, RefreshCcw } from 'lucide-react';

export default function App() {
  const [downloadSelection, setDownloadSelection] = useState<{ url: string; nonce: number } | null>(null);
  const selectDownload = (url: string) => setDownloadSelection({ url, nonce: Date.now() });
  const [searchState, setSearchState] = useState<{ isLoading: boolean; error: string | null; hasSearched: boolean }>({
    isLoading: false,
    error: null,
    hasSearched: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [youtubeKeyInput, setYoutubeKeyInput] = useState(() => localStorage.getItem('youtubeApiKey') || '');
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSavingToSheets, setIsSavingToSheets] = useState(false);

  const SPREADSHEET_ID = '1V8NioySErj6Zma2KoIn2d0zgcgcpWTL649TZhgkpeKI';

  const handleSaveSettings = () => {
    localStorage.setItem('geminiApiKey', geminiKeyInput.trim());
    localStorage.setItem('youtubeApiKey', youtubeKeyInput.trim());
    setIsSettingsOpen(false);
  };

  const handleSearch = async (params: { query: string; maxResults: number; order: string; videoType: string, isKoreanOnly?: boolean }) => {
    setSearchState({ isLoading: true, error: null, hasSearched: true });
    setSearchQuery(params.query);
    setVideos([]);
    setAnalysis(null);

    try {
      const geminiApiKey = localStorage.getItem('geminiApiKey');
      const youtubeApiKey = localStorage.getItem('youtubeApiKey');
      
      const results = await searchYouTube({ ...params, youtubeApiKey });
      setVideos(results);
      
      if (results.length > 0) {
        const analysisData = await analyzeWithGemini(results, params.query, geminiApiKey);
        setAnalysis(analysisData);
      }
    } catch (error: any) {
      setSearchState(prev => ({ ...prev, error: error.message || '검색 중 오류가 발생했습니다.' }));
    } finally {
      setSearchState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const saveToSheets = async () => {
    if (!analysis || videos.length === 0) return;
    if (!googleToken) {
      alert('Google 로그인이 필요합니다. 우측 상단의 Sign in 버튼을 클릭해주세요.');
      return;
    }

    setIsSavingToSheets(true);
    try {
      await saveToGoogleSheets(googleToken, SPREADSHEET_ID, analysis, searchQuery, videos);
      alert('Google Sheets에 새 탭으로 성공적으로 저장되었습니다.');
    } catch (err: any) {
      alert('Google Sheets 저장 실패: ' + err.message);
    } finally {
      setIsSavingToSheets(false);
    }
  };

  return (
    <div className="min-h-screen bg-apple-canvas text-apple-ink font-body">
      {/* Global Nav */}
      <nav className="h-[44px] bg-apple-black text-white flex items-center px-4 justify-between text-[12px] font-normal tracking-[-0.01em]">
        <div className="flex items-center gap-4">
          <span className="font-semibold tracking-wide">Analyzer</span>
        </div>
        <div className="flex items-center gap-4">
          <AuthButton onTokenChange={setGoogleToken} />
          <button onClick={() => setIsSettingsOpen(true)} className="hover:text-gray-300 transition-colors">
            설정
          </button>
        </div>
      </nav>

      {/* Sub Nav (Sticky) */}
      <div className="sticky top-0 z-50 h-[52px] bg-apple-parchment/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-apple-ink/5">
        <div className="flex items-center gap-5"><a href="#video-analysis" className="text-[18px] font-semibold tracking-tight">콘텐츠 분석</a><a href="#video-download" className="text-[15px] text-apple-primary">영상 다운로드</a></div>
        {analysis && (
          <div className="flex gap-2">
            <a 
              href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[14px] text-apple-primary hover:underline flex items-center px-2"
            >
              시트 열기
            </a>
            <button 
              onClick={saveToSheets} 
              disabled={isSavingToSheets} 
              className="apple-utility-button flex items-center gap-1"
            >
              <FileSpreadsheet size={16} />
              {isSavingToSheets ? '저장 중...' : 'Sheets 저장'}
            </button>
          </div>
        )}
      </div>

      <main>
        {/* Search Section - Light Tile */}
        <section id="video-analysis" className="scroll-mt-16 bg-apple-canvas apple-section px-6 !pt-[56px]">
          <div className="max-w-[980px] mx-auto text-center mb-16">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF0000" className="w-32 h-auto mx-auto mb-[56px]">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <h1 className="text-[56px] font-semibold leading-[1.07] apple-tracking-tight mb-4">
              유튜브 인기 영상 분석.
            </h1>
            <p className="text-[24px] font-light leading-[1.5] text-apple-ink-muted-80">
              데이터를 바탕으로 새로운 콘텐츠 전략과 아이디어를 발견하세요.
            </p>
          </div>
          <SearchForm onSearch={handleSearch} isLoading={searchState.isLoading} />
        </section>

        <DownloadPanel selectedUrl={downloadSelection} />

        {searchState.error && (
          <div className="max-w-[980px] mx-auto px-6 mb-8 text-center text-red-600">
            {searchState.error}
          </div>
        )}

        {searchState.isLoading && (
          <div className="flex flex-col items-center justify-center py-32 text-apple-ink-muted-80">
            <RefreshCcw className="w-8 h-8 animate-spin mb-4 opacity-50" />
            <p className="text-[17px]">데이터 수집 및 AI 분석 중...</p>
          </div>
        )}

        {!searchState.isLoading && searchState.hasSearched && videos.length === 0 && !searchState.error && (
          <div className="text-center py-32 text-apple-ink-muted-80 text-[17px]">
            검색 결과가 없습니다.
          </div>
        )}

        {/* Results Section */}
        {!searchState.isLoading && videos.length > 0 && (
          <>
            {/* Video List Section - Dark Tile */}
            <section className="bg-apple-tile-1 text-white apple-section px-6">
              <div className="max-w-[1440px] mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-[40px] font-semibold leading-[1.1] mb-4">상위 영상 분석 데이터</h2>
                  <p className="text-[24px] font-light text-gray-400">"{searchQuery}" 관련 Top {videos.length} 검색 결과</p>
                </div>
                
                <div className="mb-12">
                  <ResultsSummary videos={videos} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                  {videos.map((video, index) => (
                    <VideoCard key={video.id} video={video} rank={index + 1} isDark={true} onDownload={selectDownload} />
                  ))}
                </div>
              </div>
            </section>

            {/* Analysis Section - Parchment Tile */}
            {analysis && (
              <section className="bg-apple-parchment apple-section px-6">
                <div className="max-w-[980px] mx-auto">
                  <h2 className="text-[40px] font-semibold leading-[1.1] mb-12 text-center">AI 인사이트</h2>
                  <GeminiAnalysis data={analysis} />
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-apple-canvas rounded-[18px] w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-[28px] font-semibold mb-6">설정</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[14px] font-semibold mb-2">Gemini API Key (선택)</label>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-[8px] border border-gray-300 text-[17px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus"
                  placeholder="환경변수 키를 덮어씁니다"
                />
              </div>
              
              <div>
                <label className="block text-[14px] font-semibold mb-2">YouTube API Key (선택)</label>
                <input
                  type="password"
                  value={youtubeKeyInput}
                  onChange={(e) => setYoutubeKeyInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-[8px] border border-gray-300 text-[17px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus"
                  placeholder="환경변수 키를 덮어씁니다"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 text-[17px] text-apple-primary hover:bg-apple-parchment rounded-full transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleSaveSettings}
                className="apple-pill-button"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
