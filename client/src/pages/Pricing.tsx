import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

interface PricingPlan {
  id: "premium" | "enterprise";
  name: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: "premium",
    name: "프리미엄",
    price: 9900,
    interval: "month",
    description: "무제한 추천 + 고급 분석",
    features: [
      "무제한 추천",
      "고급 분석 리포트",
      "실거래가 차트",
      "즐겨찾기 관리",
      "비교 기능 (최대 5개)",
      "이메일 알림",
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "엔터프라이즈",
    price: 49900,
    interval: "month",
    description: "팀 협업 + API 접근",
    features: [
      "프리미엄 플랜의 모든 기능",
      "팀 협업 (최대 10명)",
      "API 접근",
      "커스텀 보고서",
      "우선 지원",
      "데이터 내보내기",
    ],
  },
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"premium" | "enterprise" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createCheckoutMutation = trpc.payments.createCheckout.useMutation();

  const handleSubscribe = async (planId: "premium" | "enterprise") => {
    if (!isAuthenticated || !user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setIsLoading(true);
    setSelectedPlan(planId);

    try {
      const result = await createCheckoutMutation.mutateAsync({
        planId,
      });

      if (result.success && result.url) {
        window.open(result.url, "_blank");
        toast.success("결제 페이지로 이동합니다.");
      } else {
        toast.error(result.error || "결제 세션 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        {/* 헤더 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            투명한 가격, <span className="text-accent">최고의 가치</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            모든 플랜에서 무제한 추천을 받고, 당신의 투자 결정을 더 똑똑하게 만드세요.
          </p>
        </div>

        {/* 가격 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {plans.map((plan) => (
            <div key={plan.id} className="relative">
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    추천 플랜
                  </span>
                </div>
              )}

              <Card
                className={`p-8 h-full flex flex-col ${
                  plan.recommended ? "ring-2 ring-accent shadow-lg" : ""
                }`}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ₩{(plan.price / 100).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/{plan.interval}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    세금 별도
                  </p>
                </div>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading && selectedPlan === plan.id}
                  className={`w-full mb-8 ${
                    plan.recommended
                      ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                      : "border border-foreground/20"
                  }`}
                  variant={plan.recommended ? "default" : "outline"}
                >
                  {isLoading && selectedPlan === plan.id ? "처리 중..." : "지금 시작하기"}
                </Button>

                <div className="space-y-4 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">자주 묻는 질문</h2>

          <div className="space-y-6">
            <div className="border-b border-foreground/10 pb-6">
              <h3 className="font-semibold mb-2">언제든 취소할 수 있나요?</h3>
              <p className="text-muted-foreground text-sm">
                네, 언제든지 구독을 취소할 수 있습니다. 취소 후 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다.
              </p>
            </div>

            <div className="border-b border-foreground/10 pb-6">
              <h3 className="font-semibold mb-2">결제 방법은 무엇인가요?</h3>
              <p className="text-muted-foreground text-sm">
                신용카드(Visa, Mastercard, American Express)를 통해 안전하게 결제할 수 있습니다. Stripe을 통해 처리됩니다.
              </p>
            </div>

            <div className="border-b border-foreground/10 pb-6">
              <h3 className="font-semibold mb-2">무료 플랜은 없나요?</h3>
              <p className="text-muted-foreground text-sm">
                네, 무료 플랜으로 월 5회 추천을 받을 수 있습니다. 더 많은 기능이 필요하면 프리미엄 플랜으로 업그레이드하세요.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">팀 협업이 필요한데요?</h3>
              <p className="text-muted-foreground text-sm">
                엔터프라이즈 플랜에서 최대 10명의 팀원과 협업할 수 있습니다. 더 큰 팀이 필요하면 문의해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
