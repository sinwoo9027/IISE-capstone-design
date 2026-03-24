/**
 * 국토교통부 아파트 실거래가 API 클라이언트
 * https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev
 *
 * API 키 활성화 전에는 graceful fallback으로 기존 DB 데이터를 사용합니다.
 */

import { XMLParser } from "fast-xml-parser";

const MOLIT_API_URL =
  "http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

export interface RealTradeItem {
  aptName: string;
  sigungu: string;
  dong: string;
  jibun: string;
  builtYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  dealAmount: number;       // 만원 단위
  excluUseAr: number;       // 전용면적 (㎡)
  floor: number;
  rgstDate: string | null;  // 등기일자
}

export interface RealTradeResponse {
  success: boolean;
  totalCount: number;
  items: RealTradeItem[];
  errorMessage?: string;
}

/**
 * 법정동코드 매핑 (서울 주요 구)
 */
export const LAWD_CODE_MAP: Record<string, string> = {
  "강남구": "11680",
  "강동구": "11740",
  "강북구": "11305",
  "강서구": "11500",
  "관악구": "11620",
  "광진구": "11215",
  "구로구": "11530",
  "금천구": "11545",
  "노원구": "11350",
  "도봉구": "11320",
  "동대문구": "11230",
  "동작구": "11590",
  "마포구": "11440",
  "서대문구": "11410",
  "서초구": "11650",
  "성동구": "11200",
  "성북구": "11290",
  "송파구": "11710",
  "양천구": "11470",
  "영등포구": "11560",
  "용산구": "11170",
  "은평구": "11380",
  "종로구": "11110",
  "중구": "11140",
  "중랑구": "11260",
};

/**
 * XML 응답 파싱
 */
function parseXmlResponse(xml: string): RealTradeResponse {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    });
    const parsed = parser.parse(xml);

    const header = parsed?.response?.header;
    const resultCode = header?.resultCode;

    // XMLParser parses '00' as number 0
    if (String(resultCode) !== "0" && resultCode !== "00") {
      return {
        success: false,
        totalCount: 0,
        items: [],
        errorMessage: header?.resultMsg || `API Error: code ${resultCode}`,
      };
    }

    const body = parsed?.response?.body;
    const totalCount = body?.totalCount || 0;

    if (totalCount === 0) {
      return { success: true, totalCount: 0, items: [] };
    }

    // items가 단일 객체일 수도 있고 배열일 수도 있음
    let rawItems = body?.items?.item;
    if (!rawItems) return { success: true, totalCount: 0, items: [] };
    if (!Array.isArray(rawItems)) rawItems = [rawItems];

    const items: RealTradeItem[] = rawItems.map((item: any) => ({
      aptName: String(item["아파트"] || item.aptNm || "").trim(),
      sigungu: String(item["시군구"] || "").trim(),
      dong: String(item["법정동"] || item.umdNm || "").trim(),
      jibun: String(item["지번"] || item.jibun || "").trim(),
      builtYear: parseInt(item["건축년도"] || item.buildYear || "0") || 0,
      dealYear: parseInt(item["년"] || item.dealYear || "0") || 0,
      dealMonth: parseInt(item["월"] || item.dealMonth || "0") || 0,
      dealDay: parseInt(item["일"] || item.dealDay || "0") || 0,
      dealAmount: parseInt(String(item["거래금액"] || item.dealAmount || "0").replace(/,/g, "").trim()) || 0,
      excluUseAr: parseFloat(item["전용면적"] || item.excluUseAr || "0") || 0,
      floor: parseInt(item["층"] || item.floor || "0") || 0,
      rgstDate: item["등기일자"] || item.rgstDate || null,
    }));

    return { success: true, totalCount, items };
  } catch (error) {
    console.error("[RealTrade] XML parse error:", error);
    return {
      success: false,
      totalCount: 0,
      items: [],
      errorMessage: "XML 파싱 실패",
    };
  }
}

/**
 * 실거래가 API 호출
 *
 * @param lawdCd 법정동코드 (5자리)
 * @param dealYmd 거래년월 (YYYYMM)
 * @param numOfRows 한 페이지 결과 수
 * @param pageNo 페이지 번호
 */
export async function fetchRealTrade(
  lawdCd: string,
  dealYmd: string,
  numOfRows: number = 100,
  pageNo: number = 1
): Promise<RealTradeResponse> {
  // 두 키 모두 시도 (MOLIT_API_KEY 우선, REALESTATE_API_KEY 대체)
  const keys = [
    process.env.MOLIT_API_KEY,
    process.env.REALESTATE_API_KEY,
  ].filter(Boolean);

  if (keys.length === 0) {
    console.warn("[RealTrade] No API keys configured");
    return { success: false, totalCount: 0, items: [], errorMessage: "API 키 미설정" };
  }

  for (const key of keys) {
    try {
      const params = new URLSearchParams({
        serviceKey: key!,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        numOfRows: String(numOfRows),
        pageNo: String(pageNo),
      });

      const url = `${MOLIT_API_URL}?${params.toString()}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (response.status === 401) {
        console.warn(`[RealTrade] Key unauthorized, trying next key...`);
        continue;
      }

      if (!response.ok) {
        console.error(`[RealTrade] API error: ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const result = parseXmlResponse(xml);

      if (result.success) {
        return result;
      }
    } catch (error) {
      console.warn(`[RealTrade] Request failed:`, error);
      continue;
    }
  }

  return {
    success: false,
    totalCount: 0,
    items: [],
    errorMessage: "모든 API 키 인증 실패 - 키 활성화 대기 중",
  };
}

/**
 * 특정 구의 최근 N개월 실거래가 조회
 */
export async function fetchRecentTrades(
  sigungu: string,
  months: number = 6
): Promise<RealTradeItem[]> {
  const lawdCd = LAWD_CODE_MAP[sigungu];
  if (!lawdCd) {
    console.warn(`[RealTrade] Unknown sigungu: ${sigungu}`);
    return [];
  }

  const now = new Date();
  const allItems: RealTradeItem[] = [];

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

    const result = await fetchRealTrade(lawdCd, dealYmd, 1000);
    if (result.success) {
      allItems.push(...result.items);
    } else {
      // API 실패 시 즉시 중단 (fallback 사용)
      console.warn(`[RealTrade] API failed for ${dealYmd}: ${result.errorMessage}`);
      break;
    }
  }

  return allItems;
}

/**
 * API 사용 가능 여부 확인 (간단한 헬스체크)
 */
export async function isRealTradeApiAvailable(): Promise<boolean> {
  try {
    const result = await fetchRealTrade("11110", "202501", 1, 1);
    return result.success;
  } catch {
    return false;
  }
}
