# CLAUDE.md

이 파일은 Next.js 웹 애플리케이션에서 코드 작업을 할 때 Claude Code (claude.ai/code)에게 가이드를 제공합니다.

## 프로젝트 개요

이 프로젝트는 기존 Node.js TypeScript 기반의 Notion 보고서 자동 생성 시스템을 **Next.js 15 웹 애플리케이션**으로 전환한 버전입니다.

### 원본 프로젝트
- **위치**: `/Users/uhjee/Dev/git-remote/watchtek-daily-report`
- **특징**: Cron 스케줄러 기반 자동 보고서 생성, Notion 페이지 생성
- **참고**: 원본 프로젝트의 CLAUDE.md 파일 참조

### 웹 버전 프로젝트 (현재)
- **위치**: `/Users/uhjee/Dev/git-remote/watchtek-daily-report-web`
- **특징**: 웹 UI를 통한 수동 보고서 생성 및 조회
- **목적**: 사용자가 브라우저에서 버튼 클릭으로 보고서를 생성하고 결과를 바로 확인

## 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: ShadCN UI
- **상태 관리**: Zustand
- **데이터 페칭**: @tanstack/react-query
- **알림**: Sonner (Toast)
- **외부 API**: @notionhq/client, holiday-kr

## 프로젝트 구조

```
watchtek-daily-report-web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root 레이아웃 (Providers, Toaster)
│   │   ├── page.tsx                 # 홈페이지 (보고서 페이지로 이동)
│   │   ├── providers.tsx            # React Query Provider
│   │   ├── reports/
│   │   │   └── page.tsx            # 보고서 생성 및 조회 페이지
│   │   └── api/
│   │       └── reports/
│   │           └── route.ts        # POST /api/reports 엔드포인트
│   ├── lib/
│   │   ├── config/
│   │   │   ├── members.ts          # 멤버 매핑 설정 (원본에서 복사)
│   │   │   └── notion.ts           # Notion 클라이언트 설정
│   │   ├── services/
│   │   │   ├── notionApiService.ts # Notion API 조회 서비스
│   │   │   └── reportService.ts    # 보고서 생성 및 데이터 처리 서비스
│   │   ├── types/
│   │   │   └── report.d.ts         # 보고서 관련 타입 정의
│   │   └── utils/
│   │       └── dateUtils.ts        # 날짜 유틸리티 (원본에서 복사)
│   ├── components/
│   │   └── ui/                     # ShadCN UI 컴포넌트
│   └── types/
│       └── holiday-kr.d.ts         # holiday-kr 모듈 타입 선언
├── .env.local                       # 환경 변수
└── package.json
```

## 환경 설정

### 필수 환경 변수 (.env.local)

```env
NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_REPORT_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 멤버 설정 (src/lib/config/members.ts)

```typescript
const memberMap: { [key: string]: { name: string; priority: number } } = {
  'user@example.com': { name: '한국이름', priority: 1 },
  // ... 추가 멤버
};
export default memberMap;
```

## 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 실행
npm start

# 린팅
npm run lint
```

## 완료된 구현 단계

### 1단계: 프로젝트 초기 설정 ✅
- [x] Next.js 15 프로젝트 생성 (`npx create-next-app@latest`)
- [x] TypeScript, Tailwind CSS, App Router 설정
- [x] Node.js 버전 호환성 문제 해결 (Next.js 16 → 15로 다운그레이드)

### 2단계: UI 라이브러리 및 의존성 설치 ✅
- [x] ShadCN UI 초기화 (`npx shadcn@latest init`)
- [x] 필요한 컴포넌트 설치:
  - button, card, table, badge, separator, skeleton
  - sonner (toast 대체)
- [x] 핵심 패키지 설치:
  - zustand (상태 관리)
  - @tanstack/react-query (데이터 페칭)
  - @notionhq/client (Notion API)
  - holiday-kr (한국 휴일 체크)
  - zod (스키마 검증)

### 3단계: 프로젝트 구조 생성 ✅
- [x] 디렉토리 구조 생성 (`src/lib/config`, `src/lib/services`, `src/lib/types`, `src/lib/utils`)
- [x] 원본 프로젝트에서 필요한 파일 복사:
  - `members.ts` (멤버 설정)
  - `dateUtils.ts` (날짜 유틸리티)
  - `report.d.ts` (타입 정의)

### 4단계: 핵심 서비스 구현 ✅
- [x] **Notion 설정 파일** (`src/lib/config/notion.ts`)
  - Notion 클라이언트 초기화
  - 환경 변수에서 설정 로드

- [x] **NotionApiService** (`src/lib/services/notionApiService.ts`)
  - `queryDatabase()`: 데이터베이스 조회
  - `queryDatabaseAll()`: 페이지네이션 자동 처리

- [x] **ReportService** (`src/lib/services/reportService.ts`)
  - `generateDailyReport()`: 일일 보고서 생성 메인 로직
  - `fetchTodayTomorrowTasks()`: 오늘/내일 작업 조회
  - `transformNotionData()`: Notion 원본 데이터 변환
  - `groupByProjectAndSubGroup()`: 프로젝트/서브그룹별 그룹화
  - `calculateManHourSummary()`: 인원별 공수 집계 및 정렬

