/**
 * AptGPT 추천 알고리즘 - 캡스톤 계획서 기준
 * 
 * Hard Filter: 예산, 최소 평형
 * Soft Scoring: 5개 지표 (교통, 규모, 재건축, 가격 상승률, 전세가율)
 */

// ==================== 데이터 타입 ====================

export interface ApartmentForScoring {
  apt_id: number;
  apt_name: string;
  region: string;
  price_krw: number;
  area_m2: number;
  built_year: number;
  households: number;
  lat: number;
  lng: number;
}

export interface SubwayStationForScoring {
  station_name: string;
  line: string;
  distance_km: number;
  is_transfer: boolean;
}

export interface TransactionForScoring {
  contract_date: string;
  price_krw: number;
}

export interface RebuildStatusForScoring {
  is_rebuild_candidate: boolean;
  stage?: string; // "추진위", "조합", "사업시행", "관리처분", "이주/철거", "착공", "준공"
  stage_updated_at?: string;
}

export interface ScoringInput {
  apartment: ApartmentForScoring;
  nearby_subways: SubwayStationForScoring[];
  transactions: TransactionForScoring[];
  rebuild_status?: RebuildStatusForScoring;
  user_budget_won: number; // 예산 (원)
  user_min_area_m2: number; // 최소 평형 (m2)
  user_investment_type: "stable" | "profit"; // 안정형 / 수익형
  user_transport_importance: 1 | 2 | 3 | 4 | 5; // 교통 중요도
}

export interface ScoringResult {
  apt_id: number;
  apt_name: string;
  region: string;
  final_score: number;
  scores: {
    transport: number;
    scale: number;
    rebuild: number;
    priceTrend: number;
    jeonseRatio: number;
  };
  explanation: string;
  passed_hard_filter: boolean;
  filter_fail_reason?: string;
}

// ==================== Hard Filter ====================

/**
 * Hard Filter: 예산 및 최소 평형 확인
 * 조건을 만족하지 못하면 즉시 제외
 */
export function applyHardFilter(input: ScoringInput): { passed: boolean; reason?: string } {
  // 예산 초과 확인
  if (input.apartment.price_krw > input.user_budget_won) {
    return {
      passed: false,
      reason: `예산 초과 (${input.apartment.price_krw / 100000000}억 > ${input.user_budget_won / 100000000}억)`,
    };
  }

  // 최소 평형 미달 확인
  if (input.apartment.area_m2 < input.user_min_area_m2) {
    return {
      passed: false,
      reason: `최소 평형 미달 (${input.apartment.area_m2}m² < ${input.user_min_area_m2}m²)`,
    };
  }

  return { passed: true };
}

// ==================== Soft Scoring: 5개 지표 ====================

/**
 * 1. 교통 편의성 점수 (0~100)
 * - 지하철역 거리 기반
 * - 500m 이내 고득점
 * - 사용자 교통 중요도 1~5단계 반영
 */
export function scoreTransport(
  subways: SubwayStationForScoring[],
  transportImportance: 1 | 2 | 3 | 4 | 5
): number {
  if (subways.length === 0) return 0;

  // 500m 이내 역 필터링
  const nearbyStations = subways.filter((s) => s.distance_km <= 0.5);

  if (nearbyStations.length === 0) {
    // 500m 초과 역들로 계산
    const minDistance = Math.min(...subways.map((s) => s.distance_km));
    const baseScore = Math.max(0, 50 - minDistance * 100); // 1km = 0점
    return baseScore;
  }

  // 기본 점수: 역 개수 + 최단 거리 + 환승역 보너스
  const stationCountScore = Math.min(nearbyStations.length * 20, 60);
  const minDistance = Math.min(...nearbyStations.map((s) => s.distance_km));
  const distanceScore = Math.max(0, 30 - minDistance * 60);
  const transferBonus = nearbyStations.some((s) => s.is_transfer) ? 10 : 0;

  let baseScore = stationCountScore + distanceScore + transferBonus;
  baseScore = Math.min(Math.max(baseScore, 0), 100);

  // 사용자 교통 중요도 가중치 적용 (1~5 → 0.5~1.5 배수)
  const importanceMultiplier = 0.5 + (transportImportance - 1) * 0.25;
  const finalScore = baseScore * importanceMultiplier;

  return Math.min(Math.max(finalScore, 0), 100);
}

