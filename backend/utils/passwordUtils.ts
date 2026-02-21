import bcrypt from 'bcrypt';

// 비밀번호 해싱 설정 (Salt Rounds)
const SALT_ROUNDS = 10;

/**
 * 비밀번호를 암호화(해싱)합니다.
 * @param password 평문 비밀번호
 * @returns 해싱된 비밀번호 문자열
 */
export const hashPassword = async (password: string): Promise<string> => {
    // bcrypt로 비밀번호 해싱
    return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * 비밀번호를 검증합니다.
 * @param password 사용자가 입력한 평문 비밀번호
 * @param hash DB에 저장된 해시
 * @returns 일치 여부 (true/false)
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    // 평문 비밀번호와 해시 비교
    return await bcrypt.compare(password, hash);
};
