import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { badRequestError } from '../middleware/customError';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const now   = new Date();
        const year  = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const dir   = path.join(UPLOAD_DIR, 'blog', year, month);

        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${randomUUID()}${ext}`);
    },
});

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
) => {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (ALLOWED.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, png, gif, webp)'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, /* 5 MB */
}).single('image');

/**
 * multer 에러를 customError로 변환하는 래퍼 미들웨어
 * router에서 isAuthenticated 다음에 바로 사용
 */
export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? '파일 크기는 5MB를 초과할 수 없습니다.'
                : err.message;
            return next(badRequestError(msg, 'MULTER_ERROR'));
        }
        if (err instanceof Error) {
            return next(badRequestError(err.message, 'UPLOAD_ERROR'));
        }
        next();
    });
};
