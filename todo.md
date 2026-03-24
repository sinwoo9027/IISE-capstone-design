# AptGPT - 프로젝트 TODO

## 데이터베이스 스키마
- [x] apartments 테이블 (아파트명, 위치, 좌표, 건축년도, 세대수, 대표면적)
- [x] transactions 테이블 (거래일, 가격, 면적, 아파트 연결)
- [x] subway_stations 테이블 (역명, 호선, 좌표, 환승역 여부)
- [x] user_preferences 테이블 (사용자 선호도 저장)
- [x] recommendations 테이블 (추천 결과 저장)

## 추천 알고리즘
- [x] 거리 기반 점수 계산 (Haversine 공식)
- [x] 교통 점수 계산 (역 개수, 최단 거리, 환승역 보너스)
- [x] 가격 점수 계산 (예산 대비)
- [x] 트렌드 점수 계산 (최근 거래량 / 평균 거래량)
- [x] 투자 성향 점수 계산 (안정형/수익형)
- [x] 최종 점수 가중치 합산

## 프론트엔드 UI
- [x] 사용자 선호도 입력 폼 (예산, 지역, 면적, 교통 중요도)
- [x] 대시보드 레이아웃 (International Typographic Style 적용)
- [x] 추천 결과 카드 목록 (점수순 정렬)
- [x] 개별 아파트 상세 페이지
- [ ] 실거래가 차트 (최근 1년 추이)
- [x] 지도 시각화 (Google Maps)
- [x] 대화형 추천 이유 설명 (LLM 기반)

## 백엔드 API
- [x] 추천 API 엔드포인트 (tRPC procedure)
- [x] 아파트 상세 정보 조회 API (DB 헬퍼)
- [x] 실거래가 조회 API (DB 헬퍼)
- [x] 주변 지하철역 조회 API (DB 헬퍼)
- [x] LLM 기반 추천 설명 생성 API
- [x] 사용자 선호도 저장 API (DB 헬퍼)

## 지도 및 시각화
- [x] Google Maps 통합
- [x] 아파트 마커 표시
- [ ] 지하철역 마커 표시
- [ ] 실거래가 차트 (Recharts)

## LLM 기반 기능
- [x] 추천 이유 자연어 설명 생성
- [x] 점수 계산 근거 설명
- [x] 대화형 Q&A 기능

## 알림 기능
- [ ] 새로운 아파트 등록 시 소유자 알림

## 테스트 및 최적화
- [x] 추천 알고리즘 단위 테스트 (25개 테스트 통과)
- [x] API 통합 테스트
- [ ] UI 반응성 테스트
- [ ] 예외 처리 및 에러 핸들링
- [ ] 성능 최적화

## 스타일 및 디자인
- [x] International Typographic Style 적용 (OKLCH 색상, IBM Plex Sans)
- [x] 색상 팔레트 (순백, 빨간색 액센트, 검은색)
- [x] 타이포그래피 (IBM Plex Sans 산세리프)
- [x] 그리드 시스템 및 여백 정의

## 버그 수정 (현재 진행 중)
- [x] Home.tsx useAuth import 중복 오류 해결
- [x] getFilteredApartments GROUP BY 오류 수정
- [x] 추천 API 정상 작동 확인 및 테스트
- [ ] 데이터베이스 쿼리 최적화

## SaaS 대시보드 기능
- [ ] 사용자 프로필 페이지 (구독 상태, 사용 현황)
- [ ] 추천 이력 조회 페이지
- [ ] 즐겨찾기 아파트 관리
- [ ] 비교 기능 (최대 3개 아파트)

## Stripe 결제 기능
- [ ] Stripe 계정 연동
- [ ] 구독 플랜 설정 (무료, 프리미엄, 엔터프라이즈)
- [ ] 결제 페이지 구현
- [ ] 결제 성공/실패 처리
- [ ] 구독 취소 기능
- [ ] 청구서 관리

## LLM 기반 설명 기능
- [ ] 추천 이유 자연어 설명 생성
- [ ] 대화형 Q&A 기능

## 상세페이지 고도화 (비정형 데이터 기반 의사결정 보조)
- [x] 한줄 브리핑 생성 함수 (교통/세대수/준공연도/가격/재건축 조합)
- [x] 최근 이슈 요약 생성 함수 (뉴스 키워드 분석)
- [x] 투자 포인트 추출 함수 (규칙 기반)
- [x] 유의 포인트 추출 함수 (리스크 분석)
- [x] 입지/생활 분위기 요약 함수 (지하철/지역 특성)
- [x] 뉴스 키워드 태그 추출 (긍정/중립/주의)
- [x] 상세페이지 UI 재구성 (헤더→점수→해석→데이터→뉴스 순서)
- [x] 투자 포인트 vs 유의 포인트 시각적 구분
- [x] 뉴스 요약문 우선 표시 (제목 나열 아님)
- [x] 키워드 태그 시각화


