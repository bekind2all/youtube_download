import React from 'react';
import { Copy, Download } from 'lucide-react';
import { VideoData } from '../types';

interface VideoCardProps {
  key?: React.Key;
  video: VideoData;
  rank: number;
  isDark?: boolean;
  onSelectForDownload?: (url: string) => void;
}

export default function VideoCard({ video, rank, isDark = false, onSelectForDownload }: VideoCardProps) {
  const containerClass = isDark ? "bg-apple-tile-2 text-white" : "bg-apple-canvas text-apple-ink border border-gray-100";
  const mutedClass = isDark ? "text-gray-400" : "text-apple-ink-muted-80";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(video.url);
    alert('링크가 복사되었습니다.');
  };

  return (
    <div className={`${containerClass} rounded-[18px] overflow-hidden flex flex-col h-full transition-transform hover:scale-[1.02] duration-300`}>
      <div className="relative aspect-video w-full bg-black">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-[4px]">
          #{rank}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-[4px]">
          {video.duration}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-[14px] font-semibold leading-[1.3] mb-1 line-clamp-2" title={video.title}>
          {video.title}
        </h3>
        <p className={`text-[12px] ${mutedClass} mb-4 line-clamp-1`}>{video.channelTitle}</p>
        
        <div className={`mt-auto grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] ${mutedClass}`}>
          <div className="col-span-2 whitespace-nowrap">업로드: <span className={isDark ? "text-white" : "text-apple-ink"}>{new Date(video.publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
          <div className="whitespace-nowrap">조회: <span className={isDark ? "text-white" : "text-apple-ink"}>{video.views.toLocaleString()}</span></div>
          <div className="whitespace-nowrap">좋아요: <span className={isDark ? "text-white" : "text-apple-ink"}>{video.likes.toLocaleString()}</span></div>
          <div className="whitespace-nowrap">댓글: <span className={isDark ? "text-white" : "text-apple-ink"}>{video.comments.toLocaleString()}</span></div>
          <div className="whitespace-nowrap">참여: <span className={isDark ? "text-white" : "text-apple-ink"}>{video.engagement.toFixed(2)}%</span></div>
        </div>

        <div className="mt-4 flex gap-1.5 w-full">
          <a 
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center apple-utility-button whitespace-nowrap text-[12px] px-2 py-2 flex items-center justify-center"
            style={{ backgroundColor: isDark ? 'white' : 'var(--color-apple-ink)', color: isDark ? 'black' : 'white' }}
          >
            보기
          </a>
          {onSelectForDownload && (
            <button
              onClick={() => onSelectForDownload(video.url)}
              className="apple-utility-button whitespace-nowrap px-2.5 py-2 flex items-center justify-center gap-1 transition-colors text-[12px]"
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)', 
                color: isDark ? 'white' : 'var(--color-apple-ink)' 
              }}
              title="다운로드 입력창으로 이동"
            >
              <Download size={13} />
              <span>다운</span>
            </button>
          )}
          <button
            onClick={handleCopyLink}
            className="apple-utility-button whitespace-nowrap px-2.5 py-2 flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
              color: isDark ? 'white' : 'var(--color-apple-ink)' 
            }}
            title="링크 복사"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
