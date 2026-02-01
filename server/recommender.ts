/**
 * AptGPT 추천 알고리즘 모듈
 * 거리, 교통, 투자 성향, 트렌드 기반 점수 계산
 */

// ==================== Haversine 거리 계산 ====================

/**
 * 두 좌표 간의 거리를 km 단위로 계산 (Haversine 공식)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ==================== 교통 점수 계산 ====================

interface SubwayInfo {
  stationName: string;
  line: string;
  distance: number;
  isTransfer: number | null;
}

/**
 * 교통 점수 계산 (0~100)
 * - 반경 1km 이내 지하철역 개수
 * - 최단 거리
 * - 환승역 여부
 */
export function calculateTransportScore(subwayStations: SubwayInfo[]): number {
  if (subwayStations.length === 0) return 0;

  // 반경 1km 이내 역만 고려
  const nearbyStations = subwayStations.filter((s) => s.distance <= 1);

  if (nearbyStations.length === 0) return 0;

  // 역 개수 점수 (최대 60점)
  const stationCountScore = Math.min(nearbyStations.length * 15, 60);

  // 최단 거리 점수 (최대 40점)
  const minDistance = Math.min(...nearbyStations.map((s) => s.distance));
  const distanceScore = Math.max(0, 40 - minDistance * 40);

  // 환승역 보너스 (+10점)
  const hasTransferStation = nearbyStations.some((s) => (s.isTransfer ?? 0) === 1);
  const transferBonus = hasTransferStation ? 10 : 0;

  // 최종 점수 (0~100 클램핑)
  const totalScore = stationCountScore + distanceScore + transferBonus;
  return Math.min(Math.max(totalScore, 0), 100);
}

// ==================== 투자 성향 점수 ====================

interface ApartmentInfo {
  households?: number | null;
  builtYear?: number | null;
  reprAreaM2?: string | null;
}

/**
 * 투자 성향 점수 계산 (0~100)
 * - 안정형: 세대수 많을수록 가산, 연식 과도하면 감점
 * - 수익형: 연식 오래될수록 가산, 최근 가격 모멘텀 고려
 */
export function calculateInvestmentScore(
  apt: ApartmentInfo,
  investmentType: "stable" | "profit"
): number {
  try {
    if (investmentType === "stable") {
      // 안정형: 세대수 중심
      let score = 50; // 기본 점수

      // 세대수 점수 (+30점)
      if (apt.households && apt.households > 0) {
        const householdScore = Math.min((apt.households / 1000) * 30, 30);
        score += householdScore;
      }

      // 연식 페널티 (-20점)
      if (apt.builtYear && apt.builtYear > 0) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - apt.builtYear;
        if (age > 30) {
          score -= 20;
        } else if (age > 20) {
          score -= 10;
        }
      }

      return Math.min(Math.max(score, 0), 100);
    } else {
      // 수익형: 연식 중심
      let score = 50; // 기본 점수

      // 연식 점수 (+30점)
      if (apt.builtYear && apt.builtYear > 0) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - apt.builtYear;
        if (age > 30) {
          score += 30;
        } else if (age > 20) {
          score += 15;
        }
      }

      // 면적 점수 (+20점)
      if (apt.reprAreaM2) {
        const area = parseFloat(apt.reprAreaM2);
        if (area > 100) {
          score += 20;
        } else if (area > 80) {
          score += 10;
        }
      }

      return Math.min(Math.max(score, 0), 100);
    }
  } catch (error) {
    console.error("[Recommender] Failed to calculate investment score:", error);
    return 0;
  }
}

// ==================== 트렌드 점수 ====================

interface TransactionData {
  contractDate: string;
  priceKrw: string;
}

/**
 * 트렌드 점수 계산 (0~100)
 * 최근 3개월 거래량 / 직전 1년 평균 거래량
 * cap: 3배
 */
