import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  apartments,
  transactions,
  subwayStations,
  userPreferences,
  recommendations,
  newsInfo,
  rebuildStatusCurrent,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== User Queries ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== Apartment Queries ====================

/**
 * Hard Filter: 예산과 면적 조건에 맞는 아파트 조회
 */
export async function getFilteredApartments(params: {
  maxPriceKrw: number;
  minAreaM2: number;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select({
        apt: apartments,
        latestPrice: sql<number>`MAX(CAST(${transactions.priceKrw} AS UNSIGNED))`,
        latestArea: sql<number>`MAX(CAST(${transactions.areaM2} AS DECIMAL(10,2)))`,
        latestDate: sql<string>`MAX(${transactions.contractDate})`,
        txCount: sql<number>`COUNT(${transactions.id})`,
      })
      .from(apartments)
      .innerJoin(transactions, eq(apartments.id, transactions.aptId))
      .where(
        and(
          sql`CAST(${transactions.priceKrw} AS UNSIGNED) <= ${params.maxPriceKrw}`,
          sql`CAST(${transactions.areaM2} AS DECIMAL(10,2)) >= ${params.minAreaM2}`
        )
      )
      .groupBy(
        apartments.id,
        apartments.aptName,
        apartments.sigungu,
        apartments.dong,
        apartments.lat,
        apartments.lng,
        apartments.builtYear,
        apartments.households,
        apartments.reprAreaM2,
        apartments.createdAt,
        apartments.updatedAt
      );

    return result;
  } catch (error) {
    console.error("[Database] Failed to get filtered apartments:", error);
    return [];
  }
}

/**
 * 모든 아파트 목록 조회 (간략)
 */
export async function getAllApartments() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(apartments);
  } catch (error) {
    console.error("[Database] Failed to get all apartments:", error);
    return [];
  }
}

/**
 * 특정 아파트 조회
 */
export async function getApartmentById(aptId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(apartments)
      .where(eq(apartments.id, aptId))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get apartment:", error);
    return null;
  }
}

// ==================== Transaction Queries ====================

/**
 * 특정 아파트의 모든 거래 기록 조회
 */
export async function getApartmentTransactions(aptId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.aptId, aptId))
      .orderBy(desc(transactions.contractDate));
  } catch (error) {
    console.error("[Database] Failed to get apartment transactions:", error);
    return [];
  }
}

// ==================== Subway Queries ====================

/**
 * 특정 좌표 근처의 지하철역 조회 (반경 ~1.1km)
 */
export async function getNearbySubwayStations(lat: number, lng: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(subwayStations)
      .where(
        and(
          sql`ABS(CAST(${subwayStations.lat} AS DECIMAL(10,6)) - ${lat}) < 0.01`,
          sql`ABS(CAST(${subwayStations.lng} AS DECIMAL(10,6)) - ${lng}) < 0.01`
        )
      );
  } catch (error) {
    console.error("[Database] Failed to get nearby subway stations:", error);
    return [];
  }
}

// ==================== News Queries ====================

/**
 * 특정 아파트의 뉴스 정보 조회
 */
export async function getApartmentNews(aptId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(newsInfo)
      .where(eq(newsInfo.aptId, aptId))
      .orderBy(desc(newsInfo.publishDate));
  } catch (error) {
    console.error("[Database] Failed to get apartment news:", error);
    return [];
  }
}

// ==================== Rebuild Status Queries ====================

/**
 * 특정 아파트의 재건축 현황 조회
 */
export async function getApartmentRebuildStatus(aptId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(rebuildStatusCurrent)
      .where(eq(rebuildStatusCurrent.aptId, aptId))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get rebuild status:", error);
    return null;
  }
}

// ==================== User Preference Queries ====================

export async function saveUserPreference(
  userId: number,
  preference: {
    budget: string;
    minArea: string;
    investmentType: string;
    transportImportance: number;
    preferredSigungu?: string;
  }
) {
  const db = await getDb();
  if (!db) return null;

  try {
    return await db.insert(userPreferences).values({ userId, ...preference });
  } catch (error) {
    console.error("[Database] Failed to save user preference:", error);
    return null;
  }
}

// ==================== Recommendation Queries ====================

export async function saveRecommendation(data: {
  userId: number;
  aptId: number;
  score: string;
  transportScore: string;
  investmentScore: string;
  trendScore: string;
  scaleScore?: string;
  rebuildScore?: string;
  priceTrendScore?: string;
  jeonseRatioScore?: string;
  explanation?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    return await db.insert(recommendations).values(data);
  } catch (error) {
    console.error("[Database] Failed to save recommendation:", error);
    return null;
  }
}

export async function getUserRecommendations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get user recommendations:", error);
    return [];
  }
}