### 5단계: UI 구현 ✅
- [x] **Root Layout** (`src/app/layout.tsx`)
  - Providers 래퍼 추가
  - Sonner Toaster 추가
  - 한국어 설정, 메타데이터 설정

- [x] **Providers** (`src/app/providers.tsx`)
  - React Query Client 설정
  - QueryClientProvider 래퍼

- [x] **홈페이지** (`src/app/page.tsx`)
  - 보고서 페이지로 이동하는 버튼

- [x] **보고서 페이지** (`src/app/reports/page.tsx`)
  - "오늘 보고서 만들기" 버튼
  - Loading UI (Skeleton 컴포넌트)
  - Toast 알림 (성공/실패)
  - 보고서 데이터 표시:
    - 인원별 공수 테이블
    - 진행업무 카드 (그룹/서브그룹/작업 리스트)
    - 예정업무 카드

### 6단계: API 라우트 구현 ✅
- [x] **POST /api/reports** (`src/app/api/reports/route.ts`)
  - ReportService를 사용하여 실제 Notion 데이터 조회
  - 보고서 생성 및 반환
  - 에러 처리

### 7단계: 타입 안정성 및 빌드 검증 ✅
- [x] holiday-kr 모듈 타입 선언 파일 생성 (`src/types/holiday-kr.d.ts`)
- [x] TypeScript 컴파일 오류 수정:
  - `any` 타입 제거
  - Notion API 타입 호환성 문제 해결
  - unused 변수 제거
- [x] ESLint 규칙 준수
- [x] 프로덕션 빌드 성공 확인

## 원본 프로젝트와의 차이점

### 제거된 기능
- ❌ **Cron 스케줄러**: 웹에서 수동 생성만 지원
- ❌ **Notion 페이지 생성**: 조회만 수행, 페이지 생성 안 함
- ❌ **NotionPageService, NotionReportBlockService**: 페이지 생성 관련 서비스 제거
- ❌ **주간/월간 보고서**: 현재는 일일 보고서만 구현

### 간소화된 부분
- **서비스 구조**: 복잡한 Factory Pattern, Template Method Pattern 제거
- **데이터 처리**: 웹 UI에 필요한 최소한의 로직만 구현
- **타입 정의**: 필요한 타입만 선별하여 사용

### 추가된 기능
- ✅ **웹 UI**: 사용자 친화적인 보고서 생성 인터페이스
- ✅ **실시간 피드백**: Toast 알림, Loading 상태 표시
- ✅ **React Query**: 데이터 캐싱 및 상태 관리

## 남은 구현 단계

### 필수 단계

#### 8단계: 실제 Notion 데이터 테스트 🔲
- [ ] 브라우저에서 http://localhost:3000/reports 접속
- [ ] "오늘 보고서 만들기" 버튼 클릭
- [ ] Notion API 연결 확인
- [ ] 데이터 파싱 및 표시 검증
- [ ] 에러 케이스 테스트:
  - Notion API 키 오류
  - 데이터베이스 ID 오류
  - 빈 데이터 케이스
  - 네트워크 오류

### 선택적 개선사항

#### 9단계: 날짜 선택 기능 추가 🔲
- [ ] Date Picker 컴포넌트 추가 (ShadCN Calendar 활용)
- [ ] 보고서 페이지에 날짜 선택 UI 추가
- [ ] API 라우트에서 date 파라미터 처리
- [ ] 선택한 날짜에 대한 보고서 생성

#### 10단계: 주간/월간 보고서 추가 🔲
- [ ] 탭 또는 버튼으로 보고서 타입 선택 UI
- [ ] ReportService에 `generateWeeklyReport()` 메서드 추가
- [ ] ReportService에 `generateMonthlyReport()` 메서드 추가
- [ ] API 라우트에서 reportType 파라미터 처리
- [ ] 주간/월간 보고서 표시 UI 구현

#### 11단계: 에러 처리 개선 🔲
- [ ] 에러 타입별 메시지 정의
- [ ] API 응답에서 상세 에러 정보 반환
- [ ] UI에서 에러 타입별 안내 표시
- [ ] Retry 기능 추가

#### 12단계: 보고서 기록 조회 기능 🔲
- [ ] GET /api/reports 엔드포인트 구현
- [ ] Notion Report Database에서 과거 보고서 조회
- [ ] 보고서 목록 페이지 또는 사이드바 구현
- [ ] 보고서 상세 조회 기능

#### 13단계: UI/UX 개선 🔲
- [ ] 반응형 디자인 개선
- [ ] 다크 모드 지원
- [ ] 로딩 애니메이션 개선
- [ ] 접근성 개선 (ARIA 레이블, 키보드 네비게이션)

## 기술적 고려사항

### Notion API 사용 시 주의사항
- **페이지네이션**: NotionApiService의 `queryDatabaseAll()`이 자동으로 모든 페이지를 조회
- **필터 구조**: `isToday`, `isTomorrow` formula 필드 사용
- **담당자 필드**: `Person` people 타입, 여러 명일 경우 첫 번째 사람만 사용

