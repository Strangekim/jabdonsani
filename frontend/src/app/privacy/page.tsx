/**
 * 개인정보처리방침 페이지 ("/privacy")
 *
 * AdSense 요구사항을 위한 정적 개인정보처리방침 페이지.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '개인정보처리방침',
};

export default function PrivacyPage() {
    return (
        <main
            style={{
                maxWidth: '720px',
                margin: '0 auto',
                padding: '40px var(--content-padding)',
                lineHeight: '1.8',
                color: 'var(--color-text-primary)',
            }}
        >
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
                개인정보처리방침
            </h1>

            <section style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
                    1. 수집하는 정보
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
                    잡동사니는 서비스 제공을 위해 방문자 통계(페이지뷰, 방문 횟수)를
                    수집합니다. 이 과정에서 쿠키가 사용될 수 있습니다.
                </p>
            </section>

            <section style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
                    2. 쿠키 사용
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
                    본 사이트는 Google AdSense 광고 게재를 위해 쿠키를 사용할 수 있습니다.
                    사용자는 브라우저 설정을 통해 쿠키를 관리할 수 있습니다.
                </p>
            </section>

            <section>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
                    3. 문의
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
                    개인정보 관련 문의사항은 이메일로 연락해주세요.
                </p>
            </section>
        </main>
    );
}
