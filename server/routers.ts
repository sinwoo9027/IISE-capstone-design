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
} from "./db";
import {
  calculateDistance,
  calculateTransportScore,
  calculateInvestmentScore,
  calculateTrendScore,
  calculateFinalScore,
  interpretTransportScore,
  interpretTrendScore,
} from "./recommender";
import { createCheckoutSession } from "./stripe";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  recommendations: router({
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
          // 예산을 숫자로 변환 (억 단위 → 원 단위)
          const budgetKrw = parseInt(input.budget) * 100000000;
          const minAreaM2 = parseInt(input.minArea);

          if (isNaN(budgetKrw) || isNaN(minAreaM2)) {
            return {
              success: false,
              error: "예산과 면적을 올바르게 입력해주세요.",
              recommendations: [],
            };
          }

          // 1. 조건에 맞는 아파트 조회
          const filteredApts = await getFilteredApartments({
            maxPriceKrw: budgetKrw,
            minAreaM2: minAreaM2,
          });

          if (filteredApts.length === 0) {
            return {
              success: false,
              error: "조건에 맞는 아파트가 없습니다. 예산이나 면적을 조정해주세요.",
              recommendations: [],
            };
          }

          // 2. 각 아파트에 대한 점수 계산
          const scoredApts = await Promise.all(
            filteredApts.map(async (item) => {
              const apt = item.apt;
              if (!apt) return null;

              try {
                // 거래 이력 조회
                const transactions = await getApartmentTransactions(apt.id);

                // 지하철역 조회
                const subwayStations = await getNearbySubwayStations(
                  parseFloat(apt.lat),
                  parseFloat(apt.lng)
                );

                // 거리 계산
                const subwayInfo = subwayStations.map((station) => ({
                  stationName: station.stationName,
                  line: station.line,
                  distance: calculateDistance(
                    parseFloat(apt.lat),
                    parseFloat(apt.lng),
                    parseFloat(station.lat),
                    parseFloat(station.lng)
                  ),
                  isTransfer: station.isTransfer,
                }));

                // 점수 계산
                const transportScore = calculateTransportScore(subwayInfo);
                const investmentScore = calculateInvestmentScore(apt, input.investmentType);
                const trendScore = calculateTrendScore(
                  transactions.map((t) => ({
                    contractDate: t.contractDate,
                    priceKrw: t.priceKrw,
                  }))
                );

                const finalScore = calculateFinalScore({
                  transportScore,
                  investmentScore,
                  trendScore,
                  transportImportance: input.transportImportance,
                });

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
                  latestPrice: item.latestPrice,
                  latestArea: item.latestArea,
                  transportScore: Math.round(transportScore),
                  investmentScore: Math.round(investmentScore),
                  trendScore: Math.round(trendScore),
                  finalScore: Math.round(finalScore),
                  nearbySubways: subwayInfo.slice(0, 3),
                  transactionCount: transactions.length,
                };
              } catch (error) {
                console.error(`[Recommender] Error scoring apartment ${apt.id}:`, error);
                return null;
              }
            })
          );

          // null 제거 및 점수순 정렬
          const validApts = scoredApts
            .filter((apt) => apt !== null)
            .sort((a, b) => (b?.finalScore || 0) - (a?.finalScore || 0))
            .slice(0, 5);

          if (validApts.length === 0) {
            return {
              success: false,
              error: "추천 계산 중 오류가 발생했습니다.",
              recommendations: [],
            };
          }

          // 3. 사용자 선호도 저장
          await saveUserPreference(ctx.user.id, {
            budget: input.budget,
            minArea: input.minArea,
            investmentType: input.investmentType,
            transportImportance: input.transportImportance,
            preferredSigungu: input.preferredSigungu,
          });

          // 4. 추천 결과 저장
          for (const apt of validApts) {
            if (apt) {
              await saveRecommendation({
                userId: ctx.user.id,
                aptId: apt.aptId,
                score: apt.finalScore.toString(),
                transportScore: apt.transportScore.toString(),
                investmentScore: apt.investmentScore.toString(),
                trendScore: apt.trendScore.toString(),
                explanation: `${apt.aptName}은(는) 교통 접근성과 투자 가치를 고려했을 때 좋은 선택입니다.`,
              });
            }
          }

          return {
            success: true,
            recommendations: validApts,
            message: `${validApts.length}개의 아파트를 추천했습니다.`,
          };
        } catch (error) {
          console.error("[Recommendations] Error:", error);
          return {
            success: false,
            error: "추천 계산 중 오류가 발생했습니다.",
            recommendations: [],
          };
        }
      }),

    getRecommendationHistory: protectedProcedure.query(async ({ ctx }) => {
      try {
        const recommendations = await getUserRecommendations(ctx.user.id);
        return {
          success: true,
          recommendations,
        };
      } catch (error) {
        console.error("[Recommendations] Error fetching history:", error);
        return {
          success: false,
          recommendations: [],
        };
      }
    }),

    getApartmentDetail: publicProcedure
      .input(z.object({ aptId: z.number() }))
      .query(async ({ input }) => {
        try {
          const apt = await getApartmentById(input.aptId);
          if (!apt) {
            return {
              success: false,
              apartment: null,
            };
          }

          const transactions = await getApartmentTransactions(input.aptId);
          const subwayStations = await getNearbySubwayStations(
            parseFloat(apt.lat),
            parseFloat(apt.lng)
          );

          return {
            success: true,
            apartment: apt,
            transactions,
            subwayStations,
          };
        } catch (error) {
          console.error("[Recommendations] Error fetching detail:", error);
          return {
            success: false,
            apartment: null,
          };
        }
      }),
  }),

  payments: router({
    createCheckout: protectedProcedure
      .input(
        z.object({
          planId: z.enum(["premium", "enterprise"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const origin = ctx.req.headers.origin || "https://aptgpt.manus.space";
          const result = await createCheckoutSession({
            userId: ctx.user.id,
            userEmail: ctx.user.email || "",
            userName: ctx.user.name || "User",
            planId: input.planId,
            origin,
          });
          return result;
        } catch (error) {
          console.error("[Payments] Error:", error);
          return {
            success: false,
            error: "결제 세션 생성에 실패했습니다.",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
