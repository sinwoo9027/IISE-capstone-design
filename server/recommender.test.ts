import { describe, expect, it } from "vitest";
import {
  calculateDistance,
  calculateTransportScore,
  calculateInvestmentScore,
  calculateTrendScore,
  calculateFinalScore,
  interpretScore,
  interpretTransportScore,
  interpretTrendScore,
} from "./recommender";

describe("Recommender Algorithm", () => {
  // ==================== Haversine 거리 계산 ====================

  describe("calculateDistance", () => {
    it("should calculate distance between two coordinates correctly", () => {
      // 서울역과 명동역 간 거리 (약 1.2km)
      const distance = calculateDistance(37.5651, 126.9735, 37.5605, 126.9839);
      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(2);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(37.5651, 126.9735, 37.5651, 126.9735);
      expect(distance).toBe(0);
    });
  });

  // ==================== 교통 점수 ====================

  describe("calculateTransportScore", () => {
    it("should return 0 for empty subway stations", () => {
      const score = calculateTransportScore([]);
      expect(score).toBe(0);
    });

    it("should return 0 for stations beyond 1km", () => {
      const score = calculateTransportScore([
        {
          stationName: "역1",
          line: "1호선",
          distance: 1.5,
          isTransfer: 0,
        },
      ]);
      expect(score).toBe(0);
    });

    it("should calculate score for nearby stations", () => {
      const score = calculateTransportScore([
        {
          stationName: "역1",
          line: "1호선",
          distance: 0.3,
          isTransfer: 0,
        },
        {
          stationName: "역2",
          line: "2호선",
          distance: 0.5,
          isTransfer: 1,
        },
      ]);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should add transfer station bonus", () => {
      const scoreWithTransfer = calculateTransportScore([
        {
          stationName: "역1",
          line: "1호선",
          distance: 0.3,
          isTransfer: 1,
        },
      ]);

      const scoreWithoutTransfer = calculateTransportScore([
        {
          stationName: "역1",
          line: "1호선",
          distance: 0.3,
          isTransfer: 0,
        },
      ]);

      expect(scoreWithTransfer).toBeGreaterThan(scoreWithoutTransfer);
    });
  });

  // ==================== 투자 성향 점수 ====================

  describe("calculateInvestmentScore", () => {
    it("should calculate stable investment score", () => {
      const apt = {
        households: 800,
        builtYear: 2010,
        reprAreaM2: "84",
      };

      const score = calculateInvestmentScore(apt, "stable");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should calculate profit investment score", () => {
      const apt = {
        households: 500,
        builtYear: 1990,
        reprAreaM2: "120",
      };

      const score = calculateInvestmentScore(apt, "profit");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should penalize old apartments for stable investment", () => {
      const oldApt = {
        households: 800,
        builtYear: 1980,
        reprAreaM2: "84",
      };

      const newApt = {
        households: 800,
        builtYear: 2015,
        reprAreaM2: "84",
      };

      const oldScore = calculateInvestmentScore(oldApt, "stable");
      const newScore = calculateInvestmentScore(newApt, "stable");

      expect(newScore).toBeGreaterThan(oldScore);
    });

    it("should reward old apartments for profit investment", () => {
      const oldApt = {
        households: 500,
        builtYear: 1980,
        reprAreaM2: "120",
      };

      const newApt = {
        households: 500,
        builtYear: 2015,
        reprAreaM2: "120",
      };

      const oldScore = calculateInvestmentScore(oldApt, "profit");
      const newScore = calculateInvestmentScore(newApt, "profit");

      expect(oldScore).toBeGreaterThan(newScore);
    });

    it("should handle missing data gracefully", () => {
      const apt = {};
      const score = calculateInvestmentScore(apt as any, "stable");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ==================== 트렌드 점수 ====================

  describe("calculateTrendScore", () => {
    it("should return 0 for empty transactions", () => {
      const score = calculateTrendScore([]);
      expect(score).toBe(0);
    });

    it("should calculate trend score for recent transactions", () => {
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

      const transactions = [
        {
          contractDate: now.toISOString().split("T")[0],
          priceKrw: "500000000",
        },
        {
          contractDate: oneMonthAgo.toISOString().split("T")[0],
          priceKrw: "480000000",
        },
        {
          contractDate: twoMonthsAgo.toISOString().split("T")[0],
          priceKrw: "470000000",
        },
      ];

      const score = calculateTrendScore(transactions);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should return conservative score for insufficient data", () => {
      const now = new Date();
      const transactions = [
        {
          contractDate: now.toISOString().split("T")[0],
          priceKrw: "500000000",
        },
      ];

      const score = calculateTrendScore(transactions);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ==================== 최종 점수 ====================

  describe("calculateFinalScore", () => {
    it("should calculate final score with balanced weights", () => {
      const score = calculateFinalScore({
        transportScore: 80,
        investmentScore: 70,
        trendScore: 60,
        transportImportance: 3,
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should increase weight for high transport importance", () => {
      const scoreHighImportance = calculateFinalScore({
        transportScore: 100,
        investmentScore: 50,
        trendScore: 50,
        transportImportance: 5,
      });

      const scoreLowImportance = calculateFinalScore({
        transportScore: 100,
        investmentScore: 50,
        trendScore: 50,
        transportImportance: 1,
      });

      expect(scoreHighImportance).toBeGreaterThan(scoreLowImportance);
    });

    it("should clamp score between 0 and 100", () => {
      const score = calculateFinalScore({
        transportScore: 100,
        investmentScore: 100,
        trendScore: 100,
        transportImportance: 5,
      });

      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== 해석 함수 ====================

  describe("interpretScore", () => {
    it("should interpret high scores", () => {
      expect(interpretScore(90)).toBe("매우 우수");
      expect(interpretScore(80)).toBe("매우 우수");
    });

    it("should interpret medium scores", () => {
      expect(interpretScore(70)).toBe("좋음");
      expect(interpretScore(50)).toBe("보통");
    });

    it("should interpret low scores", () => {
      expect(interpretScore(30)).toBe("낮음");
      expect(interpretScore(10)).toBe("매우 낮음");
    });
  });

  describe("interpretTransportScore", () => {
    it("should handle low transport importance", () => {
      const interpretation = interpretTransportScore(50, 1);
      expect(interpretation).toContain("크게 중요하지 않은");
    });

    it("should interpret high transport scores", () => {
      const interpretation = interpretTransportScore(90, 5);
      expect(interpretation).toContain("우수");
    });
  });

  describe("interpretTrendScore", () => {
    it("should interpret high trend scores", () => {
      expect(interpretTrendScore(90)).toContain("매우 활발");
    });

    it("should interpret low trend scores", () => {
      expect(interpretTrendScore(10)).toContain("부족");
    });
  });
});
