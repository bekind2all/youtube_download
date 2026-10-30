import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

  // Fetch jobs list
  const fetchJobs = async () => {
    try {
      const list = await getDownloadJobs();
      setJobs(list);
    } catch {
      // Keep existing list on transient poll network error
    }
  };

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, []);

  // Polling for jobs every 1.5 seconds when server is ready or active jobs exist
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

  // Handle open completed folder
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
    <section id="download-section" className="bg-apple-canvas apple-section px-6 border-t border-gray-100">
      <div className="max-w-[980px] mx-auto">
        {/* Header - Matches Search Section typography & spacing */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-[44px] md:text-[56px] font-semibold leading-[1.07] apple-tracking-tight mb-4">
            영상 다운로드.
          </h2>
          <p className="text-[20px] md:text-[24px] font-light leading-[1.5] text-apple-ink-muted-80">
            유튜브 영상 링크를 넣고 원하는 화질로 내 PC에 저장하세요.
          </p>
        </div>

        {/* Compact Form Frame - Matches SearchForm visual language */}
        <div className="w-full">
          <form
            onSubmit={handleSubmitJob}
            className="bg-apple-canvas rounded-[18px] border border-gray-200 p-6 flex flex-col gap-5"
          >
            {/* First Row: Link Pill Input & Blue Pill Action Button */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <label htmlFor="video-url-input" className="sr-only">
                  유튜브 영상 링크
                </label>
                <input
                  id="video-url-input"
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="유튜브 영상 링크를 입력하세요..."
                  className="w-full bg-apple-parchment rounded-full px-5 py-3 text-[17px] text-apple-ink focus:outline-none focus:ring-2 focus:ring-apple-primary-focus transition-all placeholder:text-apple-ink-muted-48"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!serverStatus.ready || isSubmitting || !url.trim()}
                className="apple-pill-button whitespace-nowrap px-8 py-3 w-full md:w-auto disabled:opacity-50"
              >
                {isSubmitting ? '요청 중...' : '다운로드'}
              </button>
            </div>

            {/* Second Row: Compact Secondary Controls */}
            <div className="flex flex-wrap items-center gap-4 text-[14px]">
              {/* Quality Select */}
              <div className="flex items-center gap-2">
                <label htmlFor="quality-select" className="text-apple-ink-muted-80 whitespace-nowrap">
                  화질:
                </label>
                <select
                  id="quality-select"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as DownloadQuality)}
                  className="bg-transparent border-none text-apple-primary font-medium focus:outline-none cursor-pointer"
                  disabled={isSubmitting}
                >
                  <option value="best">최고 화질</option>
                  <option value="2160">4K (2160p)</option>
                  <option value="1440">1440p (QHD)</option>
                  <option value="1080">1080p (FHD)</option>
                  <option value="720">720p (HD)</option>
                  <option value="480">480p (SD)</option>
                </select>
              </div>

              <div className="w-[1px] h-4 bg-gray-200" aria-hidden="true" />

              {/* Storage Folder Display & Change Button */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-apple-ink-muted-80 whitespace-nowrap">저장 위치:</span>
                <span
                  className="text-apple-ink font-mono text-[13px] truncate max-w-[200px] sm:max-w-[340px]"
                  title={serverStatus.folder || '기본 다운로드 폴더'}
                >
                  {serverStatus.folder || '기본 다운로드 폴더'}
                </span>
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  disabled={!serverStatus.ready || isChoosingFolder || isSubmitting}
                  className="text-apple-primary hover:underline font-medium text-[13px] whitespace-nowrap disabled:opacity-50 ml-1"
                >
                  {isChoosingFolder ? '선택 중...' : '폴더 변경'}
                </button>
              </div>
            </div>
          </form>

          {/* PC Connection Indicator beneath form */}
          <div className="mt-3 px-1 text-[13px]">
            {serverStatus.ready ? (
              <div className="flex items-center justify-between text-apple-ink-muted-80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>PC 연결됨</span>
                </div>
                <button
                  type="button"
                  onClick={checkStatus}
                  disabled={isCheckingStatus}
                  className="text-apple-ink-muted-48 hover:text-apple-primary transition-colors text-[12px]"
                >
                  {isCheckingStatus ? '확인 중...' : '연결 확인'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-apple-ink-muted-80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                  <span>PC 다운로드 앱을 실행한 뒤 연결 확인을 누르세요. 브라우저에서 로컬 네트워크 접근 요청이 나오면 허용해 주세요.</span>
                </div>
                <button
                  type="button"
                  onClick={checkStatus}
                  disabled={isCheckingStatus}
                  className="text-apple-primary hover:underline font-medium text-[13px] whitespace-nowrap self-start sm:self-auto"
                >
                  {isCheckingStatus ? '확인 중...' : '연결 확인'}
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-2 text-red-600 flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-700 text-[12px] underline ml-2"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Jobs Section */}
        <div className="mt-14">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-[17px] font-semibold text-apple-ink">
              작업 목록 <span className="font-normal text-apple-ink-muted-48 text-[14px]">({jobs.length})</span>
            </h3>
            {jobs.length > 0 && (
              <button
                type="button"
                onClick={fetchJobs}
                className="text-apple-ink-muted-48 hover:text-apple-primary text-[13px] transition-colors"
              >
                새로고침
              </button>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="py-12 text-center text-apple-ink-muted-48 text-[14px]">
              진행 중이거나 완료된 다운로드 작업이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const isLoadingAction = actionLoadingJobId === job.id;
                // Extract filename only (last path segment) or fallback to url
                const filename = job.file
                  ? job.file.split(/[/\\]/).filter(Boolean).pop() || job.file
                  : job.url;

                return (
                  <div key={job.id} className="py-4">
                    {/* Main Row: Filename + Status + Action Text Button */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="font-medium text-[15px] text-apple-ink truncate max-w-full"
                            title={job.file || job.url}
                          >
                            {filename}
                          </span>
                          {/* Compact Status Indicator */}
                          {job.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600 font-medium whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              완료
                            </span>
                          )}
                          {job.status === 'downloading' && (
                            <span className="text-[12px] text-apple-primary font-medium whitespace-nowrap">
                              {job.progress || 0}% 다운로드 중
                            </span>
                          )}
                          {job.status === 'processing' && (
                            <span className="text-[12px] text-purple-600 font-medium whitespace-nowrap">
                              인코딩 처리 중
                            </span>
                          )}
                          {job.status === 'queued' && (
                            <span className="text-[12px] text-apple-ink-muted-48 whitespace-nowrap">
                              대기 중
                            </span>
                          )}
                          {job.status === 'failed' && (
                            <span className="text-[12px] text-red-600 font-medium whitespace-nowrap">
                              실패
                            </span>
                          )}
                          {job.status === 'cancelled' && (
                            <span className="text-[12px] text-apple-ink-muted-48 whitespace-nowrap">
                              취소됨
                            </span>
                          )}
                        </div>

                        {/* Secondary Line: Folder (full path in title) */}
                        {job.folder && (
                          <div
                            className="text-[12px] text-apple-ink-muted-48 truncate mt-1"
                            title={job.folder}
                          >
                            저장: {job.folder}
                          </div>
                        )}
                        {job.error && (
                          <div className="text-[12px] text-red-500 mt-1">
                            {job.error}
                          </div>
                        )}
                      </div>

                      {/* Right Action Text Button */}
                      <div className="flex-shrink-0 text-right pt-0.5">
                        {job.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleOpenFolder(job.id)}
                            disabled={isLoadingAction}
                            className="text-apple-primary hover:underline text-[13px] disabled:opacity-50"
                          >
                            폴더 열기
                          </button>
                        )}
                        {(job.status === 'queued' || job.status === 'downloading' || job.status === 'processing') && (
                          <button
                            type="button"
                            onClick={() => handleCancelJob(job.id)}
                            disabled={isLoadingAction}
                            className="text-apple-ink-muted-48 hover:text-red-600 hover:underline text-[13px] disabled:opacity-50"
                          >
                            취소
                          </button>
                        )}
                        {(job.status === 'failed' || job.status === 'cancelled') && (
                          <button
                            type="button"
                            onClick={() => handleRetryJob(job)}
                            disabled={isLoadingAction || !serverStatus.ready}
                            className="text-apple-primary hover:underline text-[13px] disabled:opacity-50"
                          >
                            재시도
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar for active downloads */}
                    {job.status === 'downloading' && (
                      <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden mt-2.5">
                        <div
                          className="bg-apple-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(Math.max(job.progress || 0, 0), 100)}%` }}
                        />
                      </div>
                    )}
                    {job.status === 'processing' && (
                      <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden mt-2.5 relative">
                        <div className="bg-apple-primary h-full rounded-full w-2/5 animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Notice */}
        <p className="text-[12px] text-apple-ink-muted-48 text-center mt-12">
          다운로드·사용 권한이 있는 영상을 저장하세요.
        </p>
      </div>
    </section>
  );
});

export default DownloadSection;
