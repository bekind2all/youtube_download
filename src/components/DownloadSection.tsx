import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Download,
  Folder,
  FolderOpen,
  RefreshCw,
  XCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  HardDrive,
  Info,
  ExternalLink
} from 'lucide-react';
import {
  DownloadJob,
  DownloadQuality,
  LocalServerStatus
} from '../types';
import {
  getLocalServerStatus,
  chooseLocalFolder,
  createDownloadJob,
  getDownloadJobs,
  cancelDownloadJob,
  openDownloadFolder
} from '../downloadApi';

export interface DownloadSectionRef {
  setUrlAndFocus: (url: string) => void;
}

interface DownloadSectionProps {
  initialUrl?: string;
}

const QUALITY_OPTIONS: { value: DownloadQuality; label: string; desc: string }[] = [
  { value: 'best', label: '최고 화질', desc: '원본 최고 해상도' },
  { value: '2160', label: '4K', desc: '2160p UHD' },
  { value: '1440', label: 'QHD', desc: '1440p' },
  { value: '1080', label: 'FHD', desc: '1080p 권장' },
  { value: '720', label: 'HD', desc: '720p' },
  { value: '480', label: 'SD', desc: '480p 경량' },
];

const DownloadSection = forwardRef<DownloadSectionRef, DownloadSectionProps>(({ initialUrl = '' }, ref) => {
  const [url, setUrl] = useState(initialUrl);
  const [quality, setQuality] = useState<DownloadQuality>('best');
  const [serverStatus, setServerStatus] = useState<LocalServerStatus>({ ready: false });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isChoosingFolder, setIsChoosingFolder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingJobId, setActionLoadingJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setUrlAndFocus: (newUrl: string) => {
      setUrl(newUrl);
      setErrorMessage(null);
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }));

  // Check server status
  const checkStatus = async () => {
    setIsCheckingStatus(true);
    setErrorMessage(null);
    try {
      const status = await getLocalServerStatus();
      setServerStatus(status);
    } catch {
      setServerStatus({ ready: false });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Fetch jobs once
  const fetchJobs = async () => {
    try {
      const list = await getDownloadJobs();
      setJobs(list);
    } catch {
      // If server unreachable during poll, keep existing list without crashing
    }
  };

  // Initial status check & jobs fetch
  useEffect(() => {
    checkStatus();
  }, []);

  // Polling for jobs every 1.5 seconds when server is ready or jobs exist
  useEffect(() => {
    if (!serverStatus.ready && jobs.length === 0) return;

    fetchJobs();
    const interval = setInterval(() => {
      fetchJobs();
    }, 1500);

    return () => clearInterval(interval);
  }, [serverStatus.ready, jobs.length]);

  // Handle folder change
  const handleSelectFolder = async () => {
    if (isChoosingFolder) return;
    setIsChoosingFolder(true);
    setErrorMessage(null);

    try {
      const res = await chooseLocalFolder();
      if (!res.cancelled && res.folder) {
        setServerStatus(prev => ({ ...prev, folder: res.folder }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || '폴더 선택 중 오류가 발생했습니다.');
    } finally {
      setIsChoosingFolder(false);
    }
  };

  // Handle job submission
  const handleSubmitJob = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || !serverStatus.ready) return;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setErrorMessage('다운로드할 영상의 URL을 입력해 주세요.');
      inputRef.current?.focus();
      return;
    }

    if (!trimmedUrl.includes('youtube.com/') && !trimmedUrl.includes('youtu.be/')) {
      setErrorMessage('올바른 YouTube 영상 URL(youtube.com 또는 youtu.be)을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newJob = await createDownloadJob(trimmedUrl, quality);
      // Prepend or update job list
      setJobs(prev => [newJob, ...prev.filter(j => j.id !== newJob.id)]);
      setUrl('');
      await fetchJobs();
    } catch (err: any) {
      setErrorMessage(err.message || '다운로드 요청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle job cancellation
  const handleCancelJob = async (jobId: string) => {
    setActionLoadingJobId(jobId);
    try {
      const updated = await cancelDownloadJob(jobId);
      setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    } catch (err: any) {
      setErrorMessage(err.message || '작업 취소에 실패했습니다.');
    } finally {
      setActionLoadingJobId(null);
    }
  };

  // Handle open folder
  const handleOpenFolder = async (jobId: string) => {
    setActionLoadingJobId(jobId);
    try {
      await openDownloadFolder(jobId);
    } catch (err: any) {
      setErrorMessage(err.message || '폴더를 열지 못했습니다.');
    } finally {
      setActionLoadingJobId(null);
    }
  };

  // Handle retry
  const handleRetryJob = async (job: DownloadJob) => {
    setActionLoadingJobId(job.id);
    try {
      const newJob = await createDownloadJob(job.url, quality);
      setJobs(prev => [newJob, ...prev.filter(j => j.id !== newJob.id)]);
      await fetchJobs();
    } catch (err: any) {
      setErrorMessage(err.message || '재시도 요청에 실패했습니다.');
    } finally {
      setActionLoadingJobId(null);
    }
  };

  return (
    <section id="download-section" className="bg-apple-parchment apple-section px-6">
      <div className="max-w-[980px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm border border-black/5 mb-4 text-apple-primary">
            <Download className="w-6 h-6" />
          </div>
          <h2 className="text-[36px] md:text-[44px] font-semibold leading-[1.1] apple-tracking-tight mb-3">
            고화질 영상 다운로드
          </h2>
          <p className="text-[17px] md:text-[20px] font-light text-apple-ink-muted-80 max-w-xl mx-auto">
            유튜브 영상 링크를 넣고 원하는 화질로 내 PC에 저장하세요.
          </p>
        </div>

        {/* Local Server Status Banner */}
        <div className="mb-8">
          {serverStatus.ready ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-emerald-500/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-emerald-800">PC 다운로드 서버 연결됨</span>
                    {serverStatus.platform && (
                      <span className="text-[11px] bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                        {serverStatus.platform}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-emerald-700/80 mt-0.5">
                    yt-dlp {serverStatus.ytDlp ? '사용 가능' : '확인 중'} • ffmpeg {serverStatus.ffmpeg ? '사용 가능' : '확인 중'}
                  </p>
                </div>
              </div>

              <button
                onClick={checkStatus}
                disabled={isCheckingStatus}
                className="apple-utility-button text-[12px] px-3 py-1.5 flex items-center gap-1.5 self-end sm:self-auto"
                title="연결 새로고침"
              >
                <RefreshCw size={13} className={isCheckingStatus ? 'animate-spin' : ''} />
                <span>상태 새로고침</span>
              </button>
            </div>
          ) : (
            <div className="bg-amber-50/90 backdrop-blur-md rounded-2xl p-5 border border-amber-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[15px] font-semibold text-amber-900 mb-1">
                      PC 다운로드 앱 연결 대기 중
                    </h3>
                    <p className="text-[13px] text-amber-800 leading-relaxed">
                      PC 다운로드 앱을 실행한 뒤 연결 확인을 누르세요. 브라우저에서 로컬 네트워크 접근 요청이 나오면 허용해 주세요.
                    </p>
                    <p className="text-[11px] text-amber-700/80 mt-1">
                      로컬 API 주소: <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">http://127.0.0.1:4317/api/downloads</code>
                    </p>
                  </div>
                </div>

                <button
                  onClick={checkStatus}
                  disabled={isCheckingStatus}
                  className="apple-utility-button whitespace-nowrap text-[13px] px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 self-stretch sm:self-auto justify-center"
                >
                  <RefreshCw size={14} className={isCheckingStatus ? 'animate-spin' : ''} />
                  <span>{isCheckingStatus ? '연결 확인 중...' : '연결 확인'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Download Control Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-black/5 mb-8">
          <form onSubmit={handleSubmitJob} className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="video-url-input" className="block text-[14px] font-semibold text-apple-ink mb-2">
                유튜브 영상 링크 (URL)
              </label>
              <div className="relative">
                <input
                  id="video-url-input"
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                  className="w-full px-4 py-3.5 pr-24 rounded-xl border border-gray-200 text-[15px] text-apple-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-primary/20 focus:border-apple-primary transition-all bg-gray-50/50"
                  disabled={!serverStatus.ready || isSubmitting}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-[12px]"
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>

            {/* Quality Selector */}
            <div>
              <label className="block text-[14px] font-semibold text-apple-ink mb-2">
                다운로드 해상도 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {QUALITY_OPTIONS.map((opt) => {
                  const isSelected = quality === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!serverStatus.ready || isSubmitting}
                      onClick={() => setQuality(opt.value)}
                      className={`py-3 px-2 rounded-xl text-center border transition-all ${
                        isSelected
                          ? 'border-apple-primary bg-apple-primary/5 text-apple-primary shadow-xs font-semibold'
                          : 'border-gray-200 bg-white text-apple-ink hover:border-gray-300'
                      } ${!serverStatus.ready ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-[14px] leading-tight">{opt.label}</div>
                      <div className="text-[11px] text-apple-ink-muted-80 mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Folder Selection & Download Button Row */}
            <div className="pt-2 border-t border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Storage Folder Display */}
              <div className="flex-1 flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200/70">
                <HardDrive size={18} className="text-apple-ink-muted-80 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-apple-ink-muted-80 uppercase tracking-wider font-semibold">저장 위치</div>
                  <div className="text-[13px] font-mono text-apple-ink truncate" title={serverStatus.folder || '로컬 서버 기본 폴더'}>
                    {serverStatus.folder || '기본 다운로드 폴더'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  disabled={!serverStatus.ready || isChoosingFolder || isSubmitting}
                  className="apple-utility-button whitespace-nowrap text-[12px] px-3 py-1.5 flex items-center gap-1.5 flex-shrink-0"
                  title="저장 폴더 변경"
                >
                  <Folder size={14} />
                  <span>{isChoosingFolder ? '폴더 선택 중...' : '폴더 변경'}</span>
                </button>
              </div>

              {/* Submit Download Button */}
              <button
                type="submit"
                disabled={!serverStatus.ready || isSubmitting || !url.trim()}
                className={`apple-pill-button py-3.5 px-8 text-[15px] flex items-center justify-center gap-2 whitespace-nowrap ${
                  !serverStatus.ready || !url.trim() || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>작업 등록 중...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>다운로드 시작</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-600 text-[13px] flex items-center gap-2 border border-red-200/60">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="flex-1">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-700 text-[12px] underline"
                >
                  닫기
                </button>
              </div>
            )}

            {/* Permission & Copyright Notice */}
            <div className="flex items-start gap-2 text-[12px] text-apple-ink-muted-80 leading-normal pt-1">
              <Info size={14} className="mt-0.5 flex-shrink-0 opacity-70" />
              <span>다운로드·사용 권한이 있는 영상을 저장하세요.</span>
            </div>
          </form>
        </div>

        {/* Jobs List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[20px] font-semibold text-apple-ink flex items-center gap-2">
              <span>작업 목록</span>
              <span className="text-[14px] font-normal text-apple-ink-muted-80">({jobs.length})</span>
            </h3>
            {jobs.length > 0 && (
              <button
                onClick={fetchJobs}
                className="apple-utility-button text-[12px] px-2.5 py-1 flex items-center gap-1"
                title="목록 새로고침"
              >
                <RefreshCw size={12} />
                <span>새로고침</span>
              </button>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white/60 border border-black/5 rounded-2xl py-12 text-center text-apple-ink-muted-80">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-[15px]">아직 진행된 다운로드 작업이 없습니다.</p>
              <p className="text-[12px] text-apple-ink-muted-80 mt-1">상단에서 유튜브 링크를 입력하거나 검색 결과의 '다운로드' 버튼을 누르세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isLoadingAction = actionLoadingJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-black/5 transition-all hover:border-gray-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      {/* URL & File info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {renderStatusBadge(job.status)}
                        </div>
                        <h4 className="text-[14px] font-medium text-apple-ink truncate" title={job.file || job.url}>
                          {job.file || job.url}
                        </h4>
                        {/* URL display if file exists */}
                        {job.file && (
                          <div className="text-[11px] text-apple-ink-muted-80 truncate font-mono mt-0.5" title={job.url}>
                            {job.url}
                          </div>
                        )}
                        {/* Folder display (job-specific folder preserved) */}
                        {job.folder && (
                          <div className="text-[11px] text-apple-ink-muted-80 flex items-center gap-1 mt-1 truncate" title={job.folder}>
                            <Folder size={11} className="flex-shrink-0" />
                            <span className="truncate">{job.folder}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        {/* Cancel button for active jobs */}
                        {(job.status === 'queued' || job.status === 'downloading' || job.status === 'processing') && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            disabled={isLoadingAction}
                            className="apple-utility-button text-[12px] px-3 py-1.5 flex items-center gap-1.5 text-red-600 hover:bg-red-50"
                            title="작업 취소"
                          >
                            <XCircle size={14} />
                            <span>취소</span>
                          </button>
                        )}

                        {/* Open folder button for completed jobs */}
                        {job.status === 'completed' && (
                          <button
                            onClick={() => handleOpenFolder(job.id)}
                            disabled={isLoadingAction}
                            className="apple-utility-button text-[12px] px-3 py-1.5 flex items-center gap-1.5 text-apple-primary hover:bg-apple-parchment"
                            title="완료 폴더 열기"
                          >
                            <FolderOpen size={14} />
                            <span>폴더 열기</span>
                          </button>
                        )}

                        {/* Retry button for failed or cancelled jobs */}
                        {(job.status === 'failed' || job.status === 'cancelled') && (
                          <button
                            onClick={() => handleRetryJob(job)}
                            disabled={isLoadingAction || !serverStatus.ready}
                            className="apple-utility-button text-[12px] px-3 py-1.5 flex items-center gap-1.5"
                            title="재시도"
                          >
                            <RotateCcw size={14} />
                            <span>재시도</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Details */}
                    {job.status === 'processing' ? (
                      /* Indeterminate progress bar for processing state */
                      <div className="space-y-1.5 mt-2">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden relative">
                          <div className="h-full bg-apple-primary rounded-full w-2/5 animate-pulse" />
                        </div>
                        <div className="flex justify-between text-[11px] text-apple-ink-muted-80">
                          <span>영상·음성 병합 중...</span>
                          {job.detail && <span className="font-mono">{job.detail}</span>}
                        </div>
                      </div>
                    ) : job.status === 'downloading' ? (
                      /* Real progress bar 0..100 */
                      <div className="space-y-1.5 mt-2">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-apple-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(Math.max(job.progress || 0, 0), 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-apple-ink-muted-80">
                          <span className="font-semibold text-apple-ink">{job.progress || 0}%</span>
                          {job.detail && <span className="font-mono">{job.detail}</span>}
                        </div>
                      </div>
                    ) : job.status === 'completed' ? (
                      <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden mt-1">
                        <div className="bg-emerald-500 h-full w-full" />
                      </div>
                    ) : job.status === 'failed' ? (
                      <div className="mt-2 text-[12px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 font-mono">
                        {job.error || '다운로드 실패 (알 수 없는 오류)'}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

function renderStatusBadge(status: DownloadJob['status']) {
  switch (status) {
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
          <Clock size={11} />
          대기 중
        </span>
      );
    case 'downloading':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700">
          <Loader2 size={11} className="animate-spin" />
          다운로드 중
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700">
          <Loader2 size={11} className="animate-spin" />
          병합 중
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
          <CheckCircle2 size={11} />
          완료
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700">
          <AlertCircle size={11} />
          실패
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-500">
          <XCircle size={11} />
          취소됨
        </span>
      );
    default:
      return null;
  }
}

export default DownloadSection;