export function calculateTrendScore(transactions: TransactionData[]): number {
  try {
    if (transactions.length === 0) return 0;

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // 최근 3개월 거래량
    const recentTransactions = transactions.filter((t) => {
      const date = new Date(t.contractDate);
      return date >= threeMonthsAgo;
    });

    // 직전 1년 거래량
    const yearTransactions = transactions.filter((t) => {
      const date = new Date(t.contractDate);
      return date >= oneYearAgo && date < threeMonthsAgo;
    });

    if (yearTransactions.length === 0) {
      // 데이터 부족 시 보수적으로 처리
      return recentTransactions.length > 0 ? 30 : 0;
    }

    const recentCount = recentTransactions.length;
    const yearAverage = yearTransactions.length / 12;

    // 거래량 비율 계산 (cap: 3배)
    const ratio = Math.min(recentCount / yearAverage, 3);

    // 0~100으로 정규화
    const score = (ratio / 3) * 100;

    return Math.min(Math.max(score, 0), 100);
  } catch (error) {
    console.error("[Recommender] Failed to calculate trend score:", error);
    return 0;
  }
}

// ==================== 최종 점수 계산 ====================

interface ScoringParams {
  transportScore: number;
  investmentScore: number;
  trendScore: number;
  transportImportance: number; // 1, 3, 5
}

/**
 * 최종 점수 계산 (0~100)
 * 가중치:
 * - W2 = 0.25 (고정)
 * - W1: 교통 중요도에 따라 0.2~0.4
 * - W3 = 1 - (W1 + W2), 최소 0.15 보장
 */
export function calculateFinalScore(params: ScoringParams): number {
  try {
    // 가중치 계산
    let w1 = 0.2; // 기본값
    if (params.transportImportance === 3) {
      w1 = 0.3;
    } else if (params.transportImportance === 5) {
      w1 = 0.4;
    }

    const w2 = 0.25;
    let w3 = 1 - (w1 + w2);
    w3 = Math.max(w3, 0.15); // 최소 0.15 보장

    // 가중치 정규화 (합이 1이 되도록)
    const totalWeight = w1 + w2 + w3;
    const normalizedW1 = w1 / totalWeight;
    const normalizedW2 = w2 / totalWeight;
    const normalizedW3 = w3 / totalWeight;

    // 최종 점수
    const finalScore =
      params.transportScore * normalizedW1 +
      params.investmentScore * normalizedW2 +
      params.trendScore * normalizedW3;

    return Math.min(Math.max(finalScore, 0), 100);
  } catch (error) {
    console.error("[Recommender] Failed to calculate final score:", error);
    return 0;
  }
}

// ==================== 점수 해석 ====================

/**
 * 점수를 자연어로 해석
 */
export function interpretScore(score: number): string {
  if (score >= 80) return "매우 우수";
  if (score >= 60) return "좋음";
  if (score >= 40) return "보통";
  if (score >= 20) return "낮음";
  return "매우 낮음";
}

/**
 * 교통 점수 해석
 */
export function interpretTransportScore(
  score: number,
  transportImportance: number
): string {
  if (transportImportance === 1) {
    return "교통이 크게 중요하지 않은 조건이므로 참고만 하세요.";
  }

  if (score >= 80) {
    return "우수한 교통 접근성을 갖추고 있습니다.";
  }
  if (score >= 60) {
    return "양호한 교통 접근성을 제공합니다.";
  }
  if (score >= 40) {
    return "기본적인 교통 접근성을 갖추고 있습니다.";
  }
  return "교통 접근성이 제한적입니다.";
}

/**
 * 트렌드 점수 해석
 */
export function interpretTrendScore(score: number): string {
  if (score >= 80) {
    return "최근 거래량이 매우 활발합니다.";
  }
  if (score >= 60) {
    return "최근 거래량이 증가 추세입니다.";
  }
  if (score >= 40) {
    return "거래량이 안정적입니다.";
  }
  if (score >= 20) {
    return "최근 거래량이 감소 추세입니다.";
  }
  return "거래 데이터가 부족합니다.";
}
