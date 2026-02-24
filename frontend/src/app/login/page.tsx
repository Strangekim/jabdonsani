'use client';

/**
 * 로그인 페이지 ("/login")
 * 네비게이션에 노출되지 않으며 직접 URL로만 접근 가능합니다.
 * useLogin 뮤테이션으로 로그인 후 인증 캐시를 자동 갱신합니다.
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/hooks/useAuthMutations';
import styles from './page.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    /* useLogin: 성공 시 auth 캐시 자동 무효화 */
    const { mutate: login, isPending } = useLogin();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError('');

        login(
            { id, password },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        router.push('/blog');
                    } else {
                        setError(data.error.message);
                    }
                },
                onError: () => {
                    setError('서버에 연결할 수 없습니다.');
                },
            }
        );
    };

    return (
        <main className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <h1 className={styles.title}>로그인</h1>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="id">아이디</label>
                    <input
                        id="id"
                        className={styles.input}
                        type="text"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="password">비밀번호</label>
                    <input
                        id="password"
                        className={styles.input}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button className={styles.button} type="submit" disabled={isPending}>
                    {isPending ? '로그인 중...' : '로그인'}
                </button>
            </form>
        </main>
    );
}
