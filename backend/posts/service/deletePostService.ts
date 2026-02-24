import path from 'path';
import fs from 'fs';
import { query } from '../../config/db';
import { notFoundError } from '../../middleware/customError';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

/**
 * 블로그 글 삭제 서비스
 *  1. 글 본문에서 업로드된 이미지 URL 추출
 *  2. uploads 테이블에서 해당 레코드 조회 → 디스크 파일 삭제
 *  3. posts 삭제 (cascade → post_tags 자동 삭제)
 */
export const deletePostService = async (id: string): Promise<{ message: string }> => {
    /* 1. 글 존재 여부 확인 + content 가져오기 */
    const postResult = await query(
        `SELECT content FROM posts WHERE id = $1`,
        [id],
    );
    if (postResult.rows.length === 0) {
        throw notFoundError('해당 ID의 글이 없습니다.', 'POST_NOT_FOUND');
    }
    const content: string = postResult.rows[0].content;

    /* 2. 본문에서 /uploads/blog/YYYY/MM/filename 패턴 추출 */
    const urlRegex = /\/uploads\/(blog\/\d{4}\/\d{2}\/[^\s"'\)\]]+)/g;
    const relPaths: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(content)) !== null) {
        relPaths.push(match[1]);
    }

    /* 3. 매칭된 파일 → uploads 조회 → 디스크 삭제 → DB 삭제 */
    if (relPaths.length > 0) {
        const uploadResult = await query(
            `SELECT id, filename FROM uploads WHERE filename = ANY($1)`,
            [relPaths],
        );

        for (const row of uploadResult.rows) {
            const filePath = path.join(UPLOAD_DIR, row.filename);
            try {
                fs.unlinkSync(filePath);
            } catch {
                console.warn(`[Upload] 파일 삭제 실패 (무시): ${filePath}`);
            }
        }

        if (uploadResult.rows.length > 0) {
            const ids = uploadResult.rows.map((r: { id: number }) => r.id);
            await query(`DELETE FROM uploads WHERE id = ANY($1)`, [ids]);
        }
    }

    /* 4. 글 삭제 (post_tags는 CASCADE로 자동 삭제) */
    await query(`DELETE FROM posts WHERE id = $1`, [id]);

    return { message: '글이 삭제되었습니다' };
};
