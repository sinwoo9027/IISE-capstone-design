/**
 * 아파트 상세페이지용 비정형 정보 생성 모듈
 * 규칙 기반 텍스트 생성으로 "의사결정 보조 화면" 구현
 */

export interface ApartmentData {
  id: number;
  aptName: string;
  sigungu: string;
  dong: string;
  builtYear: number | null;
  households: number | null;
  reprAreaM2: string | null;
  lat: string;
  lng: string;
}

export interface TransactionData {
  contractDate: string;
  priceKrw: string;
  areaM2: string;
}

export interface SubwayData {
  stationName: string;
  line: string;
  distance: number;
  isTransfer: boolean;
}

export interface NewsData {
  title: string;
  source: string;
  publishDate: string;
  link: string;
}

export interface RebuildData {
  stage: string | null;
  isRebuildCandidate: boolean;
}

export interface ApartmentInsights {
  briefing: string;
  issuesSummary: string;
  investmentPoints: string[];
  cautionPoints: string[];
  locationVibe: string;
  newsKeywords: Array<{ tag: string; sentiment: 'positive' | 'neutral' | 'caution' }>;
}

/**
 * 1. 한줄 브리핑 생성
 * 교통/세대수/준공연도/가격 흐름/재건축 여부를 조합하여 생성
 */
export function generateBriefing(
  apartment: ApartmentData,
  subways: SubwayData[],
  transactions: TransactionData[],
  rebuild: RebuildData
): string {
  const now = new Date();
  const builtYearsAgo = apartment.builtYear ? now.getFullYear() - apartment.builtYear : null;
  
  // 교통 평가
  const hasGoodTransit = subways.length >= 2 || (subways.length > 0 && subways[0].distance < 500);
  const hasTransferStation = subways.some(s => s.isTransfer);
  
  // 세대수 평가
  const isLargeComplex = apartment.households && apartment.households >= 500;
  
  // 준공연도 평가
  const isOldBuilding = builtYearsAgo && builtYearsAgo > 20;
  
  // 가격 흐름 평가
  let priceUptrend = false;
  if (transactions.length >= 2) {
    const recentPrice = parseInt(transactions[transactions.length - 1].priceKrw.replace(/,/g, '')) || 0;
    const oldPrice = parseInt(transactions[0].priceKrw.replace(/,/g, '')) || 0;
    priceUptrend = recentPrice > oldPrice;
  }
  
  // 우선순위 기반 브리핑 생성
  // 1순위: 재건축 기대
  if (isOldBuilding && rebuild.isRebuildCandidate) {
    return "구축 대단지로 재건축 기대감이 반영될 수 있습니다.";
  }
  
  // 2순위: 가격 상승 + 교통
  if (priceUptrend && hasGoodTransit) {
    return "최근 가격 반등 조짐과 교통 호재가 함께 보입니다.";
  }
  
  // 3순위: 가격 상승만
  if (priceUptrend) {
    return "최근 가격 상승 추세가 관찰됩니다.";
  }
  
  // 4순위: 교통 + 대단지
  if (hasGoodTransit && isLargeComplex) {
    return "역세권 접근성이 좋고, 실거주 수요가 안정적인 대단지입니다.";
  }
  
  // 5순위: 환승역 + 대단지
  if (isLargeComplex && hasTransferStation) {
    return "대단지이면서 환승역 접근성까지 갖춘 입지입니다.";
  }
  
  // 기본값
  return "안정적인 입지의 아파트입니다.";
}

/**
 * 2. 최근 이슈 요약 생성
 * 뉴스 키워드를 분석하여 해석 텍스트 생성
 */
export function generateIssuesSummary(
  news: NewsData[],
  apartment: ApartmentData,
  rebuild: RebuildData
): string {
  if (news.length === 0) {
    return "이 지역의 최근 기사 정보가 제한적입니다. 데이터 수집 중입니다.";
  }
  
  // 키워드 추출
  const allText = news.map(n => n.title.toLowerCase()).join(" ");
  const hasRebuild = allText.includes("재건축") || allText.includes("정비사업");
  const hasTransport = allText.includes("지하철") || allText.includes("교통") || allText.includes("gtx");
  const hasPrice = allText.includes("가격") || allText.includes("상승") || allText.includes("하락");
  const hasDevelopment = allText.includes("개발") || allText.includes("사업");
  const hasTradeDecline = allText.includes("거래") && allText.includes("위축");
  
  const summaries: string[] = [];
  
  if (news.length >= 3) {
    summaries.push(`최근 ${news.length}개의 관련 기사가 확인되었습니다.`);
  } else {
    summaries.push(`최근 ${news.length}개의 관련 기사가 있습니다.`);
  }
  
  const topics: string[] = [];
  if (hasRebuild) topics.push("재건축/정비사업");
  if (hasTransport) topics.push("교통 호재");
  if (hasDevelopment) topics.push("개발 이슈");
  if (hasPrice) topics.push("가격 동향");
  
  if (topics.length > 0) {
    summaries.push(`주로 ${topics.join(", ")} 관련 보도가 있습니다.`);
  }
  
  if (hasTradeDecline && hasPrice) {
    summaries.push("기대 요인이 있으나 거래 위축 관련 보도도 함께 존재합니다.");
  } else if (hasTradeDecline) {
    summaries.push("거래 위축 관련 보도가 있으므로 주의가 필요합니다.");
  } else if (topics.length > 0) {
    summaries.push("전반적으로 긍정적인 뉘앙스의 보도가 주를 이룹니다.");
  }
  
  return summaries.join(" ");
}

