import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, TrendingUp, Home as HomeIcon } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [budget, setBudget] = useState("");
  const [minArea, setMinArea] = useState("");
  const [investmentType, setInvestmentType] = useState("stable");
  const [transportImportance, setTransportImportance] = useState("3");
  const [isLoading, setIsLoading] = useState(false);

  const handleGetRecommendations = async () => {
    if (!budget || !minArea) {
      alert("예산과 최소 면적을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    // TODO: API 호출
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {/* 헤더 */}
        <header className="border-b border-foreground/10 bg-background">
          <div className="container flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-accent rounded-lg flex items-center justify-center">
                <HomeIcon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h1 className="text-2xl font-bold">AptGPT</h1>
            </div>
            <a href={getLoginUrl()}>
              <Button className="bg-accent hover:bg-accent/90">로그인</Button>
            </a>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="container py-20">
          <div className="grid grid-cols-12 gap-12">
            {/* 좌측 - 텍스트 */}
            <div className="col-span-7 space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl font-bold leading-tight">
                  지하철 접근성을 고려한<br />
                  <span className="text-accent">스마트한 아파트 추천</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  예산, 면적, 교통 중요도를 입력하면 AI가 최적의 아파트를 추천합니다.
                  단순한 나열이 아닌 <span className="font-semibold">이유 있는 추천</span>으로
                  합리적인 선택을 돕습니다.
                </p>
              </div>

              {/* 특징 */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-1 w-12 bg-accent mt-2" />
                  <div>
                    <h3 className="font-semibold mb-1">지하철 접근성 분석</h3>
                    <p className="text-sm text-muted-foreground">
                      반경 1km 이내 지하철역 개수, 거리, 환승역 정보를 종합 분석
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-1 w-12 bg-accent mt-2" />
                  <div>
                    <h3 className="font-semibold mb-1">투자 성향 맞춤</h3>
                    <p className="text-sm text-muted-foreground">
                      안정형/수익형 선호도에 따른 맞춤형 추천 알고리즘
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-1 w-12 bg-accent mt-2" />
                  <div>
                    <h3 className="font-semibold mb-1">자연어 설명</h3>
                    <p className="text-sm text-muted-foreground">
                      AI가 추천 이유를 명확하게 설명하여 신뢰도 있는 선택 지원
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측 - 입력 폼 */}
            <div className="col-span-5">
              <Card className="p-8 shadow-lg">
                <h3 className="text-2xl font-bold mb-6">TOP 5 추천 받기</h3>

                <div className="space-y-6">
                  {/* 예산 입력 */}
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="font-semibold">
                      가용 예산 (억 원)
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="예: 50"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      최신 실거래가 기준으로 필터링됩니다
                    </p>
                  </div>

                  {/* 최소 면적 입력 */}
                  <div className="space-y-2">
                    <Label htmlFor="minArea" className="font-semibold">
                      최소 면적 (㎡)
                    </Label>
                    <Input
                      id="minArea"
                      type="number"
                      placeholder="예: 60"
                      value={minArea}
                      onChange={(e) => setMinArea(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      이 이상의 면적을 가진 아파트만 추천됩니다
                    </p>
                  </div>

                  {/* 투자 성향 선택 */}
                  <div className="space-y-2">
                    <Label htmlFor="investmentType" className="font-semibold">
                      투자 성향
                    </Label>
                    <Select value={investmentType} onValueChange={setInvestmentType}>
                      <SelectTrigger id="investmentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stable">안정형 (세대수 중심)</SelectItem>
                        <SelectItem value="profit">수익형 (연식 중심)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 교통 중요도 선택 */}
                  <div className="space-y-2">
                    <Label htmlFor="transportImportance" className="font-semibold">
                      교통 중요도
                    </Label>
                    <Select value={transportImportance} onValueChange={setTransportImportance}>
                      <SelectTrigger id="transportImportance">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">교통은 크게 중요하지 않음</SelectItem>
                        <SelectItem value="3">웬만하면 역세권이면 좋음</SelectItem>
                        <SelectItem value="5">출퇴근 때문에 매우 중요함</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 추천 버튼 */}
                  <Button
                    onClick={handleGetRecommendations}
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 mt-8"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        추천 중...
                      </>
                    ) : (
                      "TOP 5 추천 받기"
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 로그인 후 대시보드
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/10 bg-background">
        <div className="container flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-accent rounded-lg flex items-center justify-center">
              <HomeIcon className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold">AptGPT</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.name}님 환영합니다
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="grid grid-cols-12 gap-8">
          {/* 좌측 입력 폼 */}
          <div className="col-span-4">
            <Card className="p-6 sticky top-8">
              <h3 className="text-xl font-bold mb-6">추천 조건</h3>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="budget2" className="font-semibold text-sm">
                    가용 예산 (억 원)
                  </Label>
                    <Input
                      id="budget2"
                      type="number"
                      placeholder="예: 50"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minArea2" className="font-semibold text-sm">
                    최소 면적 (㎡)
                  </Label>
                    <Input
                      id="minArea2"
                      type="number"
                      placeholder="예: 60"
                      value={minArea}
                      onChange={(e) => setMinArea(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investmentType2" className="font-semibold text-sm">
                    투자 성향
                  </Label>
                  <Select value={investmentType} onValueChange={setInvestmentType}>
                    <SelectTrigger id="investmentType2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">안정형</SelectItem>
                      <SelectItem value="profit">수익형</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transportImportance2" className="font-semibold text-sm">
                    교통 중요도
                  </Label>
                  <Select value={transportImportance} onValueChange={setTransportImportance}>
                    <SelectTrigger id="transportImportance2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">크게 중요하지 않음</SelectItem>
                      <SelectItem value="3">웬만하면 좋음</SelectItem>
                      <SelectItem value="5">매우 중요함</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGetRecommendations}
                  disabled={isLoading}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      추천 중...
                    </>
                  ) : (
                    "TOP 5 추천 받기"
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* 우측 결과 영역 */}
          <div className="col-span-8">
            <div className="space-y-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  왼쪽 패널에서 조건을 입력하고 "TOP 5 추천 받기"를 클릭하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
