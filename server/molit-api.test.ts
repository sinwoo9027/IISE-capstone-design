import { describe, it, expect } from "vitest";

describe("MOLIT Real Trade API Key Validation", () => {
  it("should have MOLIT_API_KEY set", () => {
    expect(process.env.MOLIT_API_KEY).toBeDefined();
    expect(process.env.MOLIT_API_KEY!.length).toBeGreaterThan(10);
  });

  it("should successfully call the real trade API", async () => {
    const key = process.env.MOLIT_API_KEY!;
    const url = `http://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade`;
    const params = new URLSearchParams({
      serviceKey: key,
      LAWD_CD: "11680",
      DEAL_YMD: "202501",
      numOfRows: "1",
      pageNo: "1",
    });

    const resp = await fetch(`${url}?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    expect(resp.status).toBe(200);

    const text = await resp.text();
    expect(text).toContain("<resultCode>000</resultCode>");
    expect(text).toContain("<resultMsg>OK</resultMsg>");
  }, 20000);
});
