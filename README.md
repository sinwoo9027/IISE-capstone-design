# AptGPT - 지하철 접근성을 고려한 스마트 아파트 추천 서비스

> 예산, 면적, 교통 중요도를 입력하면 AI가 최적의 아파트를 추천합니다.
> 단순한 나열이 아닌 **이유 있는 추천**으로 합리적인 선택을 돕습니다.

## 🎯 프로젝트 개요

AptGPT는 지하철 접근성을 중심으로 아파트를 추천하는 SaaS 플랫폼입니다. 사용자의 예산, 선호 지역, 면적, 교통 중요도를 고려하여 최적의 아파트를 찾아줍니다.

**핵심 기능:**
- 🚇 **지하철 접근성 분석** - 반경 1km 이내 지하철역 개수, 거리, 환승역 정보 종합 분석
- 💰 **투자 성향 맞춤** - 안정형/수익형 선호도에 따른 맞춤형 추천 알고리즘
- 📊 **실거래가 분석** - 최근 1년 거래 추이 및 트렌드 분석
- 🤖 **자연어 설명** - AI가 추천 이유를 명확하게 설명
- 💳 **Stripe 결제** - 안전한 구독 결제 시스템

## 🛠 기술 스택

| 계층 | 기술 |
|------|------|
| **프론트엔드** | React 19, Tailwind CSS 4, Vite |
| **백엔드** | Express 4, tRPC 11, Node.js |
| **데이터베이스** | MySQL, Drizzle ORM |
| **결제** | Stripe |
| **인증** | Manus OAuth |
| **테스트** | Vitest |
| **스타일** | International Typographic Style |

## 📦 설치 및 실행

### 사전 요구사항

- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL 데이터베이스

### 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```env
# 데이터베이스
DATABASE_URL=mysql://user:password@localhost:3306/aptgpt

# 인증
JWT_SECRET=your_jwt_secret_key
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Stripe 결제
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# LLM (Manus 내장)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
```

### 설치

```bash
# 의존성 설치
pnpm install

# 데이터베이스 마이그레이션
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 개발 서버 시작
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 시작
pnpm start
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

## 📊 데이터베이스 스키마

### 주요 테이블

#### `apartments` - 아파트 정보
```sql
- id: 고유 ID
- aptName: 아파트명
- sigungu: 시군구
- dong: 동
- lat/lng: 위도/경도
- builtYear: 건축년도
- households: 세대수
- reprAreaM2: 대표면적
```

#### `transactions` - 실거래 기록
```sql
- id: 고유 ID
- apartmentId: 아파트 ID (FK)
- contractDate: 거래일
- priceKrw: 거래가 (원)
- areaM2: 거래 면적
```

#### `subway_stations` - 지하철역 정보
```sql
- id: 고유 ID
- stationName: 역명
- line: 호선
- lat/lng: 위도/경도
- isTransfer: 환승역 여부
```

#### `subscriptions` - 구독 정보
```sql
- id: 고유 ID
- userId: 사용자 ID (FK)
- stripeCustomerId: Stripe 고객 ID
- stripeSubscriptionId: Stripe 구독 ID
- plan: 플랜 (free/premium/enterprise)
- status: 상태 (active/canceled/expired)
```

#### `payments` - 결제 기록
```sql
- id: 고유 ID
- userId: 사용자 ID (FK)
- stripePaymentIntentId: Stripe 결제 의도 ID
- amount: 결제액 (센트 단위)
- currency: 통화 (KRW)
- status: 상태 (succeeded/failed/pending)
```

## 🧮 추천 알고리즘

### 점수 계산 방식

AptGPT는 다음 4가지 점수를 종합하여 최종 점수를 계산합니다:

#### 1. 교통 점수 (0~100)
```
= 역 개수 점수 + 최단 거리 점수 + 환승역 보너스
- 반경 1km 이내 지하철역 개수 (최대 50점)
- 최단 거리 (최대 40점)
- 환승역 여부 (+10점)
```

#### 2. 투자 성향 점수 (0~100)
**안정형 (세대수 중심):**
```
= 세대수 정규화(0~40) + 건축년도 가중치(0~60)
- 세대수 많을수록 가산
- 최근 건축일수록 가산
```

**수익형 (연식 중심):**
```
= 세대수 정규화(0~30) + 건축년도 가중치(0~70)
- 구축 아파트(재개발 가능성)에 가산
- 면적 다양성에 가산
```

#### 3. 트렌드 점수 (0~100)
```
= (최근 거래량 / 평균 거래량) × 100
- 최근 1년 거래 데이터 기반
- 거래량 증가 추세 반영
```

