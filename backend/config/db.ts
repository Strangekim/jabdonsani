import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL 커넥션 풀 설정
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
 */
export const ping = async () => {
    const result = await pool.query("SELECT 1 as ok");
    return result.rows[0];
};
