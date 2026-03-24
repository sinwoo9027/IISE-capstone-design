/**
 * 뉴스 서비스 모듈
 * - 네이버 뉴스 API 호출 + DB 캐싱 (24시간 TTL)
 * - LLM 뉴스 분석 + DB 캐싱 (24시간 TTL)
 * - 캐시 히트 시 DB에서 직접 반환
 */

import { getDb } from "./db";
import { newsCache, newsAnalysis } from "../drizzle/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { searchApartmentNews, searchRegionNews, type CleanNewsItem } from "./api-naver-news";
import { analyzeNews, type NewsAnalysisResult } from "./news-analyzer";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

function makeAptKey(aptId: number): string {
  return `apt:${aptId}`;
}

function makeRegionKey(sigungu: string): string {
  return `region:${sigungu}`;
}

/**
 * 캐시된 뉴스 조회 (TTL 체크)
 */
async function getCachedNews(queryKey: string): Promise<CleanNewsItem[] | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const cutoff = new Date(Date.now() - CACHE_TTL_MS);
    const cached = await db
      .select()
      .from(newsCache)
      .where(
        and(
          eq(newsCache.queryKey, queryKey),
          gte(newsCache.fetchedAt, cutoff)
        )
      )
      .orderBy(desc(newsCache.publishDate))
      .limit(20);

    if (cached.length === 0) return null;

    return cached.map((row: any) => ({
      title: row.title as string,
      link: row.link as string,
      originalLink: (row.originalLink || row.link) as string,
      description: (row.description || "") as string,
      publishDate: row.publishDate ? new Date(row.publishDate).toISOString() : new Date().toISOString(),
      source: (row.source || "언론사") as string,
    }));
  } catch (error) {
    console.error("[NewsService] Cache read error:", error);
    return null;
  }
}

/**
 * 뉴스를 DB에 캐싱
 */
async function cacheNews(queryKey: string, items: CleanNewsItem[]): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // 기존 캐시 삭제
    await db.delete(newsCache).where(eq(newsCache.queryKey, queryKey));

    // 새 데이터 삽입
    if (items.length > 0) {
      await db.insert(newsCache).values(
        items.map((item) => ({
          queryKey,
          title: item.title,
          link: item.link,
          originalLink: item.originalLink,
          description: item.description,
          publishDate: new Date(item.publishDate),
          source: item.source,
        }))
      );
    }
  } catch (error) {
    console.error("[NewsService] Cache write error:", error);
  }
}

/**
 * 캐시된 분석 결과 조회 (TTL 체크)
 */
async function getCachedAnalysis(queryKey: string): Promise<NewsAnalysisResult | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const cutoff = new Date(Date.now() - CACHE_TTL_MS);
    const cached = await db
      .select()
      .from(newsAnalysis)
      .where(
        and(
          eq(newsAnalysis.queryKey, queryKey),
          gte(newsAnalysis.analyzedAt, cutoff)
        )
      )
      .limit(1);

    if (cached.length === 0) return null;

    const row = cached[0];
    return {
      summary: row.summary || "",
      sentimentTags: row.sentimentTags ? JSON.parse(row.sentimentTags) : [],
      regionTrend: row.regionTrend || "",
    };
  } catch (error) {
    console.error("[NewsService] Analysis cache read error:", error);
    return null;
  }
}

/**
 * 분석 결과를 DB에 캐싱
 */
async function cacheAnalysis(queryKey: string, result: NewsAnalysisResult): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const existing = await db
      .select()
      .from(newsAnalysis)
      .where(eq(newsAnalysis.queryKey, queryKey))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(newsAnalysis)
        .set({
          summary: result.summary,
          sentimentTags: JSON.stringify(result.sentimentTags),
          regionTrend: result.regionTrend,
          analyzedAt: new Date(),
        })
        .where(eq(newsAnalysis.queryKey, queryKey));
    } else {
      await db.insert(newsAnalysis).values({
        queryKey,
        summary: result.summary,
        sentimentTags: JSON.stringify(result.sentimentTags),
        regionTrend: result.regionTrend,
      });
    }
  } catch (error) {
    console.error("[NewsService] Analysis cache write error:", error);
  }
}

/**
 * 아파트 관련 뉴스 가져오기 (캐시 우선)
 */
export async function getApartmentNews(
  aptId: number,
  aptName: string,
  sigungu: string,
  dong: string,
  count: number = 10
): Promise<CleanNewsItem[]> {
  const key = makeAptKey(aptId);

  // 1. 캐시 확인
  const cached = await getCachedNews(key);
  if (cached) {
    console.log(`[NewsService] Cache hit for ${key}`);
    return cached.slice(0, count);
  }

  // 2. API 호출
  console.log(`[NewsService] Cache miss for ${key}, fetching from Naver...`);
  const items = await searchApartmentNews(aptName, sigungu, dong, count);

  // 3. 캐싱
  if (items.length > 0) {
    await cacheNews(key, items);
  }

  return items;
}

/**
 * 지역 뉴스 가져오기 (캐시 우선)
 */
export async function getRegionNews(
  sigungu: string,
  count: number = 10
): Promise<CleanNewsItem[]> {
  const key = makeRegionKey(sigungu);

  const cached = await getCachedNews(key);
  if (cached) {
    console.log(`[NewsService] Cache hit for ${key}`);
    return cached.slice(0, count);
  }

  console.log(`[NewsService] Cache miss for ${key}, fetching from Naver...`);
  const items = await searchRegionNews(sigungu, count);

  if (items.length > 0) {
    await cacheNews(key, items);
  }

  return items;
}

/**
 * 뉴스 분석 결과 가져오기 (캐시 우선, LLM 호출)
 */
export async function getNewsAnalysis(
  aptId: number,
  aptName: string,
  sigungu: string,
  dong: string,
  newsItems?: CleanNewsItem[]
): Promise<NewsAnalysisResult> {
  const key = makeAptKey(aptId);

  // 1. 캐시 확인
  const cached = await getCachedAnalysis(key);
  if (cached) {
    console.log(`[NewsService] Analysis cache hit for ${key}`);
    return cached;
  }

  // 2. 뉴스가 없으면 먼저 가져오기
  const items = newsItems || (await getApartmentNews(aptId, aptName, sigungu, dong));

  // 3. LLM 분석
  console.log(`[NewsService] Analyzing ${items.length} news items for ${key}...`);
  const result = await analyzeNews(items, aptName, sigungu, dong);

  // 4. 캐싱
  await cacheAnalysis(key, result);

  return result;
}

/**
 * 지역 동향 분석 가져오기
 */
export async function getRegionTrendAnalysis(
  sigungu: string
): Promise<{ trend: string; news: CleanNewsItem[] }> {
  const key = makeRegionKey(sigungu);

  const news = await getRegionNews(sigungu, 10);

  const cachedAnalysis = await getCachedAnalysis(key);
  if (cachedAnalysis) {
    return { trend: cachedAnalysis.regionTrend, news };
  }

  if (news.length > 0) {
    const result = await analyzeNews(news, sigungu, sigungu, "");
    await cacheAnalysis(key, result);
    return { trend: result.regionTrend, news };
  }

  return {
    trend: `${sigungu} 지역의 부동산 동향 데이터를 수집 중입니다.`,
    news: [],
  };
}
