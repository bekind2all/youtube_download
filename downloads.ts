import type { Express, Request, Response, NextFunction } from 'express';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';

export function youtubeUrl(input: unknown): string {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('유튜브 영상 링크를 입력하세요.');
  const url = new URL(input.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('https 유튜브 링크만 사용할 수 있습니다.');
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|live|embed)\/([^/]+)/.exec(url.pathname)?.[1] || null;
  }
  if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('올바른 유튜브 개별 영상 링크를 입력하세요.');
  return `https://www.youtube.com/watch?v=${id}`;
}

export function formatSelector(quality: string): string {
  if (!['best', '2160', '1440', '1080', '720', '480'].includes(quality)) throw new Error('화질을 다시 선택하세요.');
  const limit = quality === 'best' ? '' : `[height<=${quality}]`;
  return `bv*${limit}[ext=mp4]+ba[ext=m4a]/b${limit}[ext=mp4]/bv*${limit}+ba/b${limit}`;
}

type Job = { id: string; url: string; status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled'; progress: number; detail: string; file?: string; folder: string; createdAt: number; error?: string; child?: ChildProcess };
const jobs = new Map<string, Job>();
let selectedFolder = path.resolve(process.env.DOWNLOAD_DIR || path.join(homedir(), 'Downloads', 'YouTube Lemon'));
let selecting = false;
const binary = () => process.env.YT_DLP_PATH || 'yt-dlp';
const publicJob = ({ child, ...job }: Job) => job;

function localOnly(req: Request, res: Response, next: NextFunction) {
  const address = req.socket.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return res.status(403).json({ error: '다운로드는 이 PC에서만 사용할 수 있습니다.' });
  // The local process must not be controllable by arbitrary websites or DNS rebinding.
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) return res.status(403).json({ error: '로컬 주소로 접속하세요.' });
  const origin = req.headers.origin;
  const webOrigin = process.env.WEB_APP_ORIGIN || 'https://youtubelemon.ai.studio';
  if (origin && origin !== `http://${req.headers.host}` && origin !== webOrigin) return res.status(403).json({ error: '허용되지 않은 요청입니다.' });
  if (origin === webOrigin) {
    res.setHeader('Access-Control-Allow-Origin', webOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

function runTool(command: string, args: string[], timeout = 10000): Promise<string> {
  return new Promise((resolve, reject) => execFile(command, args, { timeout, windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout) => error ? reject(error) : resolve(stdout.trim())));
}

function schedule() {
  if ([...jobs.values()].some(j => j.child || j.status === 'downloading' || j.status === 'processing')) return;
  const job = [...jobs.values()].find(j => j.status === 'queued');
  if (!job) return;
  job.status = 'downloading';
  job.detail = '영상 정보 확인 중';
  const child = spawn(binary(), [
    '--ignore-config', '--encoding', 'utf-8', '--js-runtimes', 'node', '--no-playlist', '--no-overwrites', '--windows-filenames', '--trim-filenames', '160',
    '--newline', '--progress', '--progress-template', 'download:LEMON_PROGRESS:%(progress)j',
    '--print', 'after_move:LEMON_FILE:%(filepath)s', '--no-simulate',
    '--socket-timeout', '30', '--retries', '3', '--fragment-retries', '3',
    ...(process.env.FFMPEG_PATH ? ['--ffmpeg-location', process.env.FFMPEG_PATH] : []),
    '-f', (job as Job & { format: string }).format,
    '--merge-output-format', 'mp4', '--remux-video', 'mp4',
    '-P', job.folder, '-o', '%(title)s [%(id)s].%(ext)s', '--', job.url,
  ], { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  job.child = child;
  let buffer = '';
  let errors = '';
  let settled = false;
  // A stalled extractor must not hold the queue forever.
  const timer = setTimeout(() => { job.error = '다운로드 시간이 초과되었습니다. 다시 시도하세요.'; child.kill(); }, 4 * 60 * 60 * 1000);
  const finish = (code: number | null, error?: Error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    delete job.child;
    if (job.status !== 'cancelled') {
      if (code === 0 && job.file) { job.status = 'completed'; job.progress = 100; job.detail = 'PC에 저장 완료'; }
      else { job.status = 'failed'; job.error ||= error ? 'yt-dlp를 실행할 수 없습니다. PC 실행 안내를 확인하세요.' : errors || '저장에 실패했습니다. 영상 공개 여부와 yt-dlp 업데이트를 확인하세요.'; }
    }
    schedule();
  };
  const line = (value: string) => {
    if (value.startsWith('LEMON_FILE:')) {
      const file = path.resolve(value.slice(11).trim());
      if (path.dirname(file) === path.resolve(job.folder)) job.file = file;
    } else if (value.startsWith('LEMON_PROGRESS:')) {
      try {
        const progress = JSON.parse(value.slice(15));
        const total = progress.total_bytes || progress.total_bytes_estimate;
        job.progress = total ? Math.min(99, Math.max(0, Math.round(progress.downloaded_bytes / total * 100))) : 0;
        job.detail = progress.status === 'finished' ? '영상·음성 확인 및 MP4 병합 중' : `영상·음성 다운로드 중${progress.speed ? ` · ${(progress.speed / 1048576).toFixed(1)} MB/s` : ''}${progress.eta ? ` · 약 ${Math.ceil(progress.eta)}초` : ''}`;
        if (progress.status === 'finished') job.status = 'processing';
        else job.status = 'downloading';
      } catch { /* yt-dlp may print informational messages alongside progress. */ }
    }
  };
  child.stdout?.on('data', chunk => { buffer += chunk.toString(); const lines = buffer.split(/\r?\n/); buffer = lines.pop() || ''; lines.forEach(line); });
  child.stderr?.on('data', chunk => {
    const message = chunk.toString();
    if (message.includes('ERROR:')) errors = message.replace(/\u001b\[[0-9;]*m/g, '').trim().slice(-1200);
  });
  child.once('error', error => finish(null, error));
  child.once('close', code => { if (buffer) line(buffer); finish(code); });
}

export function attachDownloads(app: Express) {
  app.use('/api/downloads', localOnly);
  app.get('/api/downloads/status', async (_req, res) => {
    const [yt, ffmpeg] = await Promise.allSettled([runTool(binary(), ['--version']), runTool(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'])]);
    res.json({ ready: yt.status === 'fulfilled' && ffmpeg.status === 'fulfilled', ytDlp: yt.status === 'fulfilled' ? yt.value : null, ffmpeg: ffmpeg.status === 'fulfilled', folder: selectedFolder, platform: process.platform });
  });
  app.post('/api/downloads/folder', async (_req, res) => {
    if (process.platform !== 'win32') return res.status(400).json({ error: '폴더 선택 창은 Windows에서 지원합니다.' });
    if (selecting) return res.status(409).json({ error: '이미 열린 폴더 선택 창에서 폴더를 선택하세요.' });
    selecting = true;
    try {
      const script = 'Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = "YouTube Lemon"; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); Write-Output $dialog.SelectedPath }; $dialog.Dispose()';
      const folder = await runTool('powershell.exe', ['-NoProfile', '-STA', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], 180000);
      if (folder) { await access(folder); selectedFolder = folder; }
      res.json({ folder: selectedFolder, cancelled: !folder });
    } catch { res.status(500).json({ error: '폴더 선택 창을 열지 못했습니다. 다시 시도하세요.' }); }
    finally { selecting = false; }
  });
  app.get('/api/downloads/jobs', (_req, res) => res.json([...jobs.values()].map(publicJob).reverse()));
  app.post('/api/downloads/jobs', async (req, res) => {
    try {
      const url = youtubeUrl(req.body.url);
      const format = formatSelector(req.body.quality || 'best');
      if ([...jobs.values()].filter(j => ['queued', 'downloading', 'processing'].includes(j.status)).length >= 20) return res.status(429).json({ error: '대기 중인 다운로드가 많습니다. 완료 후 추가하세요.' });
      const duplicate = [...jobs.values()].find(j => j.url === url && ['queued', 'downloading', 'processing'].includes(j.status));
      if (duplicate) return res.status(409).json({ error: '이미 다운로드 중이거나 대기 중인 영상입니다.' });
      await mkdir(selectedFolder, { recursive: true });
      const job = { id: randomUUID(), url, format, folder: selectedFolder, status: 'queued' as const, progress: 0, detail: '순서 대기 중', createdAt: Date.now() };
      // Bound memory without removing any saved videos.
      for (const [id, entry] of jobs) if (!entry.child && entry.status !== 'queued' && jobs.size >= 100) jobs.delete(id);
      jobs.set(job.id, job);
      schedule();
      res.status(201).json(publicJob(job));
    } catch (error: any) { res.status(400).json({ error: error.message || '요청을 확인하세요.' }); }
  });
  app.post('/api/downloads/jobs/:id/cancel', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: '다운로드를 찾을 수 없습니다.' });
    if (!['queued', 'downloading', 'processing'].includes(job.status)) return res.status(409).json({ error: '이미 종료된 다운로드입니다.' });
    job.status = 'cancelled'; job.detail = '취소됨';
    if (job.child?.pid && process.platform === 'win32') {
      // Stop ffmpeg children as well, before starting the next queued download.
      execFile('taskkill', ['/PID', String(job.child.pid), '/T', '/F'], { windowsHide: true }, () => {});
    } else job.child?.kill();
    if (!job.child) schedule();
    res.json(publicJob(job));
  });
  app.post('/api/downloads/jobs/:id/open', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job?.file || job.status !== 'completed') return res.status(400).json({ error: '저장 완료 후 열 수 있습니다.' });
    if (process.platform === 'win32') {
      execFile('explorer.exe', [job.folder], { windowsHide: true }, () => {});
      return res.json({ ok: true });
    }
    res.status(400).json({ error: 'Windows에서 폴더를 열 수 있습니다.' });
  });
}
