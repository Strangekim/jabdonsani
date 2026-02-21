import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'chatuser',
    DB_PASSWORD = 'chatpass1234',
    DB_NAME = 'jabdongsani',
} = process.env;

// PostgreSQL 커넥션 풀 설정
const pool = new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    max: 5,                   // 최대 커넥션 수
    idleTimeoutMillis: 30000, // 유휴 커넥션 타임아웃
    connectionTimeoutMillis: 2000, // 커넥션 타임아웃
});

export { pool };

/**
 * SQL 쿼리를 실행하는 헬퍼 함수
 * @param text SQL 쿼리 문자열
 * @param params 바인딩 파라미터 배열
 * @returns 쿼리 결과
 */
export const query = (text: string, params?: any[]) => pool.query(text, params);

/**
 * DB 연결 상태를 확인하는 핑 함수
 * @returns { ok: 1 } 형태의 결과
 */
export const ping = async () => {
    const result = await pool.query("SELECT 1 as ok");
    return result.rows[0];
};
