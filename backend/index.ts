import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { corsConfig } from './config/cors';
import { sessionConfig } from './config/session';
import { ping } from './config/db';
import authRouter from './auth/router';
import trendsRouter from './trends/router';
import postsRouter from './posts/router';
import tagsRouter from './tags/router';
import toolsRouter from './tools/router';
import visitorsRouter from './visitors/router';
import batchRouter from './batch/router';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS 설정 (가장 먼저)
app.use(corsConfig);

// JSON 파싱
app.use(express.json());

// 세션 설정
app.use(sessionConfig);

// ============ 상태 체크 API ====================

// 서버 상태 체크
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// DB 연결 체크
app.get("/ping", async (_req, res) => {
    try {
        res.json({ db: "ok", result: await ping() });
    } catch (e) {
        res.status(500).json({ db: "fail", error: String(e) });
    }
});

// ============ 라우터 설정 ====================

app.use("/api/auth", authRouter);
app.use("/api/trends", trendsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/visitors", visitorsRouter);
app.use("/api/batch", batchRouter);


// ============= 에러 핸들러 =============

// 404 핸들러 (라우트 미매칭 시)
app.use((req: any, res: any, next: any) => {
    res.status(404).send({
        success: false,
        message: 'Not Found'
    });
});

// 공통 에러 핸들러
app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);

    res.status(err.statusCode || err.status || 500).send({
        success: false,
        message: err.message || 'Internal server error'
    });
});


const server = createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