/**
 * 3. 투자 포인트 추출
 * 이 단지의 장점을 설명하는 항목 생성
 */
export function generateInvestmentPoints(
  apartment: ApartmentData,
  subways: SubwayData[],
  transactions: TransactionData[],
  rebuild: RebuildData
): string[] {
  const points: string[] = [];
  const now = new Date();
  const builtYearsAgo = apartment.builtYear ? now.getFullYear() - apartment.builtYear : null;
  
  // 교통 포인트
  if (subways.length >= 2) {
    points.push("다중 역세권: 2개 이상의 지하철역 접근으로 교통 선택지가 풍부합니다.");
  } else if (subways.length === 1 && subways[0].distance < 500) {
    points.push("역세권 접근: 도보 5분 이내 지하철역 접근으로 출퇴근 편의성이 우수합니다.");
  }
  
  // 대단지 프리미엄
  if (apartment.households && apartment.households >= 500) {
    points.push("대단지 프리미엄: 세대수가 많아 거래와 수요가 비교적 안정적입니다.");
  }
  
  // 재건축 기대
  if (builtYearsAgo && builtYearsAgo > 25 && rebuild.isRebuildCandidate) {
    points.push("재건축 기대: 준공연도가 오래되어 정비사업 기대가 반영될 가능성이 있습니다.");
  }
  
  // 가격 상승
  if (transactions.length >= 2) {
    const recentPrice = parseInt(transactions[transactions.length - 1].priceKrw.replace(/,/g, '')) || 0;
    const oldPrice = parseInt(transactions[0].priceKrw.replace(/,/g, '')) || 0;
    const priceChange = ((recentPrice - oldPrice) / oldPrice * 100);
    
    if (priceChange > 5) {
      points.push(`최근 가격 반등: 최근 거래에서 ${priceChange.toFixed(1)}% 상승 조짐이 관찰됩니다.`);
    }
  }
  
  // 기본 포인트 (최소 1개는 항상 제공)
  if (points.length === 0) {
    points.push("안정적인 입지: 주거 환경이 정립된 지역입니다.");
  }
  
  return points;
}

/**
 * 4. 유의 포인트 추출
 * 주의사항 및 리스크 명시
 */
export function generateCautionPoints(
  apartment: ApartmentData,
  subways: SubwayData[],
  transactions: TransactionData[],
  rebuild: RebuildData,
  news: NewsData[]
): string[] {
  const points: string[] = [];
  const now = new Date();
  const builtYearsAgo = apartment.builtYear ? now.getFullYear() - apartment.builtYear : null;
  
  // 거래량 부족
  if (transactions.length < 3) {
    points.push("거래 정보 제한: 최근 거래 데이터가 적어 시장 신호 해석에 주의가 필요합니다.");
  }
  
  // 오래된 건물
  if (builtYearsAgo && builtYearsAgo > 30) {
    points.push("노후 건물: 준공연도가 오래되어 유지보수 비용 증가 가능성이 있습니다.");
  }
  
  // 재건축 불확실성
  if (builtYearsAgo && builtYearsAgo > 20 && !rebuild.isRebuildCandidate) {
    points.push("재건축 불확실성: 정비사업 추진 단계 정보가 제한적입니다.");
  }
  
  // 교통 제약
  if (subways.length === 0) {
    points.push("교통 접근성: 지하철역 근처가 아니므로 출퇴근 편의성을 재검토하세요.");
  } else if (subways[0].distance > 1000) {
    points.push("거리 제약: 가장 가까운 지하철역까지 도보 10분 이상 소요됩니다.");
  }
  
  // 뉴스 리스크
  const allText = news.map(n => n.title.toLowerCase()).join(" ");
  if (allText.includes("거래") && allText.includes("위축")) {
    points.push("거래 위축: 최근 거래 활동이 둔화되고 있으므로 시장 심리를 고려하세요.");
  }
  
  // 기본 유의사항 (최소 1개는 항상 제공)
  if (points.length === 0) {
    points.push("시장 조사: 구매 전 현지 방문 및 시장 조사를 권장합니다.");
  }
  
  return points;
}

