import cors from 'cors';

// 프론트엔드 클라이언트 주소
export const CLIENT_ORIGIN = 'http://localhost:3000';

// CORS 설정
export const corsConfig = cors({
    origin: CLIENT_ORIGIN,        // 프론트엔드 주소만 허용
    credentials: true,            // 세션 쿠키 전송 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
