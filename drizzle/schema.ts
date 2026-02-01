import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Apartments table - 아파트 기본 정보
 */
export const apartments = mysqlTable("apartments", {
  id: int("id").autoincrement().primaryKey(),
  aptName: varchar("apt_name", { length: 255 }).notNull(),
  sigungu: varchar("sigungu", { length: 100 }).notNull(),
  dong: varchar("dong", { length: 100 }).notNull(),
  lat: varchar("lat", { length: 50 }).notNull(),
  lng: varchar("lng", { length: 50 }).notNull(),
  builtYear: int("built_year"),
  households: int("households"),
  reprAreaM2: varchar("repr_area_m2", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Apartment = typeof apartments.$inferSelect;
export type InsertApartment = typeof apartments.$inferInsert;

/**
 * Transactions table - 실거래가 정보
 */
export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    aptId: int("apt_id").notNull(),
    contractDate: varchar("contract_date", { length: 50 }).notNull(),
    priceKrw: varchar("price_krw", { length: 50 }).notNull(),
    areaM2: varchar("area_m2", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    aptIdIdx: index("apt_id_idx").on(table.aptId),
    contractDateIdx: index("contract_date_idx").on(table.contractDate),
  })
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Subway stations table - 지하철역 정보
 */
export const subwayStations = mysqlTable("subway_stations", {
  id: int("id").autoincrement().primaryKey(),
  stationName: varchar("station_name", { length: 255 }).notNull(),
  line: varchar("line", { length: 100 }).notNull(),
  lat: varchar("lat", { length: 50 }).notNull(),
  lng: varchar("lng", { length: 50 }).notNull(),
  isTransfer: int("is_transfer").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubwayStation = typeof subwayStations.$inferSelect;
export type InsertSubwayStation = typeof subwayStations.$inferInsert;

/**
 * User preferences table - 사용자 선호도
 */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  budget: varchar("budget", { length: 50 }).notNull(),
  minArea: varchar("min_area", { length: 50 }).notNull(),
  investmentType: varchar("investment_type", { length: 50 }).notNull(),
  transportImportance: int("transport_importance").notNull(),
  preferredSigungu: varchar("preferred_sigungu", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

/**
 * Recommendations table - 추천 결과 저장
 */
export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  aptId: int("apt_id").notNull(),
  score: varchar("score", { length: 50 }).notNull(),
  transportScore: varchar("transport_score", { length: 50 }).notNull(),
  investmentScore: varchar("investment_score", { length: 50 }).notNull(),
  trendScore: varchar("trend_score", { length: 50 }).notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;