import React, { useState, useEffect } from 'react';

interface SearchFormProps {
  onSearch: (params: { query: string; maxResults: number; order: string; videoType: string, isKoreanOnly: boolean }) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(10);
  const [order, setOrder] = useState('relevance');
  const [videoType, setVideoType] = useState('all');
  const [isKoreanOnly, setIsKoreanOnly] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch({ query, maxResults, order, videoType, isKoreanOnly });
  };

  return (
    <div className="max-w-[980px] mx-auto w-full">
      <form onSubmit={handleSubmit} className="bg-apple-canvas rounded-[18px] border border-gray-200 p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <input
              type="text"
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="w-full bg-apple-parchment rounded-full px-5 py-3 text-[17px] text-apple-ink focus:outline-none focus:ring-2 focus:ring-apple-primary-focus transition-all"
              disabled={isLoading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="apple-pill-button whitespace-nowrap px-8 py-3 w-full md:w-auto disabled:opacity-50"
          >
            {isLoading ? '검색 중...' : '분석 시작'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[14px]">
          <div className="flex items-center gap-2">
            <span className="text-apple-ink-muted-80">개수:</span>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="bg-transparent border-none text-apple-primary font-medium focus:outline-none cursor-pointer"
              disabled={isLoading}
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
            </select>
          </div>

          <div className="w-[1px] h-4 bg-gray-200"></div>

          <div className="flex items-center gap-2">
            <span className="text-apple-ink-muted-80">정렬:</span>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="bg-transparent border-none text-apple-primary font-medium focus:outline-none cursor-pointer"
              disabled={isLoading}
            >
              <option value="relevance">관련성순</option>
              <option value="viewCount">조회수순</option>
              <option value="date">최신순</option>
            </select>
          </div>

          <div className="w-[1px] h-4 bg-gray-200"></div>

          <div className="flex items-center gap-2">
            <span className="text-apple-ink-muted-80">길이:</span>
            <select
              value={videoType}
              onChange={(e) => setVideoType(e.target.value)}
              className="bg-transparent border-none text-apple-primary font-medium focus:outline-none cursor-pointer"
              disabled={isLoading}
            >
              <option value="all">전체</option>
              <option value="shorts">쇼츠 (1분 이하)</option>
              <option value="normal">일반 영상 (1분 초과)</option>
            </select>
          </div>

          <div className="w-[1px] h-4 bg-gray-200"></div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isKoreanOnly}
              onChange={(e) => setIsKoreanOnly(e.target.checked)}
              className="w-4 h-4 text-apple-primary rounded focus:ring-apple-primary border-gray-300"
              disabled={isLoading}
            />
            <span className="text-apple-ink-muted-80 group-hover:text-apple-ink transition-colors">한국 채널 위주</span>
          </label>
        </div>
      </form>
    </div>
  );
}
