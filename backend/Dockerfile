# ============================================================
# 백엔드 Dockerfile (Express + TypeScript)
# ============================================================

FROM node:20-alpine
WORKDIR /app

# 의존성 설치 (devDependencies 포함 — ts-node, typescript 필요)
COPY package.json package-lock.json* ./
RUN npm ci

# 소스코드 복사
COPY . .

# 업로드 디렉토리 생성
RUN mkdir -p uploads

EXPOSE 3001
CMD ["npx", "ts-node", "index.ts"]
