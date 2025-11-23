# Watchtek Daily Report Web

Notion 기반 일일/주간/월간 업무 보고서 자동 생성 웹 애플리케이션

## 소개

Notion 데이터베이스에서 업무 데이터를 조회하여 자동으로 보고서를 생성하고, Notion 페이지로 내보내는 웹 서비스입니다. 버튼 클릭 한 번으로 일간, 주간, 월간 보고서를 생성할 수 있습니다.

## 주요 기능

- **일간 보고서**: 오늘/내일 작업 기준 진행업무 및 예정업무 생성
- **주간 보고서**: 금주 진행 사항 요약 (매주 마지막 평일 자동 생성)
- **월간 보고서**: 월간 진행/완료 업무 요약 (매월 마지막 주 마지막 평일 자동 생성)
- **Notion 연동**: 보고서를 Notion 페이지로 자동 생성
- **공수 현황**: 인원별 공수 집계 및 시각화 (파이 차트)
- **연차/반차 정보**: 주간/월간 보고서에 휴가 정보 자동 포함

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | ShadCN UI |
| Data Fetching | @tanstack/react-query |
| Charts | Recharts |
| External API | @notionhq/client |
| Utilities | holiday-kr (한국 공휴일) |

## 시작하기

### 사전 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- Notion Integration 설정 완료

### 설치

```bash
# 저장소 클론
git clone https://github.com/uhjee/watchtek-daily-report-web.git
cd watchtek-daily-report-web

# 의존성 설치
npm install
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_REPORT_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 실행

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

브라우저에서 http://localhost:3000 접속

## 프로젝트 구조

```
src/
├── app/
│   ├── api/reports/        # API 라우트 (보고서 생성)
│   ├── reports/            # 보고서 페이지
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 홈페이지
│   └── providers.tsx       # React Query Provider
├── components/
│   ├── ui/                 # ShadCN UI 컴포넌트
│   └── GroupPieChart.tsx   # 공수 분포 차트
├── lib/
│   ├── config/             # 설정 (Notion, 멤버)
│   ├── services/           # 비즈니스 로직
│   ├── types/              # 타입 정의
│   └── utils/              # 유틸리티 함수
└── types/                  # 모듈 타입 선언
```

## 사용법

1. http://localhost:3000/reports 접속
2. **"오늘 보고서 만들기"** 버튼 클릭
3. 보고서 생성 결과 확인:
   - 웹 UI에서 진행업무/예정업무 확인
   - Notion에 생성된 보고서 페이지 확인

### 보고서 생성 규칙

| 보고서 타입 | 생성 조건 |
|------------|----------|
| 일간 | 평일 (공휴일 제외) |
| 주간 | 해당 주의 마지막 평일 (보통 금요일) |
| 월간 | 해당 월의 마지막 주 마지막 평일 |

## 멤버 설정

`src/lib/config/members.ts` 파일에서 팀원 정보를 설정합니다:

```typescript
const memberMap: { [key: string]: { name: string; priority: number } } = {
  'user@example.com': { name: '홍길동', priority: 1 },
  // priority가 낮을수록 상단에 표시
};
```

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 검사
```

## 라이선스

MIT License
