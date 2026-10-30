# YouTube Lemon

검색어로 유튜브 영상을 분석하고, 검색 결과 또는 직접 입력한 링크의 영상을 내 Windows PC에 MP4로 저장합니다.

## PC 실행

Node.js LTS, yt-dlp, FFmpeg가 필요합니다. 이 PC에서는 세 프로그램을 확인했습니다.

1. 저장소를 내려받습니다.
2. `실행.cmd`를 더블클릭합니다. 처음에는 npm 의존성을 설치합니다.
3. `http://127.0.0.1:4317`을 엽니다. 실행 창을 닫으면 앱도 종료됩니다.
4. 영상 링크 입력 → 화질·저장 폴더 선택 → 다운로드 순서로 사용합니다.

기본 저장 위치는 사용자 폴더 아래 `Downloads/YouTube Lemon`입니다. 폴더를 바꿔도 이미 시작한 작업의 저장 위치는 바뀌지 않습니다. 영상·음성을 각각 받은 뒤 MP4로 병합하므로 진행률이 두 번 표시될 수 있습니다. 취소 시 이어받기용 `.part` 파일이 남을 수 있으며, 기존 파일은 덮어쓰지 않습니다.

다른 PC에 도구가 없다면 아래 공식 설치 경로를 사용합니다.

```powershell
python -m pip install -U "yt-dlp[default]"
winget install Gyan.FFmpeg
```

Node.js: https://nodejs.org/ · yt-dlp: https://github.com/yt-dlp/yt-dlp · FFmpeg: https://ffmpeg.org/

## 기존 웹앱 연결

원본 프로젝트: https://aistudio.google.com/apps/b557837d-6385-4606-82fb-8adbdbf0ad1c

PC 실행 창을 열어 둔 상태에서 `https://youtubelemon.ai.studio` 다운로드 화면이 로컬 서버로 요청합니다. 브라우저에 로컬 네트워크 접근 요청이 나오면 허용해야 합니다. 브라우저나 AI Studio 미리보기 iframe 정책으로 제한되면 PC 로컬 주소에서 사용합니다. PC 프로그램이 꺼져 있으면 다운로드할 수 없습니다. 클라우드 서버에서 PC 폴더에 직접 저장하지 않습니다.

PC 서버는 `127.0.0.1`에만 바인딩합니다. 다운로드 API는 로컬 화면과 지정한 공개 앱 출처만 허용하며 외부 사이트 요청을 거부합니다. 공개 웹서버로 노출하는 용도가 아닙니다.

## 검색·분석과 로그인

검색에는 YouTube Data API 키, AI 분석에는 Gemini API 키가 필요합니다. 앱 설정 또는 `.env`의 `YOUTUBE_API_KEY`, `GEMINI_API_KEY`에 본인 키를 설정합니다. 키를 Git에 커밋하지 마세요. 기존 클라우드의 환경변수와 브라우저 저장값은 PC 앱으로 자동 복사되지 않습니다.

Google 로그인·Sheets 저장은 기존 Firebase 설정을 사용합니다. localhost/127.0.0.1의 로그인 허용 도메인에 따라 제한될 수 있습니다. 이 작업에서는 계정·공유 권한을 변경하지 않습니다. 다운로드 자체에는 Google 로그인이나 API 키가 필요하지 않습니다.

## 개발·버전

```powershell
npm ci
npm run dev
npm run lint
npm test
npm run build
```

`npm start`는 빌드 후 `NODE_ENV=production`에서 사용합니다. `PORT`, `DOWNLOAD_DIR`, `YT_DLP_PATH`, `FFMPEG_PATH`, `WEB_APP_ORIGIN`으로 환경을 지정할 수 있습니다. 기본 포트는 4317, 기본 허용 공개 출처는 `https://youtubelemon.ai.studio`입니다.

변경·복원 방법은 [CHANGELOG.md](CHANGELOG.md)에 있습니다. `v1.0.0`은 내려받은 원본, `v1.1.0`은 다운로드 기능 버전입니다. 공개 앱 게시·업데이트는 코드 커밋과 별개입니다.

다운로드·사용 권한이 있는 영상을 대상으로 사용하세요. 제한 영상, 라이브, 지역 제한 또는 YouTube 변경으로 실패할 수 있습니다. 실제 실패는 오류로 표시하며, yt-dlp를 업데이트한 뒤 재시도할 수 있습니다.
