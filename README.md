# NewCowAnalytics 🐮📊

NewCowAnalytics는 유튜브 채널과 인스타그램 계정의 성장 추세, 사용자 반응(Engagement), 그리고 AI를 활용한 훅(Hook) 분석 기능을 제공하는 종합 소셜 미디어 분석 대시보드입니다.

## 🛠️ 필수 설치 항목 및 환경 설정 (Prerequisites)

이 프로젝트를 로컬에서 온전히 실행하고 AI 기능을 사용하기 위해서는 다음 프로그램과 파일들이 필요합니다.

### 1. 프로그래밍 언어 및 런타임
- **Java 17+**: 백엔드 (Spring Boot) 서버 실행을 위해 필요합니다.
- **Node.js (v18 이상 권장)**: 프론트엔드 (React + Vite) 서버 실행 및 패키지 관리를 위해 필요합니다.
- **Python 3.10+**: AI 영상 분석 스크립트 실행을 위해 필요합니다. (Python 설치 후 `google-genai` 패키지 설치 필요)
  ```bash
  pip install google-genai
  ```

### 2. 영상 처리용 외부 실행 파일 (.exe)
용량 문제로 GitHub에 업로드되지 않은 영상 처리 핵심 도구들을 직접 다운로드하여 `ai/` 폴더에 배치해야 합니다.
- [yt-dlp.exe](https://github.com/yt-dlp/yt-dlp/releases) : 유튜브 및 인스타그램 영상 다운로더
- [ffmpeg.exe](https://ffmpeg.org/download.html) : 영상/오디오 인코딩 및 추출 도구

**파일 배치 구조:**
```text
NewCowAnalytics/
 ├── ai/
 │    ├── ai_analyzer.py
 │    ├── yt-dlp.exe (직접 다운로드 필요)
 │    └── ffmpeg.exe (직접 다운로드 필요)
```

### 3. API 키 설정 (Environment Variables)
`backend/src/main/resources/application.yml` 파일 또는 시스템 환경 변수를 통해 다음 API 키들을 입력해야 합니다.
- `YOUTUBE_API_KEY`: 유튜브 데이터 API 키
- `GEMINI_API_KEY`: Google Gemini AI API 키

---

## 🚀 주요 기능 (Features)

웹 페이지에 접속하면 다음과 같은 작업들을 수행할 수 있습니다.

### 1. 채널/계정 검색 및 기본 데이터 시각화
- 홈 화면 상단 검색바를 통해 유튜브 채널명(예: `@mrbeast`)을 검색할 수 있습니다.
- 채널의 최근 200개 영상 데이터를 불러와 조회수, 좋아요, 댓글 등의 인게이지먼트를 차트로 한눈에 보여줍니다.
- 최근 50개 포스트와 과거 포스트의 인게이지먼트 **중앙값(Median)**을 비교하여 정확한 성장률을 계산합니다.

### 2. 최상위 훅(Top Hooks) 분석
- 채널 내 조회수 최상위 영상 3개를 나란히 띄워줍니다.
- 마우스를 올리면(Hover) 영상이 자동으로 재생되어 시청자를 사로잡은 초반 3초 훅(Hook)을 비교 분석할 수 있습니다.

### 3. AI 총평 분석 (Channel Trend Analysis)
- `AI 분석하기` 버튼을 누르면 Gemini AI가 채널의 전반적인 성장세(상승세/하락세/정체기)와 그 원인, 주요 흥행 요인, 전략적 조언을 정리해 줍니다.

### 4. 개별 영상 AI 심층 분석 (Video Specific Analysis)
- 영상 목록에서 특정 영상을 클릭하면 모달 창이 열립니다.
- 여기서 영상별 `AI 분석`을 실행하면, 해당 영상의 숏폼/롱폼 여부에 맞춰 오디오와 영상을 추출한 뒤 Gemini AI가 **시각적/청각적/서사적 후킹 요소와 감정 자극 포인트, 그리고 개선점**을 심도 있게 분석해 줍니다.

---

## 🤖 AI 모델 변경 가이드 (How to change the AI Model)

기본적으로 `gemini-3.5-flash` 모델을 사용하도록 하드코딩되어 있습니다. 만약 더 고성능 모델(예: `gemini-1.5-pro` 등)로 변경하고 싶다면 다음 과정을 따르세요.

1. `ai/ai_analyzer.py` 파일을 에디터로 엽니다.
2. `client.models.generate_content` 함수가 호출되는 라인을 찾습니다. (파일 내 2곳 존재)
   - `analyze_video` 함수 내부
   - `analyze_channel` 함수 내부
3. 해당 라인의 `model='gemini-3.5-flash'` 부분을 원하는 모델 이름으로 변경합니다.
   ```python
   # 변경 전
   response = client.models.generate_content(model='gemini-3.5-flash', ...)
   
   # 변경 후
   response = client.models.generate_content(model='gemini-1.5-pro', ...)
   ```
4. 파일을 저장한 후 서버에서 AI 분석을 다시 실행하면 즉시 변경된 모델이 적용됩니다. (서버 재시작 불필요)
