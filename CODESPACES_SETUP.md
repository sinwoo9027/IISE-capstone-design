# GitHub Codespaces 설정 가이드

AptGPT를 GitHub Codespaces에서 개발하고 테스트하는 방법입니다.

## 🚀 Codespaces 시작하기

### 1. Codespace 생성

1. GitHub 레포지토리 페이지 열기: https://github.com/sinwoo9027/IISE-capstone-design
2. **Code** 버튼 클릭 → **Codespaces** 탭
3. **Create codespace on main** 클릭
4. 환경이 준비될 때까지 대기 (약 2-3분)

### 2. 환경 변수 설정

Codespaces 터미널에서:

```bash
# .env 파일 생성
cat > .env << 'EOF'
DATABASE_URL=mysql://user:password@localhost:3306/aptgpt
JWT_SECRET=dev_secret_key_12345
VITE_APP_ID=dev_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
STRIPE_SECRET_KEY=sk_test_local
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_local
STRIPE_WEBHOOK_SECRET=whsec_test_local
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=dev_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=dev_key
EOF
```

### 3. 의존성 설치 및 데이터베이스 설정

```bash
# 의존성 설치
pnpm install

# 데이터베이스 마이그레이션
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 4. 테스트 데이터 삽입

```bash
# 테스트 데이터 삽입 스크립트 실행
node seed-data.mjs
```

**출력 예시:**
```
🌱 테스트 데이터 삽입 시작...

📍 지하철역 데이터 삽입...
✅ 10개 지하철역 데이터 삽입 완료

🏢 아파트 데이터 삽입...
✅ 7개 아파트 데이터 삽입 완료

💰 거래 데이터 삽입...
✅ 84개 거래 데이터 삽입 완료

🎉 모든 테스트 데이터 삽입 완료!
```

### 5. 개발 서버 시작

```bash
# 개발 서버 시작
pnpm dev
```

**출력 예시:**
```
> aptgpt@1.0.0 dev
> NODE_ENV=development tsx watch server/_core/index.ts

[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
```

### 6. 포트 포워딩 및 접근

Codespaces에서 자동으로 포트 포워딩이 설정됩니다:

1. **Ports** 탭 확인 (터미널 옆)
2. 포트 3000이 **Public**으로 설정되어 있는지 확인
3. 표시된 URL 클릭하여 애플리케이션 접근

## 🧪 테스트 실행

```bash
# 모든 테스트 실행
pnpm test

# 특정 테스트 파일만 실행
pnpm test server/recommender.test.ts
pnpm test server/stripe.test.ts
```

## 🔧 개발 워크플로우

### 새 기능 추가

1. **브랜치 생성**
   ```bash
   git checkout -b feature/새기능명
   ```

2. **코드 작성**
   - `server/` - 백엔드 로직
   - `client/src/` - 프론트엔드 UI
   - `drizzle/schema.ts` - 데이터베이스 스키마

3. **테스트 작성**
   ```bash
   # server/*.test.ts 파일에 테스트 추가
   pnpm test
   ```

4. **커밋 및 푸시**
   ```bash
   git add .
   git commit -m "feat: 새 기능 설명"
   git push origin feature/새기능명
   ```

5. **Pull Request 생성**
   - GitHub에서 PR 생성
   - 리뷰 후 병합

## 📊 데이터베이스 관리

### 데이터 확인

```bash
# MySQL 접속
mysql -h localhost -u root -p

# 데이터 조회
USE aptgpt;
SELECT COUNT(*) FROM apartments;
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM subway_stations;
```

### 데이터 초기화

```bash
# 테이블 삭제 및 재생성
pnpm drizzle-kit drop
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 테스트 데이터 다시 삽입
node seed-data.mjs
```

## 🐛 문제 해결

### 포트 충돌
```bash
# 포트 3000이 이미 사용 중인 경우
lsof -i :3000
kill -9 <PID>
```

### 데이터베이스 연결 실패
```bash
# 데이터베이스 상태 확인
mysql -h localhost -u root -p -e "SELECT 1"

# 재시작
sudo service mysql restart
```

### 의존성 문제
```bash
# 캐시 삭제 및 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 💡 팁

1. **포트 포워딩 자동 설정** - Codespaces는 자동으로 포트를 공개 URL로 포워딩합니다
2. **VS Code 확장** - Codespaces 내에서 모든 VS Code 확장 사용 가능
3. **Git 자동 인증** - GitHub 계정으로 자동 인증되어 git push/pull 가능
4. **터미널 분할** - 여러 터미널을 동시에 실행하여 개발 효율 증대

## 🔗 유용한 링크

- [GitHub Codespaces 공식 문서](https://docs.github.com/en/codespaces)
- [Codespaces 환경 커스터마이징](https://docs.github.com/en/codespaces/customizing-your-codespace)
- [devcontainer.json 설정](https://containers.dev/)

## 📝 Codespaces에서 협업

### 팀원과 함께 작업

1. **Codespace 공유** (선택사항)
   - Codespace 우측 상단 "Share" 클릭
   - 팀원 초대

2. **브랜치로 협업**
   ```bash
   # 메인 브랜치 최신화
   git pull origin main
   
   # 새 브랜치 생성
   git checkout -b feature/팀원이름-기능
   
   # 작업 후 푸시
   git push origin feature/팀원이름-기능
   ```

3. **Pull Request로 리뷰**
   - GitHub에서 PR 생성
   - 팀원이 코드 리뷰
   - 승인 후 병합

---

**Codespaces 사용 시간:**
- 월 120시간 무료 (GitHub Free 플랜)
- 월 180시간 무료 (GitHub Pro 플랜)
- 초과 시 시간당 $0.18 청구

더 많은 정보는 [README.md](README.md)를 참조하세요.
