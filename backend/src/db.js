const { Pool } = require('pg');

/**
 * PostgreSQL 연결 풀 생성
 * .env 파일에서 DB 접속 정보를 읽어온다
 */
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'jabdongsani',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

// 연결 테스트 로그
pool.on('connect', () => {
    console.log('[DB] PostgreSQL 연결 성공');
});

pool.on('error', (err) => {
    console.error('[DB] PostgreSQL 연결 오류:', err.message);
});

module.exports = pool;
