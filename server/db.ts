import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, apartments, transactions, subwayStations, userPreferences, recommendations } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
    const values: InsertUser = {
      openId: user.openId,
    };
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
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Apartment Queries ====================

/**
 * 예산과 면적 조건에 맞는 아파트 조회
 */
export async function getFilteredApartments(params: {
  maxPriceKrw: number;
  minAreaM2: number;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    // 최신 거래가 기준으로 필터링
    const result = await db
      .select({
        apt: apartments,
        latestPrice: sql<number>`MAX(CAST(${transactions.priceKrw} AS UNSIGNED))`,
        latestArea: sql<number>`MAX(CAST(${transactions.areaM2} AS UNSIGNED))`,
        latestDate: sql<string>`MAX(${transactions.contractDate})`,
      })
      .from(apartments)
      .leftJoin(
        transactions,
        eq(apartments.id, transactions.aptId)
      )
      .where(
        and(
          sql`CAST(${transactions.priceKrw} AS UNSIGNED) <= ${params.maxPriceKrw}`,
          sql`CAST(${transactions.areaM2} AS UNSIGNED) >= ${params.minAreaM2}`
        )
      )
      .groupBy(apartments.id)
      .orderBy(sql`MAX(${transactions.contractDate}) DESC`);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get filtered apartments:", error);
    return [];
  }
}

/**
 * 특정 아파트의 모든 거래 기록 조회
 */
export async function getApartmentTransactions(aptId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.aptId, aptId))
      .orderBy(desc(transactions.contractDate));

    return result;
  } catch (error) {
    console.error("[Database] Failed to get apartment transactions:", error);
    return [];
  }
}

/**
 * 특정 좌표 근처의 지하철역 조회 (반경 1km)
 */
export async function getNearbySubwayStations(lat: number, lng: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(subwayStations)
      .where(
        and(
          sql`ABS(CAST(${subwayStations.lat} AS DECIMAL(10,6)) - ${lat}) < 0.01`,
          sql`ABS(CAST(${subwayStations.lng} AS DECIMAL(10,6)) - ${lng}) < 0.01`
        )
      );

    return result;
  } catch (error) {
    console.error("[Database] Failed to get nearby subway stations:", error);
    return [];
  }
}

/**
 * 사용자 선호도 저장
 */
export async function saveUserPreference(userId: number, preference: {
  budget: string;
  minArea: string;
  investmentType: string;
  transportImportance: number;
  preferredSigungu?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(userPreferences).values({
      userId,
      ...preference,
    });

    return result;
  } catch (error) {
    console.error("[Database] Failed to save user preference:", error);
    return null;
  }
}

/**
 * 추천 결과 저장
 */
export async function saveRecommendation(data: {
  userId: number;
  aptId: number;
  score: string;
  transportScore: string;
  investmentScore: string;
  trendScore: string;
  explanation?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(recommendations).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to save recommendation:", error);
    return null;
  }
}

/**
 * 사용자의 추천 결과 조회
 */
export async function getUserRecommendations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.createdAt));

    return result;
  } catch (error) {
    console.error("[Database] Failed to get user recommendations:", error);
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
