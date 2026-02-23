import cors from 'cors';

// 프론트엔드 클라이언트 주소 (환경변수 우선)
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// CORS 설정
export const corsConfig = cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
