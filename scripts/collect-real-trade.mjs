/**
 * 실거래가 데이터 수집 스크립트 (배치 INSERT 최적화)
 * 서울 25개 구, 최근 12개월 실거래가 데이터 수집
 */
import mysql from "mysql2/promise";

const API_KEY = process.env.MOLIT_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!API_KEY || !DATABASE_URL) { console.error("Missing env"); process.exit(1); }

const DISTRICTS = {
  "11110":"종로구","11140":"중구","11170":"용산구","11200":"성동구","11215":"광진구",
  "11230":"동대문구","11260":"중랑구","11290":"성북구","11305":"강북구","11320":"도봉구",
  "11350":"노원구","11380":"은평구","11410":"서대문구","11440":"마포구","11470":"양천구",
  "11500":"강서구","11530":"구로구","11545":"금천구","11560":"영등포구","11590":"동작구",
  "11620":"관악구","11650":"서초구","11680":"강남구","11710":"송파구","11740":"강동구",
};

function getMonths(n=12) {
  const m=[]; const now=new Date();
  for(let i=0;i<n;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);m.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`);}
  return m;
}

async function fetchPage(lawdCd, ym) {
  const url = "http://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
  const p = new URLSearchParams({serviceKey:API_KEY,LAWD_CD:lawdCd,DEAL_YMD:ym,numOfRows:"9999",pageNo:"1"});
  for(let a=0;a<3;a++){
    try{
      const r=await fetch(`${url}?${p}`,{signal:AbortSignal.timeout(30000)});
      if(r.status===429||r.status>=500){await new Promise(r=>setTimeout(r,3000));continue;}
      return await r.text();
    }catch(e){await new Promise(r=>setTimeout(r,2000));}
  }
  return null;
}

function parse(xml) {
  if(!xml) return [];
  const cm=xml.match(/<resultCode>(\d+)<\/resultCode>/);
  if(!cm||cm[1]!=="000") return [];
  const items=[];const re=/<item>([\s\S]*?)<\/item>/g;let m;
  while((m=re.exec(xml))!==null){
    const x=m[1];const g=t=>{const r=x.match(new RegExp(`<${t}>(.*?)</${t}>`));return r?r[1].trim():null;};
    items.push({aptNm:g("aptNm"),buildYear:g("buildYear"),dealAmount:g("dealAmount"),dealDay:g("dealDay"),dealMonth:g("dealMonth"),dealYear:g("dealYear"),excluUseAr:g("excluUseAr"),floor:g("floor"),umdNm:g("umdNm"),jibun:g("jibun")});
  }
  return items;
}

async function main() {
  console.log("=== 실거래가 수집 시작 (배치 최적화) ===");
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // 기존 데이터 삭제
  await conn.execute("DELETE FROM transactions");
  await conn.execute("DELETE FROM apartments");
  console.log("기존 데이터 삭제 완료\n");

  const months = getMonths(12);
  const aptMap = new Map();
  let aptId = 0, totalTx = 0;
  const aptBatch = [];
  const txBatch = [];
  const BATCH_SIZE = 500;

  async function flushApts() {
    if(aptBatch.length===0) return;
    const vals = aptBatch.map(()=>"(?,?,?,?,?,?,?,?,?)").join(",");
    const flat = aptBatch.flat();
    await conn.execute(`INSERT INTO apartments (id,apt_name,sigungu,dong,lat,lng,built_year,households,repr_area_m2) VALUES ${vals}`, flat);
    aptBatch.length = 0;
  }
  async function flushTx() {
    if(txBatch.length===0) return;
    const vals = txBatch.map(()=>"(?,?,?,?)").join(",");
    const flat = txBatch.flat();
    await conn.execute(`INSERT INTO transactions (apt_id,contract_date,price_krw,area_m2) VALUES ${vals}`, flat);
    txBatch.length = 0;
  }

  for(const [code, name] of Object.entries(DISTRICTS)) {
    const t0 = Date.now();
    let distTx = 0;
    for(const ym of months) {
      const xml = await fetchPage(code, ym);
      const items = parse(xml);
      for(const it of items) {
        if(!it.aptNm||!it.dealAmount||!it.excluUseAr) continue;
        const key = `${name}|${it.umdNm||""}|${it.aptNm}|${it.buildYear||""}`;
        if(!aptMap.has(key)) {
          aptId++;
          aptMap.set(key, aptId);
          aptBatch.push([aptId, it.aptNm, name, it.umdNm||"", "0","0", it.buildYear?parseInt(it.buildYear):null, null, it.excluUseAr]);
          if(aptBatch.length>=BATCH_SIZE) await flushApts();
        }
        const aid = aptMap.get(key);
        const cd = `${it.dealYear}-${String(it.dealMonth).padStart(2,"0")}-${String(it.dealDay).padStart(2,"0")}`;
        const price = it.dealAmount.replace(/,/g,"").trim();
        txBatch.push([aid, cd, price, it.excluUseAr]);
        if(txBatch.length>=BATCH_SIZE) await flushTx();
        distTx++; totalTx++;
      }
      await new Promise(r=>setTimeout(r,200)); // rate limit
    }
    await flushApts();
    await flushTx();
    console.log(`[${name}] ${distTx}건 (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  }

  await flushApts();
  await flushTx();

  const [ac] = await conn.execute("SELECT COUNT(*) as c FROM apartments");
  const [tc] = await conn.execute("SELECT COUNT(*) as c FROM transactions");
  console.log(`\n=== 완료 ===\n아파트: ${ac[0].c}개 | 거래: ${tc[0].c}건`);
  await conn.end();
}

main().catch(e=>{console.error(e);process.exit(1);});
