import { describe, it, expect } from "vitest";

describe("External API Keys Validation", () => {
  it("MOLIT_API_KEY is set and non-empty", () => {
    const key = process.env.MOLIT_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it("NAVER_CLIENT_ID is set and non-empty", () => {
    const key = process.env.NAVER_CLIENT_ID;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it("NAVER_CLIENT_SECRET is set and non-empty", () => {
    const key = process.env.NAVER_CLIENT_SECRET;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it("REALESTATE_API_KEY is set and non-empty", () => {
    const key = process.env.REALESTATE_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it("MOLIT_API_KEY format is valid (32 char hex)", () => {
    const key = process.env.MOLIT_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBe(32);
    // Should be hex string
    expect(/^[0-9a-fA-F]+$/.test(key!)).toBe(true);
  });

  it("REALESTATE_API_KEY format is valid (30 char hex)", () => {
    const key = process.env.REALESTATE_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBe(30);
    expect(/^[0-9a-fA-F]+$/.test(key!)).toBe(true);
  });

  it("Naver News API responds with valid credentials", async () => {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent("아파트")}&display=1`;
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId!,
        "X-Naver-Client-Secret": clientSecret!,
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("items");
  });
});
