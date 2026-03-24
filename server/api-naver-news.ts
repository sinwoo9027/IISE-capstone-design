/**
 * 네이버 뉴스 검색 API 클라이언트
 * https://developers.naver.com/docs/serviceapi/search/news/news.md
 *
 * 아파트명/지역명으로 뉴스를 검색하여 실시간 뉴스 데이터를 제공합니다.
 */

const NAVER_API_URL = "https://openapi.naver.com/v1/search/news.json";

export interface NaverNewsItem {
  title: string;         // HTML 태그 포함된 제목
  originallink: string;  // 원본 기사 링크
  link: string;          // 네이버 뉴스 링크
  description: string;   // HTML 태그 포함된 요약
  pubDate: string;       // RFC 2822 형식 날짜
}

export interface NaverNewsResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

export interface CleanNewsItem {
  title: string;
  link: string;
  originalLink: string;
  description: string;
  publishDate: string;   // ISO 8601 형식
  source: string;        // 추출된 언론사명
}

/**
 * HTML 태그 제거
 */
function stripHtml(html: string): string {
  return html
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * 언론사명 추출 (URL 기반)
 */
function extractSource(link: string, originalLink: string): string {
  try {
    const url = new URL(originalLink || link);
    const hostname = url.hostname.replace("www.", "");

    const sourceMap: Record<string, string> = {
      "news.naver.com": "네이버뉴스",
      "n.news.naver.com": "네이버뉴스",
      "www.hankyung.com": "한국경제",
      "hankyung.com": "한국경제",
      "www.mk.co.kr": "매일경제",
      "mk.co.kr": "매일경제",
      "www.chosun.com": "조선일보",
      "chosun.com": "조선일보",
      "www.joongang.co.kr": "중앙일보",
      "joongang.co.kr": "중앙일보",
      "www.donga.com": "동아일보",
      "donga.com": "동아일보",
      "www.hani.co.kr": "한겨레",
      "hani.co.kr": "한겨레",
      "www.khan.co.kr": "경향신문",
      "khan.co.kr": "경향신문",
      "www.sedaily.com": "서울경제",
      "sedaily.com": "서울경제",
      "www.edaily.co.kr": "이데일리",
      "edaily.co.kr": "이데일리",
      "www.mt.co.kr": "머니투데이",
      "mt.co.kr": "머니투데이",
      "www.fnnews.com": "파이낸셜뉴스",
      "fnnews.com": "파이낸셜뉴스",
      "www.newsis.com": "뉴시스",
      "newsis.com": "뉴시스",
      "www.yna.co.kr": "연합뉴스",
      "yna.co.kr": "연합뉴스",
      "www.ytn.co.kr": "YTN",
      "ytn.co.kr": "YTN",
      "www.sbs.co.kr": "SBS",
      "sbs.co.kr": "SBS",
      "www.kbs.co.kr": "KBS",
      "kbs.co.kr": "KBS",
      "www.mbc.co.kr": "MBC",
      "mbc.co.kr": "MBC",
      "biz.chosun.com": "조선비즈",
      "realestate.chosun.com": "조선부동산",
      "land.naver.com": "네이버부동산",
    };

    return sourceMap[hostname] || hostname.split(".")[0];
  } catch {
    return "언론사";
  }
}

/**
 * RFC 2822 날짜를 ISO 8601로 변환
 */
function parseRfcDate(rfcDate: string): string {
  try {
    return new Date(rfcDate).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * 네이버 뉴스 검색 API 호출
 *
 * @param query 검색어 (아파트명, 지역명 등)
 * @param display 결과 개수 (1~100, 기본 10)
 * @param sort 정렬 기준 ("date": 날짜순, "sim": 정확도순)
 */
export async function searchNaverNews(
  query: string,
  display: number = 10,
  sort: "date" | "sim" = "date"
): Promise<CleanNewsItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[NaverNews] API credentials not configured");
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      display: String(Math.min(display, 100)),
      start: "1",
      sort,
    });

    const response = await fetch(`${NAVER_API_URL}?${params.toString()}`, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!response.ok) {
      console.error(`[NaverNews] API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: NaverNewsResponse = await response.json();

    return data.items.map((item) => ({
      title: stripHtml(item.title),
      link: item.link,
      originalLink: item.originallink,
      description: stripHtml(item.description),
      publishDate: parseRfcDate(item.pubDate),
      source: extractSource(item.link, item.originallink),
    }));
  } catch (error) {
    console.error("[NaverNews] Search failed:", error);
    return [];
  }
}

/**
 * 아파트 관련 뉴스 검색 (아파트명 + 지역명 조합)
 */
export async function searchApartmentNews(
  aptName: string,
  sigungu: string,
  dong: string,
  count: number = 10
): Promise<CleanNewsItem[]> {
  // 1차: 아파트명으로 검색
  const aptResults = await searchNaverNews(`${aptName} 아파트`, Math.ceil(count / 2), "date");

  // 2차: 지역명 + 부동산으로 검색
  const regionQuery = `${sigungu} ${dong} 부동산`;
  const regionResults = await searchNaverNews(regionQuery, Math.ceil(count / 2), "date");

  // 중복 제거 (링크 기준)
  const seen = new Set<string>();
  const merged: CleanNewsItem[] = [];

  for (const item of [...aptResults, ...regionResults]) {
    if (!seen.has(item.link)) {
      seen.add(item.link);
      merged.push(item);
    }
  }

  // 날짜순 정렬 후 반환
  return merged
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, count);
}

/**
 * 지역 부동산 동향 뉴스 검색
 */
export async function searchRegionNews(
  sigungu: string,
  count: number = 10
): Promise<CleanNewsItem[]> {
  return searchNaverNews(`${sigungu} 부동산 시세`, count, "date");
}
