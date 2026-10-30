import React, { useEffect, useState } from 'react';
import { Download, FolderOpen, RefreshCcw, X } from 'lucide-react';

type Job = { id: string; url: string; status: string; progress: number; detail: string; file?: string; folder: string; error?: string };
async function request(url: string, body?: object) {
  const base = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? '' : 'http://127.0.0.1:4317';
  const response = await fetch(`${base}/api/downloads/${url}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || '요청을 처리하지 못했습니다.');
  return value;
}

export default function DownloadPanel({ selectedUrl }: { selectedUrl: { url: string; nonce: number } | null }) {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('best');
  const [folder, setFolder] = useState('');
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);

  const check = async () => {
    setChecking(true);
    try { const status = await request('status'); setFolder(status.folder); setReady(status.ready); if (!status.ready) setError('PC에서 yt-dlp와 FFmpeg를 확인할 수 없습니다. 설치 후 연결 확인을 눌러주세요.'); else setError(''); }
    catch (e: any) { setError('PC 다운로드 앱을 실행한 뒤 연결 확인을 누르세요. 브라우저에 로컬 네트워크 접근 요청이 나오면 허용해 주세요.'); setReady(false); }
    finally { setChecking(false); }
  };
  useEffect(() => { void check(); }, []);
  useEffect(() => { if (selectedUrl) { setUrl(selectedUrl.url); document.getElementById('video-download')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('download-url')?.focus({ preventScroll: true }); } }, [selectedUrl]);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const result = await request('jobs'); if (!disposed) setJobs(result); }
      catch (e: any) { if (!disposed) setError(`PC 연결이 끊겼습니다. ${e.message}`); }
      finally { if (!disposed) timer = setTimeout(poll, 1500); }
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, []);

  const start = async (event?: React.FormEvent, retryUrl?: string) => {
    event?.preventDefault(); setBusy(true); setError('');
    try { const job = await request('jobs', { url: retryUrl || url, quality }); setJobs(prev => [job, ...prev.filter(j => j.id !== job.id)]); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const selectFolder = async () => {
    setPicking(true); setError('');
    try { const data = await request('folder', {}); setFolder(data.folder); }
    catch (e: any) { setError(e.message); }
    finally { setPicking(false); }
  };
  const action = async (job: Job, command: string) => {
    try { await request(`jobs/${job.id}/${command}`, {}); setJobs(await request('jobs')); }
    catch (e: any) { setError(e.message); }
  };
  return <section id="video-download" className="scroll-mt-20 bg-apple-parchment px-6 py-16 border-t border-apple-ink/10">
    <div className="max-w-[980px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div><h2 className="text-[32px] font-semibold tracking-tight">영상 다운로드</h2><p className="text-apple-ink-muted-80 mt-2">마음에 드는 영상의 링크를 넣고 내 PC에 저장하세요.</p></div>
        <button type="button" onClick={check} disabled={checking} className="apple-utility-button flex gap-2 items-center"><RefreshCcw size={15} className={checking ? 'animate-spin' : ''} />{checking ? 'PC 연결 확인 중' : ready ? 'PC 연결됨 · 다시 확인' : '연결 확인'}</button>
      </div>
      <form onSubmit={start} className="space-y-5">
        <div><label htmlFor="download-url" className="block text-sm font-medium mb-2">유튜브 영상 링크</label><div className="flex flex-col sm:flex-row gap-3"><input id="download-url" type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="flex-1 min-w-0 bg-white rounded-xl border border-black/15 p-4 text-base focus:outline-2 focus:outline-blue-600" /><button type="submit" disabled={!ready || busy || !url.trim()} className="rounded-xl bg-apple-primary text-white font-semibold px-7 py-4 disabled:opacity-40 flex items-center justify-center gap-2"><Download size={18} />{busy ? '추가 중…' : '다운로드'}</button></div></div>
        <div className="flex flex-col sm:flex-row gap-5 sm:items-end">
          <div><label htmlFor="download-quality" className="block text-sm font-medium mb-2">화질</label><select id="download-quality" value={quality} onChange={e => setQuality(e.target.value)} className="bg-white border border-black/15 rounded-lg p-3"><option value="best">최고 화질 · MP4</option>{['2160','1440','1080','720','480'].map(q => <option key={q} value={q}>{q}p 이하 · MP4</option>)}</select></div>
          <div className="flex-1 min-w-0"><label className="block text-sm font-medium mb-2">저장 폴더</label><div className="flex items-center gap-3"><span className="text-sm break-all flex-1" title={folder}>{folder || 'PC 연결 후 표시됩니다'}</span><button type="button" onClick={selectFolder} disabled={picking || !ready} className="apple-utility-button shrink-0 flex items-center gap-2"><FolderOpen size={16} />{picking ? '선택 창에서 폴더 선택…' : '폴더 선택'}</button></div></div>
        </div>
        <p className="text-xs text-apple-ink-muted-80 leading-relaxed">선택한 화질 이하에서 제공되는 최고 화질로 저장합니다. 영상과 음성의 진행률은 각각 표시되며, 병합까지 끝나면 저장 완료로 바뀝니다.</p>
      </form>
      {error && <p role="alert" className="mt-5 text-sm text-red-700 bg-red-50 p-4 rounded-lg break-words">{error}</p>}
      <div aria-live="polite" className="space-y-3 mt-8">{jobs.map(job => {
        const active = ['queued','downloading','processing'].includes(job.status);
        return <article key={job.id} className="bg-white border border-black/10 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium text-sm break-all">{job.file?.split(/[\\/]/).pop() || job.url}</p><p className="text-xs text-apple-ink-muted-80 mt-1 break-all">{job.folder}</p></div>{active && <button type="button" onClick={() => action(job,'cancel')} aria-label="다운로드 취소" className="p-2 rounded hover:bg-gray-100"><X size={16} /></button>}</div>
          <div className="flex items-center gap-3 mt-4"><p className={`text-sm flex-1 ${job.status === 'failed' ? 'text-red-700' : ''}`}>{job.status === 'failed' ? job.error : job.detail}</p>{job.status === 'downloading' && <span className="text-sm tabular-nums">{job.progress}%</span>}{job.status === 'completed' && <button type="button" onClick={() => action(job,'open')} className="apple-utility-button">폴더 열기</button>}{['failed','cancelled'].includes(job.status) && <button type="button" disabled={busy || !ready} onClick={() => start(undefined,job.url)} className="apple-utility-button">다시 시도</button>}</div>
          {active && <progress aria-label="다운로드 진행률" max={100} value={job.status === 'processing' ? undefined : job.progress} className="w-full h-2 mt-3 accent-blue-600" />}
        </article>;
      })}</div>
      <p className="text-xs text-apple-ink-muted-80 mt-6">다운로드·사용 권한이 있는 영상을 저장하세요. 저장한 파일은 앱을 종료해도 PC에 남습니다.</p>
    </div>
  </section>;
}
