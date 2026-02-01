import { config } from 'dotenv';
config(); // Load .env

import { parseStringPromise } from 'xml2js';
import { getDb } from './db';
import { transactions, apartments } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface TransactionData {
  dealAmount: string; // 거래금액
  dealYear: string;   // 거래년도
  dealMonth: string;  // 거래월
  dealDay: string;    // 거래일
  area: string;       // 전용면적
  aptName: string;    // 아파트명
  dong: string;       // 법정동
  jibun: string;      // 지번
  regionalCode: string; // 지역코드
  floor: string;      // 층
}

async function fetchApartmentTransactions(lawdCd: string, dealYmd: string): Promise<TransactionData[]> {
  const API_KEY = process.env.MOLIT_API_KEY; // 환경변수로 API 키 설정
  if (!API_KEY) {
    throw new Error('MOLIT_API_KEY is not set');
  }

  const url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTrade?serviceKey=${API_KEY}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;

  try {
    const response = await fetch(url);
    const xmlData = await response.text();

    const result = await parseStringPromise(xmlData);
    const items = result.response?.body?.[0]?.items?.[0]?.item || [];

    return items.map((item: any) => ({
      dealAmount: item.거래금액?.[0] || '',
      dealYear: item.년?.[0] || '',
      dealMonth: item.월?.[0] || '',
      dealDay: item.일?.[0] || '',
      area: item.전용면적?.[0] || '',
      aptName: item.아파트?.[0] || '',
      dong: item.법정동?.[0] || '',
      jibun: item.지번?.[0] || '',
      regionalCode: item.지역코드?.[0] || '',
      floor: item.층?.[0] || '',
    }));
  } catch (error) {
    console.error('Error fetching apartment transactions:', error);
    return [];
  }
}

async function saveTransactionsToDb(transactionsData: TransactionData[]) {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  for (const data of transactionsData) {
    try {
      // 아파트 찾기 또는 생성 (간단히 aptName으로만)
      let aptId: number | undefined;

      // 기존 아파트 검색
      const existingApt = await db
        .select()
        .from(apartments)
        .where(eq(apartments.aptName, data.aptName))
        .limit(1);

      if (existingApt.length > 0) {
        aptId = existingApt[0].id;
      } else {
        // 새 아파트 생성 (기본 정보만)
        const newApt = await db.insert(apartments).values({
          aptName: data.aptName,
          sigungu: data.regionalCode.substring(0, 5), // 시군구 추출
          dong: data.dong,
          lat: '0', // 실제로는 주소로 좌표 변환 필요
          lng: '0',
        });
        aptId = newApt[0].insertId;
      }

      if (aptId) {
        // 거래 데이터 삽입
        const contractDate = `${data.dealYear}-${data.dealMonth.padStart(2, '0')}-${data.dealDay.padStart(2, '0')}`;
        const priceKrw = data.dealAmount.replace(/,/g, '');
        const areaM2 = data.area;

        await db.insert(transactions).values({
          aptId,
          contractDate,
          priceKrw,
          areaM2,
        });
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }
}

export async function fetchAndSaveWeeklyTransactions() {
  console.log('Starting weekly transaction data fetch...');

  // 서울 주요 지역 코드들 (예시)
  const regions = [
    { code: '11110', name: '종로구' },
    { code: '11140', name: '중구' },
    { code: '11170', name: '용산구' },
    { code: '11200', name: '성동구' },
    { code: '11215', name: '광진구' },
    { code: '11230', name: '동대문구' },
    { code: '11260', name: '중랑구' },
    { code: '11290', name: '성북구' },
    { code: '11305', name: '강북구' },
    { code: '11320', name: '도봉구' },
    { code: '11350', name: '노원구' },
    { code: '11380', name: '은평구' },
    { code: '11410', name: '서대문구' },
    { code: '11440', name: '마포구' },
    { code: '11470', name: '양천구' },
    { code: '11500', name: '강서구' },
    { code: '11530', name: '구로구' },
    { code: '11545', name: '금천구' },
    { code: '11560', name: '영등포구' },
    { code: '11590', name: '동작구' },
    { code: '11620', name: '관악구' },
    { code: '11650', name: '서초구' },
    { code: '11680', name: '강남구' },
    { code: '11710', name: '송파구' },
    { code: '11740', name: '강동구' },
  ];

  // 최근 1개월 데이터 (현재 날짜 기준)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const dealYmd = `${currentYear}${currentMonth.toString().padStart(2, '0')}`;

  for (const region of regions) {
    console.log(`Fetching data for ${region.name} (${region.code})...`);
    const transactionsData = await fetchApartmentTransactions(region.code, dealYmd);
    if (transactionsData.length > 0) {
      await saveTransactionsToDb(transactionsData);
      console.log(`Saved ${transactionsData.length} transactions for ${region.name}`);
    }
    // API 호출 제한 고려 (1초 대기)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Weekly transaction data fetch completed');
}

// 스크립트 실행
fetchAndSaveWeeklyTransactions().then(() => {
  console.log('Fetch completed');
  process.exit(0);
}).catch((error) => {
  console.error('Fetch failed:', error);
  process.exit(1);
});