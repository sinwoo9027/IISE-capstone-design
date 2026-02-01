import { config } from 'dotenv';
config(); // Load .env

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { getDb } from './server/db';
import { subwayStations } from './drizzle/schema';

interface SubwayStationData {
  stationName: string;
  line: string;
  lat: string;
  lng: string;
  isTransfer?: string;
}

async function seedSubwayStations() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  try {
    // CSV 파일 읽기 (파일 경로를 실제 파일에 맞게 변경하세요)
    const csvData = readFileSync('./server/data/seoul_subway_stations_utf8.csv', 'utf-8');

    // CSV 파싱
    const records: SubwayStationData[] = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`Found ${records.length} subway stations to import`);

    // 데이터 변환 및 삽입
    const insertData = records.map(record => ({
      stationName: record.stationName,
      line: record.line,
      lat: record.lat,
      lng: record.lng,
      isTransfer: record.isTransfer ? parseInt(record.isTransfer) : 0,
    }));

    // 벌크 삽입
    await db.insert(subwayStations).values(insertData);

    console.log('Successfully imported subway stations data');
  } catch (error) {
    console.error('Error seeding subway stations:', error);
  }
}

// 스크립트 실행
seedSubwayStations().then(() => {
  console.log('Seeding completed');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});