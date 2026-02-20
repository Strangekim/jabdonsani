const express = require('express');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');

// 환경변수 로드
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// ============================================================
// 미들웨어 설정
// ============================================================

// JSON 요청 파싱
app.use(express.json());

// URL 인코딩된 요청 파싱
app.use(express.urlencoded({ extended: true }));

// CORS 설정 (프론트엔드 도메인 허용)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// 세션 설정 (메모리 저장소 사용)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24  // 24시간
  }
}));

// 정적 파일 서빙 (업로드 이미지)
app.use('/uploads', express.static('uploads'));

// ============================================================
// 라우터 등록
// ============================================================

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// TODO: 각 라우터 등록
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/trends', require('./routes/trends'));
// app.use('/api/posts', require('./routes/posts'));
// app.use('/api/tags', require('./routes/tags'));
// app.use('/api/tools', require('./routes/tools'));
// app.use('/api/visitors', require('./routes/visitors'));
// app.use('/api/batch', require('./routes/batch'));

// ============================================================
// 공통 에러 핸들러
// ============================================================
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '서버 내부 오류가 발생했습니다.'
    }
  });
});

// ============================================================
// 서버 시작
// ============================================================
app.listen(PORT, () => {
  console.log(`[Backend] 서버 시작: http://localhost:${PORT}`);
});
