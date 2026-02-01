/**
 * 테스트 데이터 삽입 스크립트
 * 아파트, 지하철역, 거래 데이터를 데이터베이스에 추가합니다.
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { parseConnectionString } from 'mysql2/lib/connection_config';

config();

const pool = mysql.createPool({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3] || 'aptgpt',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: 'amazon',
});

async function seedData() {
  let connection;
  try {
    connection = await pool.getConnection();
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    console.log('\n💡 팁: Management UI의 Database 패널에서 SSL 설정을 확인하세요.');
    process.exit(1);
  }

  try {
    console.log('🌱 테스트 데이터 삽입 시작...\n');

    // 1. 지하철역 데이터 삽입
    console.log('📍 지하철역 데이터 삽입...');
    const subwayStations = [
      { stationName: '강남역', line: '2호선', lat: 37.4979, lng: 127.0276, isTransfer: true },
      { stationName: '강남역', line: '신분당선', lat: 37.4979, lng: 127.0276, isTransfer: true },
      { stationName: '역삼역', line: '2호선', lat: 37.4985, lng: 127.0365, isTransfer: false },
      { stationName: '서울역', line: '1호선', lat: 37.5550, lng: 126.9707, isTransfer: true },
      { stationName: '서울역', line: '4호선', lat: 37.5550, lng: 126.9707, isTransfer: true },
      { stationName: '명동역', line: '4호선', lat: 37.5605, lng: 126.9840, isTransfer: false },
      { stationName: '종로3가역', line: '1호선', lat: 37.5707, lng: 126.9907, isTransfer: true },
      { stationName: '종로3가역', line: '3호선', lat: 37.5707, lng: 126.9907, isTransfer: true },
      { stationName: '종로3가역', line: '5호선', lat: 37.5707, lng: 126.9907, isTransfer: true },
      { stationName: '광화문역', line: '5호선', lat: 37.5707, lng: 126.9768, isTransfer: false },
    ];

    for (const station of subwayStations) {
      await connection.execute(
        'INSERT INTO subway_stations (stationName, line, lat, lng, isTransfer) VALUES (?, ?, ?, ?, ?)',
        [station.stationName, station.line, station.lat, station.lng, station.isTransfer ? 1 : 0]
      );
    }
    console.log(`✅ ${subwayStations.length}개 지하철역 데이터 삽입 완료\n`);

    // 2. 아파트 데이터 삽입
    console.log('🏢 아파트 데이터 삽입...');
    const apartments = [
      // 강남 지역
      {
        aptName: '강남 프라임 타워',
        sigungu: '강남구',
        dong: '강남동',
        lat: 37.4979,
        lng: 127.0276,
        builtYear: 2015,
        households: 450,
        reprAreaM2: 84.95,
      },
      {
        aptName: '강남역 럭셔리 아파트',
        sigungu: '강남구',
        dong: '강남동',
        lat: 37.4985,
        lng: 127.0365,
        builtYear: 2018,
        households: 320,
        reprAreaM2: 74.85,
      },
      {
        aptName: '테헤란로 하이엔드',
        sigungu: '강남구',
        dong: '역삼동',
        lat: 37.4990,
        lng: 127.0400,
        builtYear: 2012,
        households: 280,
        reprAreaM2: 59.94,
      },
      // 종로 지역
      {
        aptName: '종로 클래식 아파트',
        sigungu: '종로구',
        dong: '종로1가',
        lat: 37.5707,
        lng: 126.9907,
        builtYear: 2008,
        households: 200,
        reprAreaM2: 49.95,
      },
      {
        aptName: '광화문 프리미엄',
        sigungu: '종로구',
        dong: '광화문',
        lat: 37.5707,
        lng: 126.9768,
        builtYear: 2020,
        households: 350,
        reprAreaM2: 79.92,
      },
      // 서울역 지역
      {
        aptName: '서울역 센트럴',
        sigungu: '중구',
        dong: '회현동',
        lat: 37.5550,
        lng: 126.9707,
        builtYear: 2010,
        households: 400,
        reprAreaM2: 69.93,
      },
      {
        aptName: '명동 트렌디',
        sigungu: '중구',
        dong: '명동',
        lat: 37.5605,
        lng: 126.9840,
        builtYear: 2016,
        households: 250,
        reprAreaM2: 59.94,
      },
    ];

    const apartmentIds = [];
    for (const apt of apartments) {
      const [result] = await connection.execute(
        'INSERT INTO apartments (aptName, sigungu, dong, lat, lng, builtYear, households, reprAreaM2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [apt.aptName, apt.sigungu, apt.dong, apt.lat, apt.lng, apt.builtYear, apt.households, apt.reprAreaM2]
      );
      apartmentIds.push(result.insertId);
    }
    console.log(`✅ ${apartments.length}개 아파트 데이터 삽입 완료\n`);

    // 3. 거래 데이터 삽입
    console.log('💰 거래 데이터 삽입...');
    const today = new Date();
    let transactionCount = 0;

    for (let aptIdx = 0; aptIdx < apartmentIds.length; aptIdx++) {
      const apartmentId = apartmentIds[aptIdx];
      const basePrice = 500000000 + Math.random() * 500000000; // 5억~10억

      // 각 아파트당 12개월 거래 데이터 생성
      for (let month = 0; month < 12; month++) {
        const contractDate = new Date(today);
        contractDate.setMonth(contractDate.getMonth() - month);

        // 가격 변동성 추가
        const priceVariation = 1 + (Math.random() - 0.5) * 0.1; // ±5% 변동
        const price = Math.floor(basePrice * priceVariation);

        // 면적 다양성 추가
        const areas = [49.95, 59.94, 69.93, 74.85, 84.95];
        const area = areas[Math.floor(Math.random() * areas.length)];

        await connection.execute(
          'INSERT INTO transactions (apartmentId, contractDate, priceKrw, areaM2) VALUES (?, ?, ?, ?)',
          [apartmentId, contractDate.toISOString().split('T')[0], price, area]
        );
        transactionCount++;
      }
    }
    console.log(`✅ ${transactionCount}개 거래 데이터 삽입 완료\n`);

    console.log('🎉 모든 테스트 데이터 삽입 완료!');
    console.log(`
📊 삽입된 데이터 요약:
- 지하철역: ${subwayStations.length}개
- 아파트: ${apartments.length}개
- 거래 기록: ${transactionCount}개

🚀 이제 추천 기능을 테스트할 수 있습니다!
    `);
  } catch (error) {
    console.error('❌ 데이터 삽입 중 오류 발생:', error);
  } finally {
    if (connection) await connection.release();
    await pool.end();
  }
}

seedData();
