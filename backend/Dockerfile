# ============================================================
# 백엔드 Dockerfile (Express)
# ============================================================

FROM node:20-alpine
WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# 소스코드 복사
COPY . .

# 업로드 디렉토리 생성
RUN mkdir -p uploads

EXPOSE 4000
CMD ["node", "src/index.js"]
