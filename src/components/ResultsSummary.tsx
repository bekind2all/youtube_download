import React from 'react';
import { VideoData } from '../types';

export default function ResultsSummary({ videos }: { videos: VideoData[] }) {
  if (!videos.length) return null;

  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const avgViews = Math.round(totalViews / videos.length);
  const avgEngagement = (videos.reduce((sum, v) => sum + v.engagement, 0) / videos.length).toFixed(2);
  
  const shortsCount = videos.filter(v => v.durationSeconds <= 60).length;
  const normalCount = videos.length - shortsCount;

  const Metric = ({ label, value }: { label: string, value: string | number }) => (
    <div className="bg-apple-tile-2 rounded-[18px] p-6 text-center">
      <p className="text-[14px] text-gray-400 mb-2 font-medium">{label}</p>
      <p className="text-[28px] font-semibold text-white apple-tracking-tight">{value}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Metric label="평균 조회수" value={avgViews.toLocaleString()} />
      <Metric label="평균 참여율" value={`${avgEngagement}%`} />
      <Metric label="일반 영상" value={`${normalCount}개`} />
      <Metric label="쇼츠 영상" value={`${shortsCount}개`} />
    </div>
  );
}