/**
 * 2. 단지 규모 점수 (0~100)
 * - 전체 세대수 정규화
 * - 안정형에서 상대적으로 중요도 높음
 */
export function scoreScale(households: number): number {
  // 세대수 정규화 (1000세대 = 100점)
  const score = (households / 1000) * 100;
  return Math.min(Math.max(score, 0), 100);
}

/**
 * 3. 재건축 기대 점수 (0~100)
 * - 준공연도 기반 노후도
 * - 실제 재건축 단계(stage)가 있으면 함께 반영
 * - 수익형에서 중요도 높음
 */
export function scoreRebuild(builtYear: number, rebuildStatus?: RebuildStatusForScoring): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - builtYear;

  // 기본 노후도 점수
  let baseScore = 50;

  if (age > 40) {
    baseScore = 80; // 매우 오래됨
  } else if (age > 30) {
    baseScore = 70; // 오래됨
  } else if (age > 20) {
    baseScore = 60; // 중간
  } else if (age > 10) {
    baseScore = 40; // 비교적 새로움
  } else {
    baseScore = 20; // 매우 새로움
  }

  // 재건축 단계 보너스
  if (rebuildStatus?.is_rebuild_candidate && rebuildStatus?.stage) {
    const stageBonus: Record<string, number> = {
      추진위: 10,
      조합: 20,
      사업시행: 30,
      관리처분: 25,
      "이주/철거": 20,
      착공: 15,
      준공: 5,
    };
    baseScore += stageBonus[rebuildStatus.stage] || 0;
  }

  return Math.min(Math.max(baseScore, 0), 100);
}

/**
 * 4. 가격 상승률 점수 (0~100)
 * - 최근 3개월 거래가 트렌드 기반
 * - 수익형에서 중요도 높음
 */
export function scorePriceTrend(transactions: TransactionForScoring[]): number {
  if (transactions.length < 2) return 50; // 데이터 부족 시 중간값

  // 최근 3개월 거래가 평균
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

  const recentTransactions = transactions.filter((t) => new Date(t.contract_date) >= threeMonthsAgo);
  const olderTransactions = transactions.filter((t) => new Date(t.contract_date) < threeMonthsAgo);

  if (recentTransactions.length === 0 || olderTransactions.length === 0) {
    return 50; // 데이터 부족
  }

  const recentAvg =
    recentTransactions.reduce((sum, t) => sum + t.price_krw, 0) / recentTransactions.length;
  const olderAvg =
    olderTransactions.reduce((sum, t) => sum + t.price_krw, 0) / olderTransactions.length;

  // 상승률 계산 (-50% ~ +50%)
  const priceChangeRate = (recentAvg - olderAvg) / olderAvg;

  // 0~100으로 정규화 (-50% = 0점, 0% = 50점, +50% = 100점)
  const score = 50 + priceChangeRate * 100;

  return Math.min(Math.max(score, 0), 100);
}

/**
 * 5. 전세가율 점수 (0~100)
 * - 전세가 ÷ 매매가 비율
 * - 안정형에서 중요도 높음
 * - 임시: 평균 전세가율 기반 추정
 */
export function scoreJeonseRatio(priceKrw: number): number {
  // 평균 전세가율: 60~70% (지역/시기에 따라 변동)
  // 임시 계산: 현재 데이터 부족으로 평균값 기반
  const estimatedJeonseRatio = 0.65; // 65% 추정

  // 전세가율이 높을수록 안정적 (임차인 입장)
  // 60% = 50점, 70% = 100점, 50% = 0점
  const score = (estimatedJeonseRatio - 0.5) * 500;

  return Math.min(Math.max(score, 0), 100);
}

// ==================== 최종 점수 계산 ====================

/**
 * 투자 성향별 가중치
 */
function getWeights(investmentType: "stable" | "profit", transportImportance: 1 | 2 | 3 | 4 | 5) {
  if (investmentType === "stable") {
    return {
      transport: 0.25 * (transportImportance / 3), // 교통 중요도 반영
      scale: 0.2,
      rebuild: 0.15,
      priceTrend: 0.15,
      jeonseRatio: 0.25,
    };
  } else {
    // profit
    return {
      transport: 0.2 * (transportImportance / 3),
      scale: 0.1,
      rebuild: 0.3,
      priceTrend: 0.25,
      jeonseRatio: 0.15,
    };
  }
}

