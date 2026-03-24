import { describe, expect, it } from "vitest";
import {
  scoreTransport,
  scoreScale,
  scoreRebuild,
  scorePriceTrend,
  scoreJeonseRatio,
  calculateFinalScore,
  generateExplanation,
  applyHardFilter,
  scoreApartment,
  type SubwayStationForScoring,
  type TransactionForScoring,
  type RebuildStatusForScoring,
  type ScoringInput,
} from "./recommender-capstone";

// ==================== scoreTransport ====================
describe("scoreTransport", () => {
  it("returns 0 when no subway stations", () => {
    expect(scoreTransport([], 3)).toBe(0);
  });

  it("scores higher for closer stations", () => {
    const close: SubwayStationForScoring[] = [
      { station_name: "역삼", line: "2호선", distance_km: 0.2, is_transfer: false },
    ];
    const far: SubwayStationForScoring[] = [
      { station_name: "역삼", line: "2호선", distance_km: 0.8, is_transfer: false },
    ];
    expect(scoreTransport(close, 3)).toBeGreaterThan(scoreTransport(far, 3));
  });

  it("gives transfer bonus", () => {
    const noTransfer: SubwayStationForScoring[] = [
      { station_name: "역삼", line: "2호선", distance_km: 0.3, is_transfer: false },
    ];
    const withTransfer: SubwayStationForScoring[] = [
      { station_name: "역삼", line: "2호선", distance_km: 0.3, is_transfer: true },
    ];
    expect(scoreTransport(withTransfer, 3)).toBeGreaterThan(scoreTransport(noTransfer, 3));
  });

  it("applies transport importance multiplier", () => {
    const stations: SubwayStationForScoring[] = [
      { station_name: "역삼", line: "2호선", distance_km: 0.2, is_transfer: false },
    ];
    const low = scoreTransport(stations, 1);
    const high = scoreTransport(stations, 5);
    expect(high).toBeGreaterThan(low);
  });

  it("returns value between 0 and 100", () => {
    const stations: SubwayStationForScoring[] = [
      { station_name: "역삼", line: "2호선", distance_km: 0.1, is_transfer: true },
      { station_name: "강남", line: "2호선", distance_km: 0.2, is_transfer: true },
      { station_name: "선릉", line: "2호선", distance_km: 0.3, is_transfer: false },
    ];
    const score = scoreTransport(stations, 5);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ==================== scoreScale ====================
describe("scoreScale", () => {
  it("returns 0 for 0 households", () => {
    expect(scoreScale(0)).toBe(0);
  });

  it("returns 100 for 1000+ households", () => {
    expect(scoreScale(1000)).toBe(100);
    expect(scoreScale(2000)).toBe(100);
  });

  it("scales linearly", () => {
    expect(scoreScale(500)).toBe(50);
    expect(scoreScale(250)).toBe(25);
  });
});

// ==================== scoreRebuild ====================
describe("scoreRebuild", () => {
  it("scores higher for older buildings", () => {
    const oldScore = scoreRebuild(1980);
    const newScore = scoreRebuild(2020);
    expect(oldScore).toBeGreaterThan(newScore);
  });

  it("adds bonus for rebuild stage", () => {
    const withoutRebuild = scoreRebuild(1990);
    const withRebuild = scoreRebuild(1990, {
      is_rebuild_candidate: true,
      stage: "사업시행",
    });
    expect(withRebuild).toBeGreaterThan(withoutRebuild);
  });

  it("returns value between 0 and 100", () => {
    const score = scoreRebuild(1970, {
      is_rebuild_candidate: true,
      stage: "사업시행",
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ==================== scorePriceTrend ====================
describe("scorePriceTrend", () => {
  it("returns 50 with insufficient data", () => {
    expect(scorePriceTrend([])).toBe(50);
    expect(scorePriceTrend([{ contract_date: "2026-01-01", price_krw: 500000000 }])).toBe(50);
  });

  it("scores higher for upward trend", () => {
    const now = new Date();
    const recentDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
    const olderDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split("T")[0];

    const upTrend: TransactionForScoring[] = [
      { contract_date: recentDate, price_krw: 600000000 },
      { contract_date: olderDate, price_krw: 500000000 },
    ];
    const downTrend: TransactionForScoring[] = [
      { contract_date: recentDate, price_krw: 400000000 },
      { contract_date: olderDate, price_krw: 500000000 },
    ];

    expect(scorePriceTrend(upTrend)).toBeGreaterThan(scorePriceTrend(downTrend));
  });

  it("returns value between 0 and 100", () => {
    const now = new Date();
    const txs: TransactionForScoring[] = [
      { contract_date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0], price_krw: 1000000000 },
      { contract_date: new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split("T")[0], price_krw: 500000000 },
    ];
    const score = scorePriceTrend(txs);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ==================== scoreJeonseRatio ====================
describe("scoreJeonseRatio", () => {
  it("returns value between 0 and 100", () => {
    const score = scoreJeonseRatio(500000000);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ==================== calculateFinalScore ====================
describe("calculateFinalScore", () => {
  const scores = {
    transport: 80,
    scale: 60,
    rebuild: 70,
    priceTrend: 50,
    jeonseRatio: 75,
  };

  it("returns value between 0 and 100", () => {
    const result = calculateFinalScore(scores, "stable", 3);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("stable type weights jeonseRatio and scale higher", () => {
    const stableScore = calculateFinalScore(
      { transport: 50, scale: 90, rebuild: 30, priceTrend: 30, jeonseRatio: 90 },
      "stable",
      3
    );
    const profitScore = calculateFinalScore(
      { transport: 50, scale: 90, rebuild: 30, priceTrend: 30, jeonseRatio: 90 },
      "profit",
      3
    );
    expect(stableScore).toBeGreaterThan(profitScore);
  });

  it("profit type weights rebuild and priceTrend higher", () => {
    const stableScore = calculateFinalScore(
      { transport: 50, scale: 30, rebuild: 90, priceTrend: 90, jeonseRatio: 30 },
      "stable",
      3
    );
    const profitScore = calculateFinalScore(
      { transport: 50, scale: 30, rebuild: 90, priceTrend: 90, jeonseRatio: 30 },
      "profit",
      3
    );
    expect(profitScore).toBeGreaterThan(stableScore);
  });
});

// ==================== applyHardFilter ====================
describe("applyHardFilter", () => {
  const baseInput: ScoringInput = {
    apartment: {
      apt_id: 1,
      apt_name: "테스트 아파트",
      region: "강남구",
      price_krw: 500000000,
      area_m2: 85,
      built_year: 2010,
      households: 500,
      lat: 37.5,
      lng: 127.0,
    },
    nearby_subways: [],
    transactions: [],
    user_budget_won: 1000000000,
    user_min_area_m2: 60,
    user_investment_type: "stable",
    user_transport_importance: 3,
  };

  it("passes when within budget and area", () => {
    const result = applyHardFilter(baseInput);
    expect(result.passed).toBe(true);
  });

  it("fails when over budget", () => {
    const result = applyHardFilter({
      ...baseInput,
      apartment: { ...baseInput.apartment, price_krw: 2000000000 },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("예산 초과");
  });

  it("fails when under minimum area", () => {
    const result = applyHardFilter({
      ...baseInput,
      apartment: { ...baseInput.apartment, area_m2: 40 },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("최소 평형 미달");
  });
});

// ==================== generateExplanation ====================
describe("generateExplanation", () => {
  const baseInput: ScoringInput = {
    apartment: {
      apt_id: 1,
      apt_name: "테스트 아파트",
      region: "강남구",
      price_krw: 500000000,
      area_m2: 85,
      built_year: 2010,
      households: 500,
      lat: 37.5,
      lng: 127.0,
    },
    nearby_subways: [],
    transactions: [],
    user_budget_won: 1000000000,
    user_min_area_m2: 60,
    user_investment_type: "stable",
    user_transport_importance: 3,
  };

  it("returns non-empty string", () => {
    const scores = { transport: 80, scale: 60, rebuild: 70, priceTrend: 50, jeonseRatio: 75 };
    const result = generateExplanation(baseInput, scores);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("mentions jeonseRatio for stable type with high score", () => {
    const scores = { transport: 50, scale: 50, rebuild: 50, priceTrend: 50, jeonseRatio: 80 };
    const result = generateExplanation(baseInput, scores);
    expect(result).toContain("전세가율");
  });

  it("mentions rebuild for profit type with high score", () => {
    const profitInput = { ...baseInput, user_investment_type: "profit" as const };
    const scores = { transport: 50, scale: 50, rebuild: 80, priceTrend: 50, jeonseRatio: 50 };
    const result = generateExplanation(profitInput, scores);
    expect(result).toContain("재건축");
  });
});

// ==================== scoreApartment (통합 테스트) ====================
describe("scoreApartment", () => {
  it("returns full scoring result for valid input", () => {
    const input: ScoringInput = {
      apartment: {
        apt_id: 1,
        apt_name: "강남 래미안",
        region: "강남구",
        price_krw: 800000000,
        area_m2: 85,
        built_year: 2008,
        households: 450,
        lat: 37.5,
        lng: 127.0,
      },
      nearby_subways: [
        { station_name: "역삼", line: "2호선", distance_km: 0.3, is_transfer: false },
      ],
      transactions: [
        { contract_date: "2026-01-01", price_krw: 800000000 },
        { contract_date: "2025-06-01", price_krw: 750000000 },
      ],
      rebuild_status: { is_rebuild_candidate: true, stage: "추진위" },
      user_budget_won: 1000000000,
      user_min_area_m2: 60,
      user_investment_type: "stable",
      user_transport_importance: 3,
    };

    const result = scoreApartment(input);
    expect(result.passed_hard_filter).toBe(true);
    expect(result.final_score).toBeGreaterThan(0);
    expect(result.scores.transport).toBeGreaterThan(0);
    expect(result.scores.scale).toBeGreaterThan(0);
    expect(result.scores.rebuild).toBeGreaterThan(0);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it("fails hard filter when over budget", () => {
    const input: ScoringInput = {
      apartment: {
        apt_id: 2,
        apt_name: "초과 아파트",
        region: "강남구",
        price_krw: 2000000000,
        area_m2: 85,
        built_year: 2010,
        households: 300,
        lat: 37.5,
        lng: 127.0,
      },
      nearby_subways: [],
      transactions: [],
      user_budget_won: 1000000000,
      user_min_area_m2: 60,
      user_investment_type: "stable",
      user_transport_importance: 3,
    };

    const result = scoreApartment(input);
    expect(result.passed_hard_filter).toBe(false);
    expect(result.final_score).toBe(0);
    expect(result.filter_fail_reason).toContain("예산 초과");
  });
});
