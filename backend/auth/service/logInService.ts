import { query } from "../../config/db";
import { comparePassword } from "../../utils/passwordUtils";
import { createCustomError } from "../../middleware/customError";
import { LoginBody } from "../model";

interface LoginResult {
    userId: number;
    loginId: string;
}

/**
 * 관리자 로그인 검증 서비스
 * @param loginData Zod 검증을 통과한 { id, password }
 * @returns userId, loginId (세션 저장용)
 */
export const logInService = async (loginData: LoginBody): Promise<LoginResult> => {
    const { id, password } = loginData;

    const sql = `SELECT id, login_id AS "loginId", password AS "hashedPw" FROM admins WHERE login_id = $1`;
    const result = await query(sql, [id]);
    const admin = result.rows[0];

    if (!admin) {
        throw createCustomError("ID 또는 비밀번호가 일치하지 않습니다.", 401, "INVALID_CREDENTIALS");
    }

    const isValid = await comparePassword(password, admin.hashedPw);
    if (!isValid) {
        throw createCustomError("ID 또는 비밀번호가 일치하지 않습니다.", 401, "INVALID_CREDENTIALS");
    }

    return { userId: admin.id, loginId: admin.loginId };
};
