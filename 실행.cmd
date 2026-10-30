@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS 설치가 필요합니다: https://nodejs.org/
  pause
  exit /b 1
)
where yt-dlp >nul 2>nul
if errorlevel 1 (
  echo yt-dlp 설치가 필요합니다. 설치 명령: python -m pip install -U "yt-dlp[default]"
  pause
  exit /b 1
)
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo FFmpeg 설치가 필요합니다. 설치 명령: winget install Gyan.FFmpeg
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo YouTube Lemon: http://127.0.0.1:4317
echo 이 창을 닫으면 앱이 종료됩니다.
start "" "http://127.0.0.1:4317"
call npm run dev
pause
