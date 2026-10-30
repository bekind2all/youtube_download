import React, { useState } from 'react';
import { VideoData } from '../types';
import { ExternalLink, ArrowUpDown } from 'lucide-react';

export default function VideoTable({ videos }: { videos: VideoData[] }) {
  const [sortField, setSortField] = useState<keyof VideoData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof VideoData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedVideos = [...videos].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const SortHeader = ({ field, label }: { field: keyof VideoData; label: string }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-blue-600 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={14} className={sortField === field ? 'text-blue-600' : 'opacity-30'} />
      </div>
    </th>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">순위</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">썸네일</th>
            <SortHeader field="title" label="제목" />
            <SortHeader field="channelTitle" label="채널명" />
            <SortHeader field="publishedAt" label="게시일" />
            <SortHeader field="durationSeconds" label="길이" />
            <SortHeader field="views" label="조회수" />
            <SortHeader field="likes" label="좋아요" />
            <SortHeader field="comments" label="댓글" />
            <SortHeader field="engagement" label="참여율" />
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">링크</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sortedVideos.map((video, index) => (
            <tr key={video.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 font-medium">{index + 1}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <img src={video.thumbnail} alt={video.title} className="w-16 h-9 object-cover rounded" />
              </td>
              <td className="px-4 py-3 text-sm text-slate-800 max-w-[200px] truncate font-medium" title={video.title}>{video.title}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{video.channelTitle}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{new Date(video.publishedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{video.duration}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-right">{video.views.toLocaleString()}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-right">{video.likes.toLocaleString()}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-right">{video.comments.toLocaleString()}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium text-right">{video.engagement.toFixed(2)}%</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <a href={video.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">
                  <ExternalLink size={16} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
