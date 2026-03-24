/**
 * LLM 기반 뉴스 분석 모듈
 * - 뉴스 3줄 요약
 * - 감성 분석 (긍정/부정/중립 키워드 태그)
 * - 지역 부동산 동향 리포트
 */

import { invokeLLM } from "./_core/llm";
import type { CleanNewsItem } from "./api-naver-news";

export interface SentimentTag {
  tag: string;
  sentiment: "positive" | "neutral" | "caution";
}

export interface NewsAnalysisResult {
  summary: string;           // 3줄 요약
  sentimentTags: SentimentTag[];  // 감성 태그
  regionTrend: string;       // 지역 동향
}

/**
 * 뉴스 기사 목록을 LLM으로 분석하여 요약, 감성 태그, 지역 동향을 생성
 */
export async function analyzeNews(
  newsItems: CleanNewsItem[],
  aptName: string,
  sigungu: string,
  dong: string
): Promise<NewsAnalysisResult> {
  if (newsItems.length === 0) {
    return {
      summary: "관련 뉴스가 없어 분석을 수행할 수 없습니다.",
      sentimentTags: [],
      regionTrend: "데이터 수집 중입니다.",
    };
  }

  // 뉴스 제목과 요약을 텍스트로 변환
  const newsText = newsItems
    .slice(0, 10)
    .map((item, i) => `${i + 1}. [${item.source}] ${item.title}\n   ${item.description}`)
    .join("\n\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `당신은 한국 부동산 시장 전문 분석가입니다. 뉴스 기사를 분석하여 아파트 투자 의사결정에 도움이 되는 정보를 제공합니다.
반드시 한국어로 답변하세요. JSON 형식으로만 응답하세요.`,
        },
        {
          role: "user",
          content: `다음은 "${aptName}" (${sigungu} ${dong}) 관련 최근 뉴스입니다:

${newsText}

위 뉴스를 분석하여 다음 JSON 형식으로 응답해주세요:
{
  "summary": "3줄 이내의 핵심 요약 (투자자 관점에서 중요한 정보 위주)",
  "sentimentTags": [
    {"tag": "키워드", "sentiment": "positive|neutral|caution"}
  ],
  "regionTrend": "해당 지역의 부동산 시장 동향을 2~3문장으로 설명"
}

규칙:
- summary: 뉴스에서 드러나는 핵심 이슈를 투자자 관점에서 3줄 이내로 요약
- sentimentTags: 뉴스에서 추출한 주요 키워드를 최대 8개까지, 각각 positive(호재)/neutral(중립)/caution(주의) 분류
- regionTrend: ${sigungu} 지역의 전반적인 부동산 시장 분위기와 향후 전망을 간결하게 서술`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "news_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "3줄 이내 핵심 요약" },
              sentimentTags: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tag: { type: "string", description: "키워드" },
                    sentiment: {
                      type: "string",
                      enum: ["positive", "neutral", "caution"],
                      description: "감성 분류",
                    },
                  },
                  required: ["tag", "sentiment"],
                  additionalProperties: false,
                },
                description: "감성 태그 목록 (최대 8개)",
              },
              regionTrend: { type: "string", description: "지역 동향 서술" },
            },
            required: ["summary", "sentimentTags", "regionTrend"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("LLM returned non-string content");
    }

    const parsed = JSON.parse(content) as NewsAnalysisResult;

    // sentimentTags 최대 8개로 제한
    if (parsed.sentimentTags.length > 8) {
      parsed.sentimentTags = parsed.sentimentTags.slice(0, 8);
    }

    return parsed;
  } catch (error) {
    console.error("[NewsAnalyzer] LLM analysis failed:", error);
    // Fallback: 규칙 기반 분석
    return fallbackAnalysis(newsItems, aptName, sigungu);
  }
}

/**
 * LLM 실패 시 규칙 기반 fallback 분석
 */
function fallbackAnalysis(
  newsItems: CleanNewsItem[],
  aptName: string,
  sigungu: string
): NewsAnalysisResult {
  const allText = newsItems.map((n) => n.title + " " + n.description).join(" ").toLowerCase();

  // 키워드 기반 감성 태그
  const tags: SentimentTag[] = [];
  const keywordMap: Array<{ keyword: string; tag: string; sentiment: SentimentTag["sentiment"] }> = [
    { keyword: "재건축", tag: "재건축", sentiment: "positive" },
    { keyword: "개발", tag: "개발호재", sentiment: "positive" },
    { keyword: "gtx", tag: "GTX", sentiment: "positive" },
    { keyword: "상승", tag: "가격반등", sentiment: "positive" },
    { keyword: "호재", tag: "호재", sentiment: "positive" },
    { keyword: "분양", tag: "신규분양", sentiment: "neutral" },
    { keyword: "정비사업", tag: "정비사업", sentiment: "neutral" },
    { keyword: "공급", tag: "공급이슈", sentiment: "neutral" },
    { keyword: "위축", tag: "거래위축", sentiment: "caution" },
    { keyword: "하락", tag: "가격조정", sentiment: "caution" },
    { keyword: "미분양", tag: "미분양", sentiment: "caution" },
    { keyword: "규제", tag: "규제강화", sentiment: "caution" },
  ];

  for (const kw of keywordMap) {
    if (allText.includes(kw.keyword)) {
      tags.push({ tag: kw.tag, sentiment: kw.sentiment });
    }
  }

  // 요약 생성
  const summaryParts: string[] = [];
  summaryParts.push(`${aptName} 관련 최근 ${newsItems.length}건의 뉴스가 확인되었습니다.`);

  const positiveCount = tags.filter((t) => t.sentiment === "positive").length;
  const cautionCount = tags.filter((t) => t.sentiment === "caution").length;

  if (positiveCount > cautionCount) {
    summaryParts.push("전반적으로 긍정적인 시장 신호가 관찰됩니다.");
  } else if (cautionCount > positiveCount) {
    summaryParts.push("일부 주의가 필요한 시장 신호가 감지됩니다.");
  } else {
    summaryParts.push("시장 신호가 혼재되어 있어 신중한 판단이 필요합니다.");
  }

  return {
    summary: summaryParts.join(" "),
    sentimentTags: tags.slice(0, 8),
    regionTrend: `${sigungu} 지역의 부동산 시장은 현재 다양한 요인이 작용하고 있습니다. 관련 뉴스를 지속적으로 모니터링하시기 바랍니다.`,
  };
}