#### 4. 최종 점수 (0~100)
```
최종 점수 = (교통 × 가중치 + 투자 × 0.3 + 트렌드 × 0.2) / 가중치 합
- 교통 중요도에 따라 가중치 조정 (1~5)
- 0~100 범위로 정규화
```

## 🔐 인증 및 권한

### 사용자 역할

| 역할 | 설명 | 권한 |
|------|------|------|
| **user** | 일반 사용자 | 추천 조회, 즐겨찾기, 구독 |
| **admin** | 관리자 | 모든 권한 + 데이터 관리 |

### 구독 플랜

| 플랜 | 가격 | 기능 |
|------|------|------|
| **무료** | 무료 | 월 5회 추천, 기본 분석 |
| **프리미엄** | ₩9,900/월 | 무제한 추천, 고급 분석, 실거래가 차트 |
| **엔터프라이즈** | ₩49,900/월 | 프리미엄 + 팀 협업, API 접근 |

## 🚀 API 엔드포인트

### 추천 API

**POST** `/api/trpc/recommendations.getRecommendations`

```json
{
  "budget": "50",           // 예산 (억 원)
  "minArea": "60",          // 최소 면적 (㎡)
  "investmentType": "stable", // 투자 성향 (stable/profit)
  "transportImportance": 3  // 교통 중요도 (1~5)
}
```

응답:
```json
{
  "success": true,
  "recommendations": [
    {
      "aptId": 1,
      "aptName": "강남 아파트",
      "finalScore": 85,
      "transportScore": 90,
      "investmentScore": 80,
      "trendScore": 75,
      "nearbySubways": [...]
    }
  ]
}
```

### 결제 API

**POST** `/api/trpc/payments.createCheckout`

```json
{
  "planId": "premium"  // premium/enterprise
}
```

응답:
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

## 🧪 테스트

### 단위 테스트 실행

```bash
pnpm test
```

### 테스트 커버리지

- ✅ 추천 알고리즘 (25개 테스트)
- ✅ 인증 로직 (1개 테스트)
- ✅ Stripe 결제 (8개 테스트)

## 📝 개발 가이드

### 새 기능 추가

1. **데이터베이스 스키마 수정** (`drizzle/schema.ts`)
   ```bash
   pnpm drizzle-kit generate
   ```

2. **DB 헬퍼 함수 작성** (`server/db.ts`)
   ```typescript
   export async function getNewData() {
     const db = await getDb();
     return db.select().from(newTable);
   }
   ```

3. **tRPC 프로시저 추가** (`server/routers.ts`)
   ```typescript
   newFeature: router({
     getData: publicProcedure.query(async () => {
       return await getNewData();
     }),
   }),
   ```

4. **프론트엔드 UI 구현** (`client/src/pages/`)
   ```typescript
   const { data } = trpc.newFeature.getData.useQuery();
   ```

5. **테스트 작성** (`server/*.test.ts`)
   ```bash
   pnpm test
   ```

### 코드 스타일

- **언어:** TypeScript (엄격 모드)
- **포맷팅:** Prettier
- **린팅:** ESLint (기본 설정)
- **스타일:** Tailwind CSS + shadcn/ui

### 커밋 메시지 규칙

```
<type>: <subject>

<body>

<footer>
```

**Type:**
- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 코드 리팩토링
- `docs:` 문서 수정
- `test:` 테스트 추가/수정
- `chore:` 빌드, 의존성 등

**예시:**
```
feat: 추천 알고리즘에 트렌드 점수 추가

- 최근 1년 거래량 기반 트렌드 분석
- 거래 활발도를 최종 점수에 반영
- 25개 단위 테스트 추가
```

## 🐛 알려진 이슈

- Stripe 테스트 모드에서 최소 결제액은 $0.50 USD입니다.
- 지하철역 데이터는 수동으로 입력되어야 합니다 (자동 수집 기능 개발 중).

## 🔮 향후 계획

- [ ] Google Maps 통합 (아파트 위치 시각화)
- [ ] 실시간 알림 (새로운 아파트 등록 시)
- [ ] 고급 필터링 (학군, 상권, 공원 등)
- [ ] 모바일 앱 (React Native)
- [ ] 커뮤니티 기능 (리뷰, 평점)
- [ ] 대출 계산기
- [ ] 세금 계산 도구

## 📞 지원 및 문의

- 📧 이메일: support@aptgpt.com
- 💬 GitHub Issues: [이슈 보고](https://github.com/sinwoo9027/IISE-capstone-design/issues)
- 📱 카카오톡: @aptgpt

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 👥 기여자

- **프로젝트 리더:** sinwoo9027
- **개발팀:** AptGPT Team

---

**마지막 업데이트:** 2026년 2월 1일

더 많은 정보는 [공식 문서](https://docs.aptgpt.com)를 참조하세요.
