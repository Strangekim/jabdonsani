# ============================================================
# 프론트엔드 Dockerfile (Next.js)
# 멀티스테이지 빌드: 의존성 설치 → 빌드 → 경량 실행 이미지
# ============================================================

# --- 1단계: 의존성 설치 ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- 2단계: 빌드 ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 사용할 환경변수
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- 3단계: 프로덕션 실행 ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# standalone 출력물만 복사 (경량화)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
