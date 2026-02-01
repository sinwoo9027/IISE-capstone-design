/**
 * Stripe 제품 및 가격 정의
 * AptGPT SaaS 구독 플랜
 */

export const STRIPE_PRODUCTS = {
  FREE: {
    name: "무료 플랜",
    description: "기본 추천 기능",
    features: [
      "월 5회 추천",
      "기본 분석",
      "지하철역 정보",
    ],
  },
  PREMIUM: {
    name: "프리미엄 플랜",
    description: "무제한 추천 + 고급 분석",
    features: [
      "무제한 추천",
      "고급 분석 리포트",
      "실거래가 차트",
      "즐겨찾기 관리",
      "비교 기능 (최대 5개)",
      "이메일 알림",
    ],
    price: 9900, // 월 9,900원 (센트 단위)
    interval: "month",
  },
  ENTERPRISE: {
    name: "엔터프라이즈 플랜",
    description: "팀 협업 + API 접근",
    features: [
      "프리미엄 플랜의 모든 기능",
      "팀 협업 (최대 10명)",
      "API 접근",
      "커스텀 보고서",
      "우선 지원",
      "데이터 내보내기",
    ],
    price: 49900, // 월 49,900원 (센트 단위)
    interval: "month",
  },
};

/**
 * Stripe 가격 ID (실제 Stripe 대시보드에서 생성 후 여기에 입력)
 * 테스트 모드와 라이브 모드에 따라 다른 ID 사용
 */
export const STRIPE_PRICE_IDS = {
  PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || "price_test_premium",
  ENTERPRISE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_test_enterprise",
};

/**
 * 구독 플랜 정보 조회
 */
export function getPlanInfo(planId: string) {
  switch (planId) {
    case "premium":
      return STRIPE_PRODUCTS.PREMIUM;
    case "enterprise":
      return STRIPE_PRODUCTS.ENTERPRISE;
    default:
      return STRIPE_PRODUCTS.FREE;
  }
}

/**
 * 가격 ID로 플랜 조회
 */
export function getPlanByPriceId(priceId: string): string {
  if (priceId === STRIPE_PRICE_IDS.PREMIUM_MONTHLY) {
    return "premium";
  }
  if (priceId === STRIPE_PRICE_IDS.ENTERPRISE_MONTHLY) {
    return "enterprise";
  }
  return "free";
}
