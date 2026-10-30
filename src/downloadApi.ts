import { DownloadJob, DownloadQuality, LocalServerStatus } from './types';

const DOWNLOAD_API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? `${window.location.origin}/api/downloads`
  : 'http://127.0.0.1:4317/api/downloads';

const DEFAULT_TIMEOUT_MS = 10000; // 10초
const FOLDER_TIMEOUT_MS = 190000; // 190초

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`요청 시간이 초과되었습니다 (${timeoutMs / 1000}초).`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

async function handleResponseJson<T>(response: Response): Promise<T> {
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const errorMsg = data?.error || `서버 오류 (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * 로컬 다운로드 서버 연결 상태 확인
 * GET /status -> { ready, ytDlp, ffmpeg, folder, platform }
 */
export async function getLocalServerStatus(): Promise<LocalServerStatus> {
  try {
    const res = await fetchWithTimeout(`${DOWNLOAD_API_BASE}/status`, {
      method: 'GET',
    }, DEFAULT_TIMEOUT_MS);
    return await handleResponseJson<LocalServerStatus>(res);
  } catch (err: any) {
    return {
      ready: false,
    };
  }
}

/**
 * Windows 폴더 선택 대화상자 호출
 * POST /folder body={} -> { folder, cancelled } (타임아웃 190초)
 */
export async function chooseLocalFolder(): Promise<{ folder: string; cancelled?: boolean }> {
  const res = await fetchWithTimeout(`${DOWNLOAD_API_BASE}/folder`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, FOLDER_TIMEOUT_MS);

  return await handleResponseJson<{ folder: string; cancelled?: boolean }>(res);
}

/**
 * 새 다운로드 작업 등록
 * POST /jobs body={ url, quality } -> job (HTTP 201)
 */
export async function createDownloadJob(url: string, quality: DownloadQuality): Promise<DownloadJob> {
  const res = await fetchWithTimeout(`${DOWNLOAD_API_BASE}/jobs`, {
    method: 'POST',
    body: JSON.stringify({ url, quality }),
  }, DEFAULT_TIMEOUT_MS);

  return await handleResponseJson<DownloadJob>(res);
}

/**
 * 전체 다운로드 작업 목록 조회
 * GET /jobs -> job[] (최신순)
 */
export async function getDownloadJobs(): Promise<DownloadJob[]> {
  const res = await fetchWithTimeout(`${DOWNLOAD_API_BASE}/jobs`, {
    method: 'GET',
  }, DEFAULT_TIMEOUT_MS);

  return await handleResponseJson<DownloadJob[]>(res);
}

/**
 * 다운로드 작업 취소
 * POST /jobs/:id/cancel body={} -> job
 */
export async function cancelDownloadJob(id: string): Promise<DownloadJob> {
  const res = await fetchWithTimeout(`${DOWNLOAD_API_BASE}/jobs/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, DEFAULT_TIMEOUT_MS);

  return await handleResponseJson<DownloadJob>(res);
}

/**
 * 작업 완료된 파일의 폴더 열기
 * POST /jobs/:id/open body={} -> { ok: true }
 */
export async function openDownloadFolder(id: string): Promise<{ ok: boolean }> {
  const res = await fetchWithTimeout(`${DOWNLOAD_API_BASE}/jobs/${encodeURIComponent(id)}/open`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, DEFAULT_TIMEOUT_MS);

  return await handleResponseJson<{ ok: boolean }>(res);
}
