import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  HomeIcon,
  Train,
  Building2,
  Hammer,
  TrendingUp,
  Percent,
  MapPin,
  Calendar,
  Users,
  Ruler,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Newspaper,
  Sparkles,
  Globe,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";

/** 점수 게이지 (큰 버전) */
function ScoreGauge({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const getColor = (s: number) => {
    if (s >= 70) return "text-accent";
    if (s >= 40) return "text-foreground/70";
    return "text-foreground/40";
  };

  const getBgColor = (s: number) => {
    if (s >= 70) return "bg-accent";
    if (s >= 40) return "bg-foreground/50";
    return "bg-foreground/20";
  };

  return (
    <div className="text-center space-y-2">
      <div className="mx-auto w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${getColor(score)}`}>{score}</div>
      <div className="h-1 bg-muted rounded-full overflow-hidden mx-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getBgColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

/** 감성 태그 컴포넌트 */
function SentimentTag({ tag, sentiment }: { tag: string; sentiment: string }) {
  const colorMap: Record<string, string> = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    neutral: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700",
    caution: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  };

  const iconMap: Record<string, string> = {
    positive: "+",
    neutral: "·",
    caution: "!",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${colorMap[sentiment] || colorMap.neutral}`}
    >
      <span className="font-bold">{iconMap[sentiment] || "·"}</span>
      {tag}
    </span>
  );
}

export default function ApartmentDetail() {
  const [, params] = useRoute("/apartment/:id");
  const [, navigate] = useLocation();
  const aptId = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading, error } = trpc.recommendations.getApartmentDetail.useQuery(
    { aptId },
    { enabled: aptId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-foreground/10 bg-background sticky top-0 z-50">
          <div className="container flex items-center gap-3 py-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-accent rounded-lg flex items-center justify-center">
                <HomeIcon className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-sm font-bold">AptGPT</span>
            </div>
          </div>
        </header>
        <div className="flex flex-col h-[60vh] items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">실시간 데이터를 수집하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success || !data?.apartment) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-foreground/10 bg-background sticky top-0 z-50">
          <div className="container flex items-center gap-3 py-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-accent rounded-lg flex items-center justify-center">
                <HomeIcon className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-sm font-bold">AptGPT</span>
            </div>
          </div>
        </header>
        <div className="flex flex-col h-[60vh] items-center justify-center">
          <p className="text-muted-foreground mb-4">아파트 정보를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/")}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const apt = data.apartment;
  const scores = data.scores;
  const insights = data.insights;
  const txs = data.transactions || [];
  const stations = data.subwayStations || [];
  const news = data.news || [];
  const rebuildStatus = data.rebuildStatus;
  const newsAnalysis = data.newsAnalysis;
  const regionTrendData = data.regionTrendData;

  // 최신 거래가
  const latestPrice = txs.length > 0 ? parseInt(txs[0].priceKrw) : 0;
  const priceDisplay = latestPrice > 0 ? `${(latestPrice / 100000000).toFixed(1)}억` : "정보 없음";

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b border-foreground/10 bg-background sticky top-0 z-50">
        <div className="container flex items-center gap-3 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-accent rounded-lg flex items-center justify-center">
              <HomeIcon className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="text-sm font-bold">AptGPT</span>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl mx-auto">
        {/* ==================== 1. 헤더 섹션 ==================== */}
        <section className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">{apt.aptName}</h1>
              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {apt.sigungu} {apt.dong}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold text-accent">{priceDisplay}</p>
              <p className="text-xs text-muted-foreground">최근 거래가</p>
            </div>
          </div>

          {/* 한줄 브리핑 */}
          {insights?.briefing && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-accent">
              <p className="text-sm font-medium leading-relaxed">{insights.briefing}</p>
            </div>
          )}
        </section>

        {/* ==================== 2. 핵심 점수 5개 지표 ==================== */}
        {scores && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">평가 지표</h2>
            <Card className="p-6 border-foreground/5">
              <div className="grid grid-cols-5 gap-6">
                <ScoreGauge label="교통 편의성" score={scores.transport} icon={<Train className="h-5 w-5" />} />
                <ScoreGauge label="단지 규모" score={scores.scale} icon={<Building2 className="h-5 w-5" />} />
                <ScoreGauge label="재건축 기대" score={scores.rebuild} icon={<Hammer className="h-5 w-5" />} />
                <ScoreGauge label="가격 상승률" score={scores.priceTrend} icon={<TrendingUp className="h-5 w-5" />} />
                <ScoreGauge label="전세가율" score={scores.jeonseRatio} icon={<Percent className="h-5 w-5" />} />
              </div>
            </Card>
          </section>
        )}

        {/* ==================== 3. AI 뉴스 분석 (NEW) ==================== */}
        {newsAnalysis && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI 뉴스 분석
            </h2>

            {/* 요약 */}
            <Card className="p-5 border-foreground/5 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-2">핵심 요약</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {newsAnalysis.summary}
                  </p>
                </div>
              </div>
            </Card>

            {/* 감성 태그 */}
            {newsAnalysis.sentimentTags && newsAnalysis.sentimentTags.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  키워드 감성 분석
                </h3>
                <div className="flex flex-wrap gap-2">
                  {newsAnalysis.sentimentTags.map((item: any, idx: number) => (
                    <SentimentTag key={idx} tag={item.tag} sentiment={item.sentiment} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==================== 4. 지역 동향 (NEW) ==================== */}
        {regionTrendData && regionTrendData.trend && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              {apt.sigungu} 지역 동향
            </h2>
            <Card className="p-5 border-foreground/5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {regionTrendData.trend}
              </p>
              {regionTrendData.newsCount > 0 && (
                <p className="text-xs text-muted-foreground/60 mt-3">
                  최근 뉴스 {regionTrendData.newsCount}건 기반 분석
                </p>
              )}
            </Card>
          </section>
        )}

        {/* ==================== 5. 투자 포인트 vs 유의 포인트 ==================== */}
        {insights && (
          <section className="mb-8">
            <div className="grid grid-cols-2 gap-4">
              {/* 투자 포인트 */}
              <Card className="p-5 border-foreground/5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  투자 포인트
                </h3>
                <ul className="space-y-2">
                  {insights.investmentPoints.map((point: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 font-bold">+</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* 유의 포인트 */}
              <Card className="p-5 border-foreground/5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  유의 포인트
                </h3>
                <ul className="space-y-2">
                  {insights.cautionPoints.map((point: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 font-bold">!</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>
        )}

        {/* ==================== 6. 기본 정보 ==================== */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">기본 정보</h2>
          <Card className="p-5 border-foreground/5">
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  대표 면적
                </p>
                <p className="text-sm font-semibold">{apt.reprAreaM2 || "-"} ㎡</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  건축년도
                </p>
                <p className="text-sm font-semibold">{apt.builtYear || "-"}년</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  세대수
                </p>
                <p className="text-sm font-semibold">{apt.households || "-"}세대</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  거래 건수
                </p>
                <p className="text-sm font-semibold">{txs.length}건</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ==================== 7. 입지/생활 분위기 ==================== */}
        {insights?.locationVibe && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">입지 분위기</h2>
            <Card className="p-5 border-foreground/5">
              <p className="text-sm text-muted-foreground leading-relaxed">{insights.locationVibe}</p>
            </Card>
          </section>
        )}

        {/* ==================== 8. 주변 지하철역 ==================== */}
        {stations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">주변 지하철역</h2>
            <Card className="p-5 border-foreground/5">
              <div className="space-y-3">
                {stations.slice(0, 5).map((station: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Train className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{station.stationName}</p>
                        <p className="text-xs text-muted-foreground">{station.line}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{station.distanceM}m</p>
                      {station.isTransfer === 1 && (
                        <span className="text-[10px] text-accent font-medium">환승역</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {/* ==================== 9. 최근 거래 내역 ==================== */}
        {txs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">최근 거래 내역</h2>
            <Card className="p-5 border-foreground/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10">
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium">거래일</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">거래가</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">면적</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.slice(0, 10).map((tx: any, idx: number) => (
                      <tr key={idx} className="border-b border-foreground/5 last:border-0">
                        <td className="py-2.5 text-sm">{tx.contractDate}</td>
                        <td className="py-2.5 text-sm text-right font-semibold tabular-nums">
                          {(parseInt(tx.priceKrw) / 100000000).toFixed(2)}억
                        </td>
                        <td className="py-2.5 text-sm text-right tabular-nums">{tx.areaM2}㎡</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

        {/* ==================== 10. 재건축 현황 ==================== */}
        {rebuildStatus && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">재건축 현황</h2>
            <Card className="p-5 border-foreground/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Hammer className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {rebuildStatus.isRebuildCandidate === 1 ? "재건축 추진 중" : "해당 없음"}
                  </p>
                  {rebuildStatus.stage && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      현재 단계: <span className="font-semibold text-accent">{rebuildStatus.stage}</span>
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* ==================== 11. 실시간 뉴스 (네이버 뉴스 API) ==================== */}
        {news.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-accent" />
              실시간 뉴스
            </h2>

            <Card className="p-5 border-foreground/5">
              <div className="space-y-4">
                {news.slice(0, 8).map((item: any, idx: number) => (
                  <div key={idx} className="group">
                    <a
                      href={item.originalLink || item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug group-hover:text-accent transition-colors">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                            {item.source}
                            {item.publishDate && ` · ${new Date(item.publishDate).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}`}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent flex-shrink-0 mt-1 transition-colors" />
                      </div>
                    </a>
                    {idx < Math.min(news.length - 1, 7) && (
                      <div className="border-b border-foreground/5 mt-2" />
                    )}
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground/40 mt-4 text-right">
                네이버 뉴스 검색 API 제공
              </p>
            </Card>
          </section>
        )}

        {/* 하단 안내 */}
        <div className="text-center py-8 border-t border-foreground/5">
          <p className="text-xs text-muted-foreground">
            본 정보는 투자 조언이 아닌 참고 자료입니다. 실제 투자 결정 시 전문가 상담을 권장합니다.
          </p>
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            뉴스 데이터: 네이버 뉴스 검색 API · AI 분석: LLM 기반 자동 요약
          </p>
        </div>
      </main>
    </div>
  );
}