/**
 * 5. 입지/생활 분위기 요약
 * 지하철/지역 특성 기반 자연어 서술
 */
export function generateLocationVibe(
  apartment: ApartmentData,
  subways: SubwayData[],
  news: NewsData[]
): string {
  const vibes: string[] = [];
  
  // 교통 기반 분위기
  if (subways.length >= 2) {
    vibes.push("주변에 지하철 접근성이 우수하여 출퇴근 편의성이 높습니다.");
  } else if (subways.length === 1) {
    vibes.push("인근 지하철역 접근으로 기본적인 교통 편의성이 확보됩니다.");
  }
  
  // 지역 특성 기반 분위기
  const allText = news.map(n => n.title.toLowerCase()).join(" ");
  
  if (allText.includes("재건축") || allText.includes("정비사업")) {
    vibes.push("노후 단지가 밀집한 지역으로 정비사업 기대감이 형성될 수 있는 분위기입니다.");
  }
  
  if (allText.includes("개발") || allText.includes("사업")) {
    vibes.push("지역 개발 이슈가 활발하여 장기적 성장 가능성이 있는 입지입니다.");
  }
  
  if (allText.includes("거주") || allText.includes("주거")) {
    vibes.push("실거주 수요가 꾸준한 주거 안정성이 높은 지역입니다.");
  }
  
  // 기본 분위기 (최소 1개는 항상 제공)
  if (vibes.length === 0) {
    vibes.push("안정적인 주거 환경이 형성된 지역입니다.");
  }
  
  return vibes[0];
}

/**
 * 6. 뉴스 키워드 태그 추출
 * 긍정/중립/주의 키워드 분류
 */
export function extractNewsKeywords(news: NewsData[]): Array<{ tag: string; sentiment: 'positive' | 'neutral' | 'caution' }> {
  const keywords: Array<{ tag: string; sentiment: 'positive' | 'neutral' | 'caution' }> = [];
  const allText = news.map(n => n.title.toLowerCase()).join(" ");
  
  // 긍정 키워드
  const positiveKeywords = [
    { text: "재건축", tag: "재건축" },
    { text: "개발", tag: "개발호재" },
    { text: "지하철", tag: "역세권" },
    { text: "gtx", tag: "GTX" },
    { text: "상승", tag: "가격반등" },
    { text: "호재", tag: "호재" },
  ];
  
  // 중립 키워드
  const neutralKeywords = [
    { text: "공급", tag: "공급이슈" },
    { text: "정비사업", tag: "정비사업" },
  ];
  
  // 주의 키워드
  const cautionKeywords = [
    { text: "거래 위축", tag: "거래위축" },
    { text: "위축", tag: "거래위축" },
    { text: "가격하락", tag: "가격조정" },
    { text: "미분양", tag: "미분양" },
  ];
  
  // 긍정 키워드 추출
  for (const kw of positiveKeywords) {
    if (allText.includes(kw.text)) {
      keywords.push({ tag: kw.tag, sentiment: 'positive' });
    }
  }
  
  // 중립 키워드 추출
  for (const kw of neutralKeywords) {
    if (allText.includes(kw.text)) {
      keywords.push({ tag: kw.tag, sentiment: 'neutral' });
    }
  }
  
  // 주의 키워드 추출
  for (const kw of cautionKeywords) {
    if (allText.includes(kw.text)) {
      keywords.push({ tag: kw.tag, sentiment: 'caution' });
    }
  }
  
  // 중복 제거
  const uniqueKeywords = Array.from(
    new Map(keywords.map(k => [k.tag, k])).values()
  );
  
  return uniqueKeywords.slice(0, 8); // 최대 8개
}

/**
 * 통합 함수: 모든 인사이트 생성
 */
export function generateApartmentInsights(
  apartment: ApartmentData,
  subways: SubwayData[],
  transactions: TransactionData[],
  rebuild: RebuildData,
  news: NewsData[]
): ApartmentInsights {
  return {
    briefing: generateBriefing(apartment, subways, transactions, rebuild),
    issuesSummary: generateIssuesSummary(news, apartment, rebuild),
    investmentPoints: generateInvestmentPoints(apartment, subways, transactions, rebuild),
    cautionPoints: generateCautionPoints(apartment, subways, transactions, rebuild, news),
    locationVibe: generateLocationVibe(apartment, subways, news),
    newsKeywords: extractNewsKeywords(news),
  };
}
