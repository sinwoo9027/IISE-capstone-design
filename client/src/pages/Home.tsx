import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, HomeIcon, MapPin, ArrowRight, Train, Building2, Hammer, TrendingUp, Percent } from "lucide-react";
import { useState, useRef } from "react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { MapView } from "@/components/Map";
import { useLocation } from "wouter";

/** 5개 지표 점수 */
interface ScoreBreakdown {
  transport: number;
  scale: number;
  rebuild: number;
  priceTrend: number;
  jeonseRatio: number;
}

/** 추천 결과 아파트 */
interface RecommendedApartment {
  aptId: number;
  aptName: string;
  sigungu: string;
  dong: string;
  lat: string;
  lng: string;
  builtYear: number | null;
  households: number | null;
  reprAreaM2: string | null;
  latestPrice: number;
  latestArea: number;
  scores: ScoreBreakdown;
  finalScore: number;
  explanation: string;
  nearbySubways: Array<{
    stationName: string;
    line: string;
    distanceM: number;
  }>;
  transactionCount: number;
  hasRebuild: boolean;
}

/** 점수 바 컴포넌트 */
function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const getColor = (s: number) => {
    if (s >= 70) return "bg-accent";
    if (s >= 40) return "bg-foreground/60";
    return "bg-foreground/30";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-semibold tabular-nums">{score}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

/** 추천 결과 카드 */
function ApartmentCard({
  apt,
  rank,
  onNavigate,
}: {
  apt: RecommendedApartment;
  rank: number;
  onNavigate: () => void;
}) {
  return (
    <Card
      className="p-5 cursor-pointer hover:shadow-lg transition-all duration-200 border-foreground/5 group"
      onClick={onNavigate}
    >
      <div className="flex gap-4">
        {/* 순위 */}
        <div className="flex-shrink-0 w-10 h-10 bg-accent text-accent-foreground rounded-lg flex items-center justify-center font-bold text-lg">
          {rank}
        </div>

        {/* 메인 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h4 className="text-base font-bold truncate">{apt.aptName}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {apt.sigungu} {apt.dong}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-accent leading-none">{apt.finalScore}</div>
              <p className="text-[10px] text-muted-foreground mt-1">종합 점수</p>
            </div>
          </div>

          {/* 5개 지표 */}
          <div className="grid grid-cols-5 gap-3 mb-3">
            <ScoreBar label="교통" score={apt.scores.transport} icon={<Train className="h-3 w-3" />} />
            <ScoreBar label="규모" score={apt.scores.scale} icon={<Building2 className="h-3 w-3" />} />
            <ScoreBar label="재건축" score={apt.scores.rebuild} icon={<Hammer className="h-3 w-3" />} />
            <ScoreBar label="상승률" score={apt.scores.priceTrend} icon={<TrendingUp className="h-3 w-3" />} />
            <ScoreBar label="전세가율" score={apt.scores.jeonseRatio} icon={<Percent className="h-3 w-3" />} />
          </div>

          {/* 추천 근거 */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
            {apt.explanation}
          </p>

          {/* 메타 정보 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium">
                {(apt.latestPrice / 100000000).toFixed(1)}억
              </span>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium">
                {apt.reprAreaM2}㎡
              </span>
              {apt.builtYear && (
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium">
                  {apt.builtYear}년
                </span>
              )}
              {apt.hasRebuild && (
                <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded font-medium">
                  재건축
                </span>
              )}
              {apt.nearbySubways.length > 0 && (
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium">
                  {apt.nearbySubways[0].stationName} {apt.nearbySubways[0].distanceM}m
                </span>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const authState = useAuth();
  const { user, loading, isAuthenticated } = authState;
  const [, navigate] = useLocation();

  const [budget, setBudget] = useState("");
  const [minArea, setMinArea] = useState("");
  const [investmentType, setInvestmentType] = useState("stable");
  const [transportImportance, setTransportImportance] = useState("3");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedApartment[]>([]);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const recommendationsMutation = trpc.recommendations.getRecommendations.useMutation();

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    if (recommendations.length > 0) {
      addMarkersToMap(map, recommendations);
    }
  };

  const addMarkersToMap = (map: google.maps.Map, apartments: RecommendedApartment[]) => {
    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];
    if (!window.google) return;

    const bounds = new window.google.maps.LatLngBounds();

    apartments.forEach((apt, idx) => {
      const position = { lat: parseFloat(apt.lat), lng: parseFloat(apt.lng) };
      bounds.extend(position);

      const markerContent = document.createElement("div");
      markerContent.className = "flex items-center justify-center w-8 h-8 bg-accent text-white rounded-full font-bold text-sm shadow-md";
      markerContent.textContent = (idx + 1).toString();

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: apt.aptName,
        content: markerContent,
      });

      marker.addListener("click", () => {
        navigate(`/apartment/${apt.aptId}`);
      });

      markersRef.current.push(marker);
    });

    if (apartments.length > 0) {
      map.fitBounds(bounds);
    }
  };

  const handleGetRecommendations = async () => {
    if (!budget || !minArea) {
      toast.error("예산과 최소 면적을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await recommendationsMutation.mutateAsync({
        budget,
        minArea,
        investmentType: investmentType as "stable" | "profit",
        transportImportance: parseInt(transportImportance),
      });

      if (result.success && result.recommendations && result.recommendations.length > 0) {
        const recs = result.recommendations as RecommendedApartment[];
        setRecommendations(recs);
        setShowMap(true);
        if (mapRef.current) {
          addMarkersToMap(mapRef.current, recs);
        }
        toast.success(result.message || "추천이 완료되었습니다!");
      } else {
        toast.error(result.error || "추천 계산에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("추천 계산 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 로딩 ====================
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // ==================== 비로그인 랜딩 ====================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-foreground/10 bg-background">
          <div className="container flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-accent rounded-lg flex items-center justify-center">
                <HomeIcon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">AptGPT</h1>
            </div>
            <a href={getLoginUrl()}>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">로그인</Button>
            </a>
          </div>
        </header>

        <main className="container py-20">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-7 space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-accent tracking-widest uppercase">Capstone Design Project</p>
                <h2 className="text-5xl font-bold leading-tight">
                  지하철 접근성을 고려한
                  <br />
                  <span className="text-accent">스마트한 아파트 추천</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                  예산, 면적, 투자 성향, 교통 중요도를 입력하면 5개 평가 지표를 기반으로 최적의 아파트를 추천하고, 추천 이유를 설명합니다.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-4 pt-4">
                {[
                  { icon: <Train className="h-4 w-4" />, label: "교통 편의성" },
                  { icon: <Building2 className="h-4 w-4" />, label: "단지 규모" },
                  { icon: <Hammer className="h-4 w-4" />, label: "재건축 기대" },
                  { icon: <TrendingUp className="h-4 w-4" />, label: "가격 상승률" },
                  { icon: <Percent className="h-4 w-4" />, label: "전세가율" },
                ].map((item, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="mx-auto w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      {item.icon}
                    </div>
                    <p className="text-xs font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-5">
              <Card className="p-8 shadow-lg border-foreground/5">
                <h3 className="text-xl font-bold mb-6">무료로 시작하기</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  로그인 후 맞춤형 아파트 추천을 받아보세요.
                </p>
                <a href={getLoginUrl()} className="block">
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3">
                    로그인하여 추천 받기
                  </Button>
                </a>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== 로그인 후 대시보드 ====================
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/10 bg-background sticky top-0 z-50">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-accent rounded-lg flex items-center justify-center">
              <HomeIcon className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AptGPT</h1>
          </div>
          <div className="text-sm text-muted-foreground">{user?.name}님 환영합니다</div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* 좌측: 입력 폼 */}
          <div className="col-span-4">
            <Card className="p-6 sticky top-24 border-foreground/5">
              <h3 className="text-lg font-bold mb-1">추천 조건</h3>
              <p className="text-xs text-muted-foreground mb-5">조건을 입력하고 추천을 받아보세요.</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="budget2" className="font-medium text-xs">
                    가용 예산 (억 원)
                  </Label>
                  <Input
                    id="budget2"
                    type="number"
                    placeholder="예: 50"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="minArea2" className="font-medium text-xs">
                    최소 면적 (㎡)
                  </Label>
                  <Input
                    id="minArea2"
                    type="number"
                    placeholder="예: 60"
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="investmentType2" className="font-medium text-xs">
                    투자 성향
                  </Label>
                  <Select value={investmentType} onValueChange={setInvestmentType}>
                    <SelectTrigger id="investmentType2" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">안정형 (전세가율·규모 중시)</SelectItem>
                      <SelectItem value="profit">수익형 (재건축·상승률 중시)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transportImportance2" className="font-medium text-xs">
                    교통 중요도
                  </Label>
                  <Select value={transportImportance} onValueChange={setTransportImportance}>
                    <SelectTrigger id="transportImportance2" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - 크게 중요하지 않음</SelectItem>
                      <SelectItem value="2">2 - 보통</SelectItem>
                      <SelectItem value="3">3 - 웬만하면 좋음</SelectItem>
                      <SelectItem value="4">4 - 중요함</SelectItem>
                      <SelectItem value="5">5 - 매우 중요함</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGetRecommendations}
                  disabled={isLoading}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-10 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    "TOP 5 추천 받기"
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* 우측: 결과 */}
          <div className="col-span-8">
            {/* 지도 */}
            {showMap && recommendations.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    추천 아파트 위치
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setShowMap(false)} className="text-xs h-7">
                    지도 숨기기
                  </Button>
                </div>
                <Card className="overflow-hidden border-foreground/5">
                  <MapView
                    initialCenter={{
                      lat: parseFloat(recommendations[0]?.lat || "37.4979"),
                      lng: parseFloat(recommendations[0]?.lng || "127.0276"),
                    }}
                    initialZoom={13}
                    onMapReady={handleMapReady}
                    className="h-[350px]"
                  />
                </Card>
              </div>
            )}

            {/* 추천 결과 목록 */}
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">추천 결과 TOP {recommendations.length}</h3>
                  {!showMap && (
                    <Button variant="outline" size="sm" onClick={() => setShowMap(true)} className="text-xs h-7">
                      <MapPin className="h-3 w-3 mr-1" />
                      지도 보기
                    </Button>
                  )}
                </div>
                {recommendations.map((apt, idx) => (
                  <ApartmentCard
                    key={apt.aptId}
                    apt={apt}
                    rank={idx + 1}
                    onNavigate={() => navigate(`/apartment/${apt.aptId}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                  <HomeIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-2">추천 결과가 여기에 표시됩니다</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  왼쪽 패널에서 예산, 면적, 투자 성향을 입력하고 "TOP 5 추천 받기"를 클릭하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
