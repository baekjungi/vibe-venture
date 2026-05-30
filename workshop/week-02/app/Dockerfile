# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Stage 1 — deps: 프로덕션 의존성만 설치
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM node:22-alpine AS deps

WORKDIR /app

# package.json + lock 파일만 먼저 복사 (레이어 캐시 최적화)
# 소스 변경 시 npm ci를 다시 실행하지 않아도 됨
COPY package.json package-lock.json ./

# --omit=dev: devDependencies(jest, supertest) 제외
# --ignore-scripts: postinstall 스크립트 실행 금지 (공급망 공격 방어)
RUN npm ci --omit=dev --ignore-scripts


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Stage 2 — runner: 최소 실행 이미지
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM node:22-alpine AS runner

# 보안: 컨테이너 안에서 root 대신 비권한 사용자 실행
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs appuser

WORKDIR /app

# Stage 1에서 빌드된 node_modules만 복사 (devDependencies 제외)
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# 소스 파일 복사 (.dockerignore에서 불필요한 파일 제외)
COPY --chown=appuser:nodejs server.js      ./
COPY --chown=appuser:nodejs public/        ./public/
COPY --chown=appuser:nodejs data/          ./data/

# 비권한 사용자로 전환 (root 실행 방지)
USER appuser

# 포트 문서화 (실제 바인딩은 docker run -p 또는 컨테이너 오케스트레이터가 담당)
EXPOSE 3000

# 프로세스 헬스체크 — 컨테이너 오케스트레이터가 앱 상태 감지
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/regions || exit 1

# API 키는 환경 변수로 주입 (이미지에 절대 포함 금지)
# docker run -e NEIS_API_KEY=... 또는 쿠버네티스 Secret으로 주입
ENV NODE_ENV=production \
    PORT=3000

# node 직접 실행 (npm start 대신) — PID 1로 시그널 정상 수신
CMD ["node", "server.js"]