## 전면 재구성 - 실제 데이터 파이프라인 기반 백엔드 중심 구조
### Phase 1: DB 스키마 재설계
- [ ] apt_master 테이블 (법정동코드+지번 기반 apt_id)
- [ ] apt_trade 테이블 (매매 실거래가)
- [ ] apt_jeonse 테이블 (전월세 실거래가)
- [ ] subway_station 테이블 (역명, 호선, 좌표)
- [ ] apt_subway_map 테이블 (단지-역 거리 매핑)
- [ ] news_raw 테이블 (원본 기사)
- [ ] news_info 테이블 (요약/키워드/매핑)
- [ ] rebuild_status_current 테이블 (현재 재건축 현황)
- [ ] rebuild_status_history 테이블 (재건축 이력)
- [ ] data_evidence 테이블 (데이터 출처)
- [ ] etl_run_log 테이블 (배치 실행 로그)

### Phase 2: ETL 파이프라인
- [ ] 실거래가 수집 ETL (공공데이터포털 API)
- [ ] 전월세 수집 ETL (공공데이터포털 API)
- [ ] 지하철역 초기 적재 (서울 열린데이터광장)
- [ ] apt_subway_map 거리 계산 및 적재
- [ ] 뉴스 수집 ETL (네이버 검색 API)
- [ ] 재건축 수집 ETL (서울/지자체 공개자료)
- [ ] 배치 자동화 (cron/scheduler)
- [ ] etl_run_log 기록

### Phase 3: 추천 서버 로직
- [ ] recommendations tRPC procedure (Hard Filter + Soft Scoring)
- [ ] 5개 지표 실제 계산 (교통/규모/재건축/상승률/전세가율)
- [ ] 안정형/수익형 가중치 적용
- [ ] 교통 중요도 multiplier 반영
- [ ] 중복 아파트 제거

### Phase 4: 상세 데이터 API
- [ ] apartments.detail tRPC procedure (기본정보+요약)
- [ ] apartments.news tRPC procedure
- [ ] apartments.rebuild tRPC procedure
- [ ] admin.etlStatus tRPC procedure
- [ ] 비정형 설명 텍스트 서버 생성

### Phase 5: 프론트엔드 API 연동
- [ ] 추천 결과 tRPC 호출로 변경
- [ ] 상세페이지 tRPC 호출로 변경
- [ ] 하드코딩/mock 데이터 완전 제거
- [ ] 로딩/에러 상태 처리

### Phase 6: 테스트 및 문서
- [ ] API 테스트 코드
- [ ] .env.example 작성
- [ ] API 명세 문서
- [ ] 서버/ETL 실행 방법 문서

## 외부 API 연동
- [ ] 부동산 실거래가 API 서버 모듈 구현 (공공데이터 API)
- [ ] 부동산 실거래가 데이터를 DB에 저장/업데이트하는 로직
- [ ] 네이버 뉴스 API 서버 모듈 구현 (검색 API)
- [ ] 상세 페이지 뉴스 섹션에 네이버 뉴스 API 연동
- [ ] API 키 환경변수 등록 (실거래가 API, 네이버 API)
- [ ] 실거래가 API 데이터 파싱 및 DB 스키마 매핑
- [ ] 뉴스 검색 결과 캐싱 (중복 호출 방지)
- [ ] API 연동 단위 테스트

## 외부 API 연동 (Phase 2)
- [x] 환경변수 등록: 실거래가 API 키, 네이버 API 키, 추가 부동산 API 키
- [x] 서버 모듈: 국토교통부 실거래가 API 클라이언트 (server/api-realtrade.ts)
- [x] 서버 모듈: 네이버 뉴스 검색 API 클라이언트 (server/api-naver-news.ts)
- [ ] 서버 모듈: 추가 부동산 API 클라이언트 (server/api-realestate.ts)
- [ ] DB 데이터 교체: 실거래가 API로 아파트+거래 데이터 수집 스크립트
- [x] 뉴스 실시간 검색: 아파트명/지역명으로 네이버 뉴스 검색 + DB 캐싱 (24h TTL)
- [x] LLM 뉴스 요약: 검색된 뉴스를 LLM으로 3줄 요약 생성
- [x] 감성 분석 강화: 뉴스 키워드 LLM 기반 긍정/부정/중립 분류
- [x] 지역 동향 리포트: 시군구별 뉴스 모아서 동향 섹션 추가
- [x] routers.ts 업데이트: 실시간 뉴스 검색 API 연동
- [x] 프론트엔드 업데이트: 뉴스 요약/감성 태그/지역 동향 UI
- [x] API 연동 단위 테스트
- [x] 엔드투엔드 검증
