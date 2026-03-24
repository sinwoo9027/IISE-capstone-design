import { describe, expect, it } from "vitest";
import {
  generateBriefing,
  generateIssuesSummary,
  generateInvestmentPoints,
  generateCautionPoints,
  generateLocationVibe,
  extractNewsKeywords,
  generateApartmentInsights,
  type ApartmentData,
  type SubwayData,
  type TransactionData,
  type NewsData,
  type RebuildData,
} from "./apartment-insights";

describe("apartment-insights", () => {
  const mockApartment: ApartmentData = {
    id: 1,
    aptName: "테스트 아파트",
    sigungu: "강남구",
    dong: "역삼동",
    builtYear: 2000,
    households: 600,
    reprAreaM2: "84",
    lat: "37.4979",
    lng: "127.0276",
  };

  const mockSubways: SubwayData[] = [
    {
      stationName: "강남역",
      line: "2호선",
      distance: 300,
      isTransfer: true,
    },
    {
      stationName: "역삼역",
      line: "2호선",
      distance: 500,
      isTransfer: false,
    },
  ];

  const mockTransactions: TransactionData[] = [
    {
      contractDate: "2024-01-15",
      priceKrw: "800,000,000",
      areaM2: "84",
    },
    {
      contractDate: "2024-06-20",
      priceKrw: "850,000,000",
      areaM2: "84",
    },
    {
      contractDate: "2024-12-10",
      priceKrw: "900,000,000",
      areaM2: "84",
    },
  ];

  const mockNews: NewsData[] = [
    {
      title: "강남역 GTX-B 개통 예정, 지역 개발 기대감 상승",
      source: "뉴스1",
      publishDate: "2024-12-01",
      link: "https://example.com/1",
    },
    {
      title: "역삼동 재건축 추진위 출범, 주민 동의율 75%",
      source: "연합뉴스",
      publishDate: "2024-11-15",
      link: "https://example.com/2",
    },
    {
      title: "강남구 아파트 거래 위축, 관망 심화",
      source: "매경",
      publishDate: "2024-10-20",
      link: "https://example.com/3",
    },
  ];

  const mockRebuild: RebuildData = {
    stage: "추진위",
    isRebuildCandidate: true,
  };

  describe("generateBriefing", () => {
    it("should generate briefing with good transit and large complex", () => {
      const noRebuild: RebuildData = { stage: null, isRebuildCandidate: false };
      const noPrice: TransactionData[] = [
        { contractDate: "2024-01-15", priceKrw: "800,000,000", areaM2: "84" },
      ];
      const briefing = generateBriefing(
        mockApartment,
        mockSubways,
        noPrice,
        noRebuild
      );
      expect(briefing).toContain("역세권");
      expect(briefing).toContain("대단지");
    });

    it("should mention rebuild for old buildings", () => {
      const oldApt = { ...mockApartment, builtYear: 1995 };
      const briefing = generateBriefing(
        oldApt,
        mockSubways,
        [],
        mockRebuild
      );
      expect(briefing).toContain("재건축");
    });

    it("should mention price uptrend", () => {
      const noRebuild: RebuildData = { stage: null, isRebuildCandidate: false };
      const noTransit: SubwayData[] = [];
      const briefing = generateBriefing(
        mockApartment,
        noTransit,
        mockTransactions,
        noRebuild
      );
      expect(briefing).toContain("상승");
    });
  });

  describe("generateIssuesSummary", () => {
    it("should summarize news issues", () => {
      const summary = generateIssuesSummary(mockNews, mockApartment, mockRebuild);
      expect(summary).toContain("기사");
      expect(summary).toContain("재건축");
    });

    it("should handle empty news", () => {
      const summary = generateIssuesSummary([], mockApartment, mockRebuild);
      expect(summary).toContain("제한적");
    });

    it("should mention trade decline caution", () => {
      const summary = generateIssuesSummary(mockNews, mockApartment, mockRebuild);
      expect(summary).toContain("거래");
    });
  });

  describe("generateInvestmentPoints", () => {
    it("should include transit advantage", () => {
      const points = generateInvestmentPoints(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild
      );
      expect(points.some(p => p.includes("역세권"))).toBe(true);
    });

    it("should include large complex premium", () => {
      const points = generateInvestmentPoints(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild
      );
      expect(points.some(p => p.includes("대단지"))).toBe(true);
    });

    it("should include rebuild expectation", () => {
      const points = generateInvestmentPoints(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild
      );
      expect(points.some(p => p.includes("재건축"))).toBe(true);
    });

    it("should include price uptrend", () => {
      const points = generateInvestmentPoints(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild
      );
      expect(points.some(p => p.includes("상승"))).toBe(true);
    });
  });

  describe("generateCautionPoints", () => {
    it("should include trade information caution", () => {
      const points = generateCautionPoints(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild,
        mockNews
      );
      expect(points.length).toBeGreaterThan(0);
    });

    it("should mention trade decline", () => {
      const points = generateCautionPoints(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild,
        mockNews
      );
      expect(points.some(p => p.includes("거래"))).toBe(true);
    });

    it("should handle old buildings", () => {
      const oldApt = { ...mockApartment, builtYear: 1990 };
      const points = generateCautionPoints(
        oldApt,
        mockSubways,
        mockTransactions,
        mockRebuild,
        mockNews
      );
      expect(points.some(p => p.includes("노후"))).toBe(true);
    });
  });

  describe("generateLocationVibe", () => {
    it("should describe transit accessibility", () => {
      const vibe = generateLocationVibe(mockApartment, mockSubways, mockNews);
      expect(vibe).toContain("지하철");
    });

    it("should mention development atmosphere", () => {
      const vibe = generateLocationVibe(mockApartment, mockSubways, mockNews);
      expect(vibe).toBeTruthy();
    });
  });

  describe("extractNewsKeywords", () => {
    it("should extract positive keywords", () => {
      const keywords = extractNewsKeywords(mockNews);
      const positiveKeywords = keywords.filter(k => k.sentiment === "positive");
      expect(positiveKeywords.length).toBeGreaterThan(0);
    });

    it("should extract caution keywords", () => {
      const keywords = extractNewsKeywords(mockNews);
      const cautionKeywords = keywords.filter(k => k.sentiment === "caution");
      expect(cautionKeywords.some(k => k.tag === "거래위축")).toBe(true);
    });

    it("should limit to 8 keywords", () => {
      const keywords = extractNewsKeywords(mockNews);
      expect(keywords.length).toBeLessThanOrEqual(8);
    });
  });

  describe("generateApartmentInsights", () => {
    it("should generate complete insights", () => {
      const insights = generateApartmentInsights(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild,
        mockNews
      );

      expect(insights.briefing).toBeTruthy();
      expect(insights.issuesSummary).toBeTruthy();
      expect(insights.investmentPoints.length).toBeGreaterThan(0);
      expect(insights.cautionPoints.length).toBeGreaterThan(0);
      expect(insights.locationVibe).toBeTruthy();
      expect(insights.newsKeywords.length).toBeGreaterThanOrEqual(0);
    });

    it("should have balanced investment and caution points", () => {
      const insights = generateApartmentInsights(
        mockApartment,
        mockSubways,
        mockTransactions,
        mockRebuild,
        mockNews
      );

      expect(insights.investmentPoints.length).toBeGreaterThan(0);
      expect(insights.cautionPoints.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle apartment with no subway", () => {
      const briefing = generateBriefing(
        mockApartment,
        [],
        mockTransactions,
        mockRebuild
      );
      expect(briefing).toBeTruthy();
    });

    it("should handle apartment with minimal transactions", () => {
      const briefing = generateBriefing(
        mockApartment,
        mockSubways,
        [mockTransactions[0]],
        mockRebuild
      );
      expect(briefing).toBeTruthy();
    });

    it("should handle apartment with no rebuild candidate", () => {
      const noRebuild: RebuildData = {
        stage: null,
        isRebuildCandidate: false,
      };
      const points = generateInvestmentPoints(
        mockApartment,
        mockSubways,
        mockTransactions,
        noRebuild
      );
      expect(points.length).toBeGreaterThan(0);
    });
  });
});
