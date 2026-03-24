import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getFilteredApartments,
  getApartmentTransactions,
  getNearbySubwayStations,
  saveUserPreference,
  saveRecommendation,
  getApartmentById,
  getUserRecommendations,
  getApartmentNews,
  getApartmentRebuildStatus,
} from "./db";
import { calculateDistance } from "./recommender";
import {
  scoreTransport,
  scoreScale,
  scoreRebuild,
  scorePriceTrend,
  scoreJeonseRatio,
  calculateFinalScore,
  generateExplanation,
  type SubwayStationForScoring,
  type TransactionForScoring,
  type RebuildStatusForScoring,
} from "./recommender-capstone";
import {
  generateBriefing,
  generateIssuesSummary,
  generateInvestmentPoints,
  generateCautionPoints,
  generateLocationVibe,
  extractNewsKeywords,
  type ApartmentData,
  type SubwayData,
  type TransactionData as InsightTxData,
  type NewsData,
  type RebuildData,
} from "./apartment-insights";
import { createCheckoutSession } from "./stripe";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  recommendations: router({
    /**
     * 캡스톤 계획서 기준 추천 API
     * Hard Filter (예산, 최소 평형) + Soft Scoring (5개 지표)
     */
    getRecommendations: protectedProcedure
      .input(
        z.object({
          budget: z.string(),
          minArea: z.string(),
          investmentType: z.enum(["stable", "profit"]),
          transportImportance: z.number().min(1).max(5),
          preferredSigungu: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const budgetKrw = parseInt(input.budget) * 100000000;
          const minAreaM2 = parseInt(input.minArea);

          if (isNaN(budgetKrw) || isNaN(minAreaM2)) {
            return { success: false, error: "예산과 면적을 올바르게 입력해주세요.", recommendations: [] };
          }

          // 1. Hard Filter: DB에서 예산/면적 조건에 맞는 아파트 조회
          const filteredApts = await getFilteredApartments({ maxPriceKrw: budgetKrw, minAreaM2 });

          if (filteredApts.length === 0) {
            return { success: false, error: "조건에 맞는 아파트가 없습니다. 예산이나 면적을 조정해주세요.", recommendations: [] };
          }

          // 2. Soft Scoring: 5개 지표 계산
          const transportImportance = input.transportImportance as 1 | 2 | 3 | 4 | 5;

          const scoredApts = await Promise.all(
            filteredApts.map(async (item) => {
              const apt = item.apt;
              if (!apt) return null;

              try {
                const [txs, stations, rebuildStatus] = await Promise.all([
                  getApartmentTransactions(apt.id),
                  getNearbySubwayStations(parseFloat(apt.lat), parseFloat(apt.lng)),
                  getApartmentRebuildStatus(apt.id),
                ]);

                // 지하철역 거리 계산
                const subwayInfo: SubwayStationForScoring[] = stations.map((s) => ({
                  station_name: s.stationName,
                  line: s.line,
                  distance_km: calculateDistance(
                    parseFloat(apt.lat), parseFloat(apt.lng),
                    parseFloat(s.lat), parseFloat(s.lng)
                  ),
                  is_transfer: (s.isTransfer ?? 0) === 1,
                }));

                // 거래 데이터 변환
                const txData: TransactionForScoring[] = txs.map((t) => ({
                  contract_date: t.contractDate,
                  price_krw: parseInt(t.priceKrw),
                }));

                // 재건축 데이터 변환
                const rebuildData: RebuildStatusForScoring | undefined = rebuildStatus
                  ? {
                      is_rebuild_candidate: (rebuildStatus.isRebuildCandidate ?? 0) === 1,
                      stage: rebuildStatus.stage ?? undefined,
                    }
                  : undefined;

                // 5개 지표 계산
                const scores = {
                  transport: scoreTransport(subwayInfo, transportImportance),
                  scale: scoreScale(apt.households ?? 0),
                  rebuild: scoreRebuild(apt.builtYear ?? 2000, rebuildData),
                  priceTrend: scorePriceTrend(txData),
                  jeonseRatio: scoreJeonseRatio(item.latestPrice || 0),
                };

                // 최종 점수
                const finalScore = calculateFinalScore(
                  scores,
                  input.investmentType,
                  transportImportance
                );

                // 자연어 설명 생성
                const explanation = generateExplanation(
                  {
                    apartment: {
                      apt_id: apt.id,
                      apt_name: apt.aptName,
                      region: `${apt.sigungu} ${apt.dong}`,
                      price_krw: item.latestPrice || 0,
                      area_m2: parseFloat(apt.reprAreaM2 ?? "0"),
                      built_year: apt.builtYear ?? 2000,
                      households: apt.households ?? 0,
                      lat: parseFloat(apt.lat),
                      lng: parseFloat(apt.lng),
                    },
                    nearby_subways: subwayInfo,
                    transactions: txData,
                    rebuild_status: rebuildData,
                    user_budget_won: budgetKrw,
                    user_min_area_m2: minAreaM2,
                    user_investment_type: input.investmentType,
                    user_transport_importance: transportImportance,
                  },
                  scores
                );

                return {
                  aptId: apt.id,
                  aptName: apt.aptName,
                  sigungu: apt.sigungu,
                  dong: apt.dong,
                  lat: apt.lat,
                  lng: apt.lng,
                  builtYear: apt.builtYear,
                  households: apt.households,
                  reprAreaM2: apt.reprAreaM2,
                  latestPrice: item.latestPrice || 0,
                  latestArea: item.latestArea || 0,
                  // 5개 지표 점수
                  scores: {
                    transport: Math.round(scores.transport),
                    scale: Math.round(scores.scale),
                    rebuild: Math.round(scores.rebuild),
                    priceTrend: Math.round(scores.priceTrend),
                    jeonseRatio: Math.round(scores.jeonseRatio),
                  },
                  finalScore: Math.round(finalScore),
                  explanation,
                  nearbySubways: subwayInfo.slice(0, 5).map((s) => ({
                    stationName: s.station_name,
                    line: s.line,
                    distanceM: Math.round(s.distance_km * 1000),
                  })),
                  transactionCount: txs.length,
                  hasRebuild: !!rebuildData?.is_rebuild_candidate,
                };
              } catch (error) {
                console.error(`[Recommender] Error scoring apartment ${apt.id}:`, error);
                return null;
              }
            })
          );

          const validApts = scoredApts
            .filter((a): a is NonNullable<typeof a> => a !== null)
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, 5);

          if (validApts.length === 0) {
            return { success: false, error: "추천 계산 중 오류가 발생했습니다.", recommendations: [] };
          }

          // 3. Save preference
          await saveUserPreference(ctx.user.id, {
            budget: input.budget,
            minArea: input.minArea,
            investmentType: input.investmentType,
            transportImportance: input.transportImportance,
            preferredSigungu: input.preferredSigungu,
          });

          // 4. Save recommendations
          for (const apt of validApts) {
            await saveRecommendation({
              userId: ctx.user.id,
              aptId: apt.aptId,
              score: apt.finalScore.toString(),
              transportScore: apt.scores.transport.toString(),
              investmentScore: "0",
              trendScore: "0",
              scaleScore: apt.scores.scale.toString(),
              rebuildScore: apt.scores.rebuild.toString(),
              priceTrendScore: apt.scores.priceTrend.toString(),
              jeonseRatioScore: apt.scores.jeonseRatio.toString(),
              explanation: apt.explanation,
            });
          }

          return {
            success: true,
            recommendations: validApts,
            message: `${validApts.length}개의 아파트를 추천했습니다.`,
          };
        } catch (error) {
          console.error("[Recommendations] Error:", error);
          return { success: false, error: "추천 계산 중 오류가 발생했습니다.", recommendations: [] };
        }
      }),

    getRecommendationHistory: protectedProcedure.query(async ({ ctx }) => {
      try {
        return { success: true, recommendations: await getUserRecommendations(ctx.user.id) };
      } catch (error) {
        console.error("[Recommendations] Error fetching history:", error);
        return { success: false, recommendations: [] };
      }
    }),

    /**
     * 상세 페이지 API - 비정형 정보 포함
     */
    getApartmentDetail: publicProcedure
      .input(z.object({ aptId: z.number() }))
      .query(async ({ input }) => {
        try {
          const apt = await getApartmentById(input.aptId);
          if (!apt)
            return {
              success: false,
              apartment: null,
              transactions: [],
              subwayStations: [],
              news: [],
              rebuildStatus: null,
              insights: null,
            };

          const [txs, stations, news, rebuildStatus] = await Promise.all([
            getApartmentTransactions(input.aptId),
            getNearbySubwayStations(parseFloat(apt.lat), parseFloat(apt.lng)),
            getApartmentNews(input.aptId),
            getApartmentRebuildStatus(input.aptId),
          ]);

          // apartment-insights.ts 인터페이스에 맞게 데이터 변환
          const aptData: ApartmentData = {
            id: apt.id,
            aptName: apt.aptName,
            sigungu: apt.sigungu,
            dong: apt.dong,
            builtYear: apt.builtYear,
            households: apt.households,
            reprAreaM2: apt.reprAreaM2,
            lat: apt.lat,
            lng: apt.lng,
          };

          const subwayData: SubwayData[] = stations.map((s) => ({
            stationName: s.stationName,
            line: s.line,
            distance: calculateDistance(parseFloat(apt.lat), parseFloat(apt.lng), parseFloat(s.lat), parseFloat(s.lng)) * 1000,
            isTransfer: (s.isTransfer ?? 0) === 1,
          }));

          const txData: InsightTxData[] = txs.map((t) => ({
            contractDate: t.contractDate,
            priceKrw: t.priceKrw,
            areaM2: t.areaM2,
          }));

          const newsData: NewsData[] = news.map((n) => ({
            title: typeof n.title === "string" ? n.title : "",
            source: n.source || "",
            publishDate: n.publishDate ? n.publishDate.toISOString() : "",
            link: typeof n.link === "string" ? n.link : "",
          }));

          const rebuildData: RebuildData = {
            stage: rebuildStatus?.stage ?? null,
            isRebuildCandidate: (rebuildStatus?.isRebuildCandidate ?? 0) === 1,
          };

          // 5개 지표 점수 계산 (상세 페이지에서도 표시)
          const subwayForScoring: SubwayStationForScoring[] = stations.map((s) => ({
            station_name: s.stationName,
            line: s.line,
            distance_km: calculateDistance(parseFloat(apt.lat), parseFloat(apt.lng), parseFloat(s.lat), parseFloat(s.lng)),
            is_transfer: (s.isTransfer ?? 0) === 1,
          }));

          const txForScoring: TransactionForScoring[] = txs.map((t) => ({
            contract_date: t.contractDate,
            price_krw: parseInt(t.priceKrw),
          }));

          const rebuildForScoring: RebuildStatusForScoring | undefined = rebuildStatus
            ? {
                is_rebuild_candidate: (rebuildStatus.isRebuildCandidate ?? 0) === 1,
                stage: rebuildStatus.stage ?? undefined,
              }
            : undefined;

          const latestPrice = txs.length > 0 ? parseInt(txs[0].priceKrw) : 0;

          const detailScores = {
            transport: Math.round(scoreTransport(subwayForScoring, 3)),
            scale: Math.round(scoreScale(apt.households ?? 0)),
            rebuild: Math.round(scoreRebuild(apt.builtYear ?? 2000, rebuildForScoring)),
            priceTrend: Math.round(scorePriceTrend(txForScoring)),
            jeonseRatio: Math.round(scoreJeonseRatio(latestPrice)),
          };

          const insights = {
            briefing: generateBriefing(aptData, subwayData, txData, rebuildData),
            issuesSummary: generateIssuesSummary(newsData, aptData, rebuildData),
            investmentPoints: generateInvestmentPoints(aptData, subwayData, txData, rebuildData),
            cautionPoints: generateCautionPoints(aptData, subwayData, txData, rebuildData, newsData),
            locationVibe: generateLocationVibe(aptData, subwayData, newsData),
            newsKeywords: extractNewsKeywords(newsData),
          };

          return {
            success: true,
            apartment: apt,
            transactions: txs,
            subwayStations: stations.map((s) => ({
              ...s,
              distanceM: Math.round(
                calculateDistance(parseFloat(apt.lat), parseFloat(apt.lng), parseFloat(s.lat), parseFloat(s.lng)) * 1000
              ),
            })),
            news,
            rebuildStatus,
            scores: detailScores,
            insights,
          };
        } catch (error) {
          console.error("[Recommendations] Error fetching detail:", error);
          return {
            success: false,
            apartment: null,
            transactions: [],
            subwayStations: [],
            news: [],
            rebuildStatus: null,
            scores: null,
            insights: null,
          };
        }
      }),

    /**
     * LLM 기반 추천 이유 설명
     */
    explainRecommendation: protectedProcedure
      .input(
        z.object({
          aptId: z.number(),
          userQuestion: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const apt = await getApartmentById(input.aptId);
          if (!apt) return { success: false, explanation: "아파트 정보를 찾을 수 없습니다." };

          const [txs, stations, news, rebuildStatus] = await Promise.all([
            getApartmentTransactions(input.aptId),
            getNearbySubwayStations(parseFloat(apt.lat), parseFloat(apt.lng)),
            getApartmentNews(input.aptId),
            getApartmentRebuildStatus(input.aptId),
          ]);

          const subwayInfo = stations.map((s) => ({
            name: s.stationName,
            line: s.line,
            distanceM: Math.round(
              calculateDistance(parseFloat(apt.lat), parseFloat(apt.lng), parseFloat(s.lat), parseFloat(s.lng)) * 1000
            ),
          }));

          const systemPrompt = `당신은 한국 부동산 전문 분석가입니다. 아파트 추천 이유를 사용자에게 쉽고 명확하게 설명합니다.
데이터에 기반한 객관적인 분석을 제공하되, 투자 조언이 아닌 정보 제공임을 명시하세요.
한국어로 답변하세요. 간결하고 핵심적인 내용 위주로 3-5문장으로 답변하세요.`;

          const dataContext = `
아파트: ${apt.aptName} (${apt.sigungu} ${apt.dong})
건축년도: ${apt.builtYear || "정보 없음"}
세대수: ${apt.households || "정보 없음"}
대표면적: ${apt.reprAreaM2 || "정보 없음"}㎡
최근 거래가: ${txs.length > 0 ? (parseInt(txs[0].priceKrw) / 100000000).toFixed(1) + "억원" : "정보 없음"}
거래 건수: ${txs.length}건
주변 지하철: ${subwayInfo.slice(0, 3).map((s) => `${s.name}(${s.line}, ${s.distanceM}m)`).join(", ") || "없음"}
재건축 현황: ${rebuildStatus ? rebuildStatus.stage : "해당 없음"}
관련 뉴스: ${news.slice(0, 3).map((n) => n.title).join("; ") || "없음"}`;

          const userMsg = input.userQuestion || "이 아파트를 왜 추천했나요? 점수 계산 근거를 설명해주세요.";

          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `다음 아파트 데이터를 참고하여 질문에 답변해주세요.\n\n${dataContext}\n\n질문: ${userMsg}` },
            ],
          });

          const explanation = response.choices?.[0]?.message?.content || "설명을 생성할 수 없습니다.";
          return { success: true, explanation };
        } catch (error) {
          console.error("[LLM] Error:", error);
          return { success: false, explanation: "AI 설명 생성 중 오류가 발생했습니다." };
        }
      }),
  }),

  payments: router({
    createCheckout: protectedProcedure
      .input(z.object({ planId: z.enum(["premium", "enterprise"]) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const origin = ctx.req.headers.origin || "https://aptgpt.manus.space";
          return await createCheckoutSession({
            userId: ctx.user.id,
            userEmail: ctx.user.email || "",
            userName: ctx.user.name || "User",
            planId: input.planId,
            origin,
          });
        } catch (error) {
          console.error("[Payments] Error:", error);
          return { success: false, error: "결제 세션 생성에 실패했습니다." };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
