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
  scaleScore: varchar("scale_score", { length: 50 }),
  rebuildScore: varchar("rebuild_score", { length: 50 }),
  priceTrendScore: varchar("price_trend_score", { length: 50 }),
  jeonseRatioScore: varchar("jeonse_ratio_score", { length: 50 }),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

/**
 * Subscriptions table - 구독 정보
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull().unique(),
  plan: varchar("plan", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Payments table - 결제 기록
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).notNull().unique(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * News_Info table - 최근 기사 정보
 */
export const newsInfo = mysqlTable(
  "news_info",
  {
    id: int("id").autoincrement().primaryKey(),
    newsId: varchar("news_id", { length: 255 }).notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary"),
    link: text("link").notNull(),
    originalLink: text("original_link"),
    publishDate: timestamp("publish_date"),
    source: varchar("source", { length: 100 }),
    regionCode: varchar("region_code", { length: 50 }),
    aptId: int("apt_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    aptIdIdx: index("news_apt_id_idx").on(table.aptId),
    regionCodeIdx: index("news_region_code_idx").on(table.regionCode),
    publishDateIdx: index("news_publish_date_idx").on(table.publishDate),
  })
);

export type NewsInfo = typeof newsInfo.$inferSelect;
export type InsertNewsInfo = typeof newsInfo.$inferInsert;

/**
 * News_Raw table - 원본 기사 데이터
 */
export const newsRaw = mysqlTable(
  "news_raw",
  {
    id: int("id").autoincrement().primaryKey(),
    newsId: varchar("news_id", { length: 255 }).notNull(),
    url: varchar("url", { length: 2048 }).notNull().unique(),
    crawledAt: timestamp("crawled_at").defaultNow(),
    contentText: text("content_text"),
    checksum: varchar("checksum", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    newsIdIdx: index("news_raw_news_id_idx").on(table.newsId),
    checksumIdx: index("news_raw_checksum_idx").on(table.checksum),
  })
);

export type NewsRaw = typeof newsRaw.$inferSelect;
export type InsertNewsRaw = typeof newsRaw.$inferInsert;

/**
 * Rebuild_Status_Current table - 현재 재건축 현황
 */
export const rebuildStatusCurrent = mysqlTable(
  "rebuild_status_current",
  {
    id: int("id").autoincrement().primaryKey(),
    aptId: int("apt_id").notNull().unique(),
    isRebuildCandidate: int("is_rebuild_candidate").default(0),
    stage: varchar("stage", { length: 50 }), // "추진위", "조합", "사업시행", "관리처분", "이주/철거", "착공", "준공"
    stageUpdatedAt: timestamp("stage_updated_at"),
    approvalDate: timestamp("approval_date"),
    managementDisposalDate: timestamp("management_disposal_date"),
    expectedHouseholds: int("expected_households"),
    updatedDate: timestamp("updated_date").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    aptIdIdx: index("rebuild_current_apt_id_idx").on(table.aptId),
    stageIdx: index("rebuild_current_stage_idx").on(table.stage),
  })
);

export type RebuildStatusCurrent = typeof rebuildStatusCurrent.$inferSelect;
export type InsertRebuildStatusCurrent = typeof rebuildStatusCurrent.$inferInsert;

/**
 * Rebuild_Status_History table - 재건축 현황 이력
 */
export const rebuildStatusHistory = mysqlTable(
  "rebuild_status_history",
  {
    id: int("id").autoincrement().primaryKey(),
    aptId: int("apt_id").notNull(),
    stage: varchar("stage", { length: 50 }).notNull(),
    effectiveFrom: timestamp("effective_from").notNull(),
    effectiveTo: timestamp("effective_to"),
    evidenceId: int("evidence_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    aptIdIdx: index("rebuild_history_apt_id_idx").on(table.aptId),
    stageIdx: index("rebuild_history_stage_idx").on(table.stage),
  })
);

export type RebuildStatusHistory = typeof rebuildStatusHistory.$inferSelect;
export type InsertRebuildStatusHistory = typeof rebuildStatusHistory.$inferInsert;

/**
 * Data_Evidence table - 데이터 출처 및 증거
 */
export const dataEvidence = mysqlTable(
  "data_evidence",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceType: varchar("source_type", { length: 100 }).notNull(), // "news", "rebuild", "transaction", etc.
    sourceUrl: text("source_url"),
    collectedAt: timestamp("collected_at").defaultNow(),
    rawPayload: text("raw_payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sourceTypeIdx: index("evidence_source_type_idx").on(table.sourceType),
  })
);

export type DataEvidence = typeof dataEvidence.$inferSelect;
export type InsertDataEvidence = typeof dataEvidence.$inferInsert;