/**
 * 최종 점수 계산 (0~100)
 */
export function calculateFinalScore(
  scores: {
    transport: number;
    scale: number;
    rebuild: number;
    priceTrend: number;
    jeonseRatio: number;
  },
  investmentType: "stable" | "profit",
  transportImportance: 1 | 2 | 3 | 4 | 5
): number {
  const weights = getWeights(investmentType, transportImportance);

  // 가중치 정규화
  const totalWeight =
    weights.transport + weights.scale + weights.rebuild + weights.priceTrend + weights.jeonseRatio;
  const normalizedWeights = {
    transport: weights.transport / totalWeight,
    scale: weights.scale / totalWeight,
    rebuild: weights.rebuild / totalWeight,
    priceTrend: weights.priceTrend / totalWeight,
    jeonseRatio: weights.jeonseRatio / totalWeight,
  };

  const finalScore =
    scores.transport * normalizedWeights.transport +
    scores.scale * normalizedWeights.scale +
    scores.rebuild * normalizedWeights.rebuild +
    scores.priceTrend * normalizedWeights.priceTrend +
    scores.jeonseRatio * normalizedWeights.jeonseRatio;

  return Math.min(Math.max(finalScore, 0), 100);
}

// ==================== 추천 근거 설명 생성 ====================

/**
 * 자연어 추천 근거 생성
 */
export function generateExplanation(
  input: ScoringInput,
  scores: {
    transport: number;
    scale: number;
    rebuild: number;
    priceTrend: number;
    jeonseRatio: number;
  }
): string {
  const parts: string[] = [];

  // 투자 성향별 강점 설명
  if (input.user_investment_type === "stable") {
    if (scores.jeonseRatio > 70) {
      parts.push("전세가율이 우수하여 안정적인 임대 수익을 기대할 수 있습니다.");
    }
    if (scores.scale > 70) {
      parts.push("단지 규모가 커 거래량이 많아 매각 시 유리합니다.");
    }
  } else {
    // profit
    if (scores.rebuild > 70) {
      parts.push("재건축 기대감이 높아 수익형 투자자에게 적합합니다.");
    }
    if (scores.priceTrend > 70) {
      parts.push("최근 가격 상승 추세가 강하여 수익성이 우수합니다.");
    }
  }

  // 교통 설명
  if (input.user_transport_importance >= 3) {
    if (scores.transport > 70) {
      parts.push("역세권 접근성이 우수합니다.");
    } else if (scores.transport > 40) {
      parts.push("기본적인 교통 접근성을 갖추고 있습니다.");
    }
  }

  // 기본 설명
  if (parts.length === 0) {
    parts.push("조건에 맞는 합리적인 선택입니다.");
  }

  return parts.join(" ");
}

// ==================== 전체 추천 실행 ====================

/**
 * 단일 아파트에 대한 전체 점수 계산
 */
export function scoreApartment(input: ScoringInput): ScoringResult {
  // Hard Filter 적용
  const filterResult = applyHardFilter(input);
  if (!filterResult.passed) {
  return {
    apt_id: input.apartment.apt_id,
    apt_name: input.apartment.apt_name,
    region: input.apartment.region,
    final_score: 0,
    scores: {
      transport: 0,
      scale: 0,
      rebuild: 0,
      priceTrend: 0,
      jeonseRatio: 0,
    },
      explanation: filterResult.reason || "조건에 맞지 않습니다.",
      passed_hard_filter: false,
      filter_fail_reason: filterResult.reason,
    };
  }

  // Soft Scoring 계산
  const scores = {
    transport: scoreTransport(input.nearby_subways, input.user_transport_importance),
    scale: scoreScale(input.apartment.households),
    rebuild: scoreRebuild(input.apartment.built_year, input.rebuild_status),
    priceTrend: scorePriceTrend(input.transactions),
    jeonseRatio: scoreJeonseRatio(input.apartment.price_krw),
  };

  // 최종 점수
  const finalScore = calculateFinalScore(
    scores,
    input.user_investment_type,
    input.user_transport_importance
  );

  // 설명 생성
  const explanation = generateExplanation(input, scores);

  return {
    apt_id: input.apartment.apt_id,
    apt_name: input.apartment.apt_name,
    region: input.apartment.region,
    final_score: finalScore,
    scores,
    explanation,
    passed_hard_filter: true,
  };
}
