import React from 'react';
import { Copy } from 'lucide-react';
import { AnalysisData } from '../types';

interface GeminiAnalysisProps {
  data: AnalysisData;
}

export default function GeminiAnalysis({ data }: GeminiAnalysisProps) {
  
  const copyToClipboard = () => {
    const text = `[상위 영상 공통 특징]\n${data.commonTraits?.map(t => `- ${t}`).join('\n')}
\n[자주 사용된 키워드]\n${data.frequentKeywords?.join(', ')}
\n[새로운 영상 아이디어 Top 5]\n${data.newVideoIdeas?.map((t, i) => `${i+1}. ${t}`).join('\n')}
\n[추천 제목]\n${data.recommendedTitles?.map((t, i) => `${i+1}. ${t}`).join('\n')}
\n[추천 썸네일 문구]\n${data.recommendedThumbnailTexts?.map((t, i) => `${i+1}. ${t}`).join('\n')}
\n[콘텐츠 트렌드]\n${data.contentTrends?.map(t => `- ${t}`).join('\n')}
\n[제작 시 주의점]\n${data.precautions?.map(t => `- ${t}`).join('\n')}`;
    
    navigator.clipboard.writeText(text);
    alert('인사이트가 복사되었습니다.');
  };

  const Section = ({ title, items, isNumbered = false }: { title: string, items?: string[], isNumbered?: boolean }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="bg-apple-canvas rounded-[18px] p-8 border border-gray-100 shadow-sm">
        <h3 className="text-[21px] font-semibold text-apple-ink mb-6 apple-tracking-tight">{title}</h3>
        <ul className="space-y-4">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start text-[17px] text-apple-ink-muted-80 leading-[1.47]">
              {isNumbered ? (
                <span className="font-semibold text-apple-ink min-w-[28px]">{idx + 1}.</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-apple-primary mt-2.5 mr-3 shrink-0"></span>
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Section title="상위 영상 공통 특징" items={data.commonTraits} />
        <Section title="자주 사용된 키워드" items={data.frequentKeywords} />
        <Section title="높은 조회수 / 참여율 특징" items={[...(data.highViewsTraits || []), ...(data.highEngagementTraits || [])]} />
        <Section title="콘텐츠 트렌드" items={data.contentTrends} />
        <div className="md:col-span-2">
           <Section title="새로운 영상 아이디어 (Top 5)" items={data.newVideoIdeas} isNumbered={true} />
        </div>
        <Section title="추천 제목" items={data.recommendedTitles} />
        <Section title="추천 썸네일 문구" items={data.recommendedThumbnailTexts} />
        <div className="md:col-span-2">
           <Section title="제작 시 주의점" items={data.precautions} />
        </div>
      </div>
      
      <div className="flex justify-center pb-8">
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-2 apple-utility-button px-6 py-3 text-[14px]"
          style={{ backgroundColor: 'var(--color-apple-ink)', color: 'white' }}
        >
          <Copy size={16} /> 전체 인사이트 텍스트로 복사하기
        </button>
      </div>
    </div>
  );
}
