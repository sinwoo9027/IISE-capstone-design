import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Naver News API Module", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    process.env.NAVER_CLIENT_ID = "test_client_id";
    process.env.NAVER_CLIENT_SECRET = "test_client_secret";
  });

  describe("searchNaverNews", () => {
    it("should return cleaned news items on success", async () => {
      const { searchNaverNews } = await import("./api-naver-news");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          lastBuildDate: "Mon, 24 Mar 2026 10:00:00 +0900",
          total: 2,
          start: 1,
          display: 2,
          items: [
            {
              title: "<b>강남</b> 아파트 가격 상승",
              originallink: "https://www.hankyung.com/article/123",
              link: "https://n.news.naver.com/article/123",
              description: "<b>강남</b> 지역 아파트 가격이 상승했습니다.",
              pubDate: "Mon, 24 Mar 2026 09:00:00 +0900",
            },
            {
              title: "서울 부동산 시장 동향",
              originallink: "https://www.mk.co.kr/news/456",
              link: "https://n.news.naver.com/article/456",
              description: "서울 부동산 시장이 활기를 띠고 있습니다.",
              pubDate: "Mon, 24 Mar 2026 08:00:00 +0900",
            },
          ],
        }),
      });

      const results = await searchNaverNews("강남 아파트", 10, "date");

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("강남 아파트 가격 상승"); // HTML stripped
      expect(results[0].source).toBe("한국경제");
      expect(results[0].link).toBe("https://n.news.naver.com/article/123");
      expect(results[0].publishDate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it("should return empty array when API credentials are missing", async () => {
      delete process.env.NAVER_CLIENT_ID;
      delete process.env.NAVER_CLIENT_SECRET;

      const { searchNaverNews } = await import("./api-naver-news");
      const results = await searchNaverNews("test");
      expect(results).toEqual([]);
    });

    it("should return empty array on API error", async () => {
      const { searchNaverNews } = await import("./api-naver-news");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const results = await searchNaverNews("test");
      expect(results).toEqual([]);
    });

    it("should handle network errors gracefully", async () => {
      const { searchNaverNews } = await import("./api-naver-news");

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const results = await searchNaverNews("test");
      expect(results).toEqual([]);
    });

    it("should pass correct headers to Naver API", async () => {
      const { searchNaverNews } = await import("./api-naver-news");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await searchNaverNews("test query");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("openapi.naver.com/v1/search/news.json");
      expect(callArgs[0]).toContain("query=test+query");
      expect(callArgs[1].headers["X-Naver-Client-Id"]).toBe("test_client_id");
      expect(callArgs[1].headers["X-Naver-Client-Secret"]).toBe("test_client_secret");
    });
  });

  describe("searchApartmentNews", () => {
    it("should merge and deduplicate results from apt and region searches", async () => {
      const { searchApartmentNews } = await import("./api-naver-news");

      // First call (apt search)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              title: "래미안 뉴스 1",
              originallink: "https://example.com/1",
              link: "https://n.news.naver.com/1",
              description: "desc 1",
              pubDate: "Mon, 24 Mar 2026 09:00:00 +0900",
            },
          ],
        }),
      });

      // Second call (region search)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              title: "강남 부동산 뉴스",
              originallink: "https://example.com/2",
              link: "https://n.news.naver.com/2",
              description: "desc 2",
              pubDate: "Mon, 24 Mar 2026 08:00:00 +0900",
            },
            {
              // Duplicate link - should be removed
              title: "래미안 뉴스 1 (duplicate)",
              originallink: "https://example.com/1-dup",
              link: "https://n.news.naver.com/1",
              description: "desc 1 dup",
              pubDate: "Mon, 24 Mar 2026 07:00:00 +0900",
            },
          ],
        }),
      });

      const results = await searchApartmentNews("래미안", "강남구", "역삼동", 10);

      // Should have 2 unique results (duplicate removed)
      expect(results).toHaveLength(2);
      // Should be sorted by date (newest first)
      expect(new Date(results[0].publishDate).getTime()).toBeGreaterThanOrEqual(
        new Date(results[1].publishDate).getTime()
      );
    });
  });
});

describe("Real Trade API Module", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    process.env.MOLIT_API_KEY = "644b4a4d746a64683132345864527842";
    process.env.REALESTATE_API_KEY = "4e4344416273696e363851627a6661";
  });

  describe("fetchRealTrade", () => {
    it("should return failure when API returns 401", async () => {
      const { fetchRealTrade } = await import("./api-realtrade");

      // Both keys return 401
      mockFetch.mockResolvedValue({
        status: 401,
        ok: false,
      });

      const result = await fetchRealTrade("11110", "202501");
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("인증 실패");
    });

    it("should parse XML response correctly", async () => {
      const { fetchRealTrade } = await import("./api-realtrade");

      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <totalCount>1</totalCount>
    <items>
      <item>
        <아파트>래미안</아파트>
        <법정동>역삼동</법정동>
        <건축년도>2005</건축년도>
        <년>2025</년>
        <월>1</월>
        <일>15</일>
        <거래금액>150,000</거래금액>
        <전용면적>84.5</전용면적>
        <층>10</층>
      </item>
    </items>
  </body>
</response>`;

      // fetchRealTrade tries MOLIT_API_KEY first - return success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => xmlResponse,
      });
      // REALESTATE_API_KEY fallback (shouldn't be called if first succeeds)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => xmlResponse,
      });

      const result = await fetchRealTrade("11680", "202501");
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].aptName).toBe("래미안");
      expect(result.items[0].dealAmount).toBe(150000);
      expect(result.items[0].excluUseAr).toBe(84.5);
    });

    it("should return empty result when no API keys configured", async () => {
      delete process.env.MOLIT_API_KEY;
      delete process.env.REALESTATE_API_KEY;

      const { fetchRealTrade } = await import("./api-realtrade");
      const result = await fetchRealTrade("11110", "202501");
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("키 미설정");
    });
  });

  describe("LAWD_CODE_MAP", () => {
    it("should contain all 25 Seoul districts", async () => {
      const { LAWD_CODE_MAP } = await import("./api-realtrade");
      expect(Object.keys(LAWD_CODE_MAP)).toHaveLength(25);
      expect(LAWD_CODE_MAP["강남구"]).toBe("11680");
      expect(LAWD_CODE_MAP["송파구"]).toBe("11710");
    });
  });
});

describe("News Analyzer Module", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it("should return empty analysis when no news items", async () => {
    const { analyzeNews } = await import("./news-analyzer");
    const result = await analyzeNews([], "테스트아파트", "강남구", "역삼동");

    expect(result.summary).toContain("관련 뉴스가 없어");
    expect(result.sentimentTags).toEqual([]);
  });

  it("should use fallback analysis when LLM fails", async () => {
    // Mock LLM to fail
    mockFetch.mockRejectedValueOnce(new Error("LLM error"));

    const { analyzeNews } = await import("./news-analyzer");

    const newsItems = [
      {
        title: "강남 재건축 아파트 가격 상승",
        link: "https://example.com/1",
        originalLink: "https://example.com/1",
        description: "강남 지역 재건축 아파트 가격이 상승했습니다.",
        publishDate: "2026-03-24T00:00:00Z",
        source: "한국경제",
      },
    ];

    const result = await analyzeNews(newsItems, "테스트아파트", "강남구", "역삼동");

    // Should use fallback
    expect(result.summary).toContain("1건의 뉴스");
    expect(result.sentimentTags.length).toBeGreaterThan(0);
    // "재건축" and "상승" keywords should be detected
    const tags = result.sentimentTags.map((t) => t.tag);
    expect(tags).toContain("재건축");
  });
});
