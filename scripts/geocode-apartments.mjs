/**
 * 아파트 좌표(lat, lng) 채우기 스크립트
 * Google Maps Geocoding API를 사용하여 주소 → 좌표 변환
 */
import mysql from "mysql2/promise";

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!FORGE_URL || !FORGE_KEY || !DATABASE_URL) {
  console.error("Missing env: BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, DATABASE_URL");
  process.exit(1);
}

async function geocode(address) {
  const url = `${FORGE_URL}/v1/maps/proxy/maps/api/geocode/json?key=${FORGE_KEY}&address=${encodeURIComponent(address)}&language=ko`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    if (data.status === "OK" && data.results?.[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (e) { /* ignore */ }
  return null;
}

async function main() {
  console.log("=== 아파트 좌표 채우기 시작 ===");
  const conn = await mysql.createConnection(DATABASE_URL);

  // 좌표가 없는 아파트 조회
  const [rows] = await conn.execute(
    "SELECT id, apt_name, sigungu, dong FROM apartments WHERE lat = '0' OR lat IS NULL LIMIT 6000"
  );
  console.log(`좌표 없는 아파트: ${rows.length}개\n`);

  let success = 0, fail = 0;
  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (apt) => {
        const address = `서울특별시 ${apt.sigungu} ${apt.dong} ${apt.apt_name}`;
        const coord = await geocode(address);
        if (!coord) {
          // fallback: 동 이름만으로 시도
          const fallback = await geocode(`서울특별시 ${apt.sigungu} ${apt.dong}`);
          return { id: apt.id, coord: fallback };
        }
        return { id: apt.id, coord };
      })
    );

    for (const r of results) {
      if (r.coord) {
        await conn.execute(
          "UPDATE apartments SET lat = ?, lng = ? WHERE id = ?",
          [String(r.coord.lat), String(r.coord.lng), r.id]
        );
        success++;
      } else {
        fail++;
      }
    }

    const pct = Math.round(((i + batch.length) / rows.length) * 100);
    process.stdout.write(`\r진행: ${i + batch.length}/${rows.length} (${pct}%) - 성공: ${success}, 실패: ${fail}`);

    // Rate limit: 50건 병렬 후 0.5초 대기
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n\n=== 완료 ===\n성공: ${success}개 | 실패: ${fail}개`);

  const [check] = await conn.execute("SELECT COUNT(*) as c FROM apartments WHERE lat != '0' AND lat IS NOT NULL");
  console.log(`좌표 있는 아파트: ${check[0].c}개`);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