### 타입 안정성
- Notion API 타입 정의가 불완전하여 일부 `as any` 사용 (eslint-disable 주석 포함)
- `unknown` 타입을 활용한 안전한 타입 캐스팅
- 런타임 검증 로직 포함

### 데이터 처리 로직
1. **다중 담당자 처리**: 현재는 첫 번째 담당자만 사용 (향후 분할 로직 추가 가능)
2. **그룹화 우선순위**:
   - 프로젝트(group) → 서브프로젝트(subGroup) → 작업 리스트
3. **공수 집계**:
   - 멤버별 합계 계산
   - members.ts의 priority 기준 정렬
   - 같은 우선순위는 이름 가나다순

### 성능 최적화
- React Query의 `staleTime: 60초` 설정으로 캐싱
- `refetchOnWindowFocus: false`로 불필요한 재조회 방지
- Static Generation 활용 (홈페이지)

## 디버깅 가이드

### 개발 서버 로그 확인
```bash
# 백그라운드 서버 로그 확인
# Shell ID는 실행 시 반환됨
```

### 일반적인 오류

#### 1. Notion API 연결 오류
```
Error: Notion 데이터베이스 조회 중 오류 발생
```
- `.env.local`의 `NOTION_API_KEY` 확인
- Notion Integration 권한 확인
- 데이터베이스 ID 확인

#### 2. 빌드 오류
```
Type error: Property does not exist
```
- `npm run build`로 타입 오류 확인
- TypeScript 버전 호환성 확인

#### 3. 런타임 오류
```
Cannot read property 'properties' of undefined
```
- Notion 데이터 구조가 예상과 다름
- `transformNotionData()` 메서드에서 디버깅

## 개발 가이드

### 코드 스타일
- 함수와 메서드는 단일 책임 원칙 준수
- 주석은 "무엇을"이 아닌 "왜"를 설명
- TypeScript strict 모드 활성화
- ESLint 규칙 준수 (`npm run lint`)

### 새로운 기능 추가 시
1. 타입 정의 먼저 작성 (`src/lib/types/`)
2. 서비스 로직 구현 (`src/lib/services/`)
3. API 라우트 추가/수정 (`src/app/api/`)
4. UI 컴포넌트 구현 (`src/app/` 또는 `src/components/`)
5. 빌드 검증 (`npm run build`)

### 테스트 전략
1. **단위 테스트**: 서비스 로직의 각 메서드 (향후 추가 예정)
2. **통합 테스트**: API 라우트 엔드투엔드 테스트
3. **수동 테스트**: 브라우저에서 실제 동작 확인

## 참고 자료

- **원본 프로젝트 문서**: `/Users/uhjee/Dev/git-remote/watchtek-daily-report/CLAUDE.md`
- **Next.js 공식 문서**: https://nextjs.org/docs
- **ShadCN UI**: https://ui.shadcn.com
- **Notion API**: https://developers.notion.com
- **React Query**: https://tanstack.com/query/latest

## 현재 상태

- ✅ 개발 서버 실행 중: http://localhost:3000
- ✅ 프로덕션 빌드 성공
- ✅ 핵심 기능 구현 완료
- ✅ 실제 Notion 데이터 테스트 완료 (8단계 완료)

## 8단계 완료: Notion API 통합 테스트 결과

### 해결한 문제
- **문제**: `notionClient.databases.query is not a function` 오류 발생
- **원인**: `@notionhq/client` 버전 불일치
  - 초기 설치: 5.4.0 (query 메서드 없음)
  - 필요 버전: 2.2.15 (원본 프로젝트와 동일)
- **해결 과정**:
  1. package.json의 `@notionhq/client` 버전을 `^5.4.0` → `2.2.15`로 수정
  2. node_modules 완전 삭제 및 재설치
  3. Next.js 캐시 삭제 (`.next` 디렉토리)
  4. 개발 서버 재시작

### 테스트 결과
- ✅ API 호출 성공 (POST /api/reports)
- ✅ 실제 Notion 데이터베이스 조회 성공
- ✅ 인원별 공수 집계 정상 작동 (5명 데이터 확인)
- ✅ 진행업무/예정업무 그룹화 정상
- ✅ 우선순위 정렬 정상 작동

### 확인된 데이터 (2025-11-20 기준)
- 인원별 공수: 허지행(15m/h), 장민호(16m/h), 이동엽(8m/h), 장성환(31m/h), 박민영(24m/h)
- 진행업무: 16개 작업 (랙 전력 설정, UPS 다이어그램, 노후 자산 알람 등)
- 예정업무: 2개 작업

## 다음 세션 작업 권장사항

**8단계 완료 후** 다음 작업을 진행할 수 있습니다:

1. **브라우저 UI 테스트**: http://localhost:3000/reports 에서 시각적으로 확인
2. 9-13단계 선택적 구현:
   - 날짜 선택 기능
   - 주간/월간 보고서
   - 에러 처리 개선
   - 보고서 기록 조회
   - UI/UX 개선
