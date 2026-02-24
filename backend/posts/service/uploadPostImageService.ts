import path from 'path';
import { query } from '../../config/db';

const UPLOAD_DIR      = process.env.UPLOAD_DIR      || '/app/uploads';
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || '';

/**
 * 게시글 이미지 업로드 서비스
 *  - 파일은 multer가 디스크에 저장 완료한 상태로 전달됨
 *  - uploads 테이블에 메타데이터 기록 후 공개 URL 반환
 *
 * @param file Express.Multer.File (multer diskStorage 결과)
 * @returns { url } — 브라우저에서 직접 접근 가능한 이미지 URL
 */
export const uploadPostImageService = async (
    file: Express.Multer.File,
): Promise<{ url: string }> => {
    /* relative path from UPLOAD_DIR: blog/2026/02/uuid.webp */
    const relativePath = path.relative(UPLOAD_DIR, file.path).replace(/\\/g, '/');
    const url          = `${UPLOAD_BASE_URL}/uploads/${relativePath}`;

    await query(
        `INSERT INTO uploads (filename, original_name, mime_type, size_bytes, url)
         VALUES ($1, $2, $3, $4, $5)`,
        [relativePath, file.originalname, file.mimetype, file.size, url],
    );

    return { url };
};
