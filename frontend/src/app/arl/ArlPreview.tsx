'use client';

import { useQuery } from '@tanstack/react-query';
import styles from './ArlPreview.module.css';

interface PreviewStatus {
    ready: boolean;
    sha: string | null;
    deployedAt: string | null;
    previewUrl: string | null;
    runUrl: string | null;
}

function parseStatus(value: unknown): PreviewStatus {
    if (typeof value !== 'object' || value === null || !('ready' in value)) {
        throw new Error('미리보기 상태 응답을 확인할 수 없습니다.');
    }

    const status = value as Record<string, unknown>;
    if (status.ready === false) {
        return { ready: false, sha: null, deployedAt: null, previewUrl: null, runUrl: null };
    }

    if (
        status.ready !== true ||
        typeof status.sha !== 'string' ||
        !/^[a-f0-9]{40}$/.test(status.sha) ||
        typeof status.previewUrl !== 'string' ||
        !new RegExp(`^/api/arl-preview/releases/${status.sha}-[0-9]+-[0-9]+/index\\.html$`).test(status.previewUrl)
    ) {
        throw new Error('미리보기 배포 정보가 올바르지 않습니다.');
    }

    return {
        ready: true,
        sha: status.sha,
        previewUrl: status.previewUrl,
        deployedAt: typeof status.deployedAt === 'string' && Number.isFinite(Date.parse(status.deployedAt))
            ? status.deployedAt
            : null,
        runUrl: typeof status.runUrl === 'string' && /^https:\/\/github\.com\/Strangekim\/AcousticRealityLab\/actions\/runs\/\d+$/.test(status.runUrl)
            ? status.runUrl
            : null,
    };
}

async function fetchStatus(signal: AbortSignal): Promise<PreviewStatus> {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal.aborted) cancel();
    signal.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(cancel, 12_000);

    try {
        const response = await fetch('/api/arl-preview/status', {
            cache: 'no-store',
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error('미리보기 서버에 연결하지 못했습니다. 잠시 후 다시 확인해 주세요.');
        }
        return parseStatus(await response.json());
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('미리보기 서버의 응답이 늦어지고 있습니다. 다시 확인해 주세요.');
        }
        if (error instanceof SyntaxError) {
            throw new Error('미리보기 서버가 준비 중입니다. 잠시 후 다시 확인해 주세요.');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
    }
}

export default function ArlPreview() {
    const { data, error, isPending, isFetching, refetch } = useQuery({
        queryKey: ['arl-preview-status'],
        queryFn: ({ signal }) => fetchStatus(signal),
        retry: 1,
        refetchOnWindowFocus: false,
        // 첫 배포가 완료되면 대기 화면에서 자동으로 미리보기를 연다.
        refetchInterval: (query) => query.state.data?.ready === false ? 30_000 : false,
    });

    return (
        <main className={styles.page}>
            <header className={styles.heading}>
                <div>
                    <p className={styles.eyebrow}>ACOUSTIC REALITY LAB</p>
                    <h1 className={styles.title}>ARL 개발 미리보기</h1>
                    <p className={styles.description}>브라우저에서 배포된 ARL의 BIM 공간과 음향 작업 화면을 확인합니다.</p>
                </div>
                <span className={styles.badge}>개발 중</span>
            </header>

            <section className={styles.preview} aria-label="ARL 미리보기">
                <div className={styles.toolbar}>
                    <div className={styles.version}>
                        <span className={`${styles.dot} ${data?.ready ? styles.dotReady : ''}`} aria-hidden="true" />
                        <span>{data?.ready ? '최근 배포' : '배포 상태'}</span>
                        {data?.sha && <code title={data.sha}>{data.sha.slice(0, 7)}</code>}
                        {data?.deployedAt && (
                            <time dateTime={data.deployedAt} className={styles.date}>
                                {new Date(data.deployedAt).toLocaleString('ko-KR')}
                            </time>
                        )}
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.button}
                            disabled={isFetching}
                            onClick={() => void refetch()}
                        >
                            {isFetching ? '확인 중…' : '다시 확인'}
                        </button>
                        {data?.previewUrl && (
                            <a className={styles.button} href={data.previewUrl} target="_blank" rel="noopener noreferrer">
                                새 탭으로 열기 ↗
                            </a>
                        )}
                    </div>
                </div>

                {error && data?.ready && (
                    <p className={styles.notice} role="status">최신 배포를 확인하지 못했습니다. 현재 화면은 계속 사용할 수 있습니다.</p>
                )}

                {data?.ready && data.previewUrl ? (
                    <iframe
                        key={data.previewUrl}
                        src={data.previewUrl}
                        title="Acoustic Reality Lab BIM·음향 개발 미리보기"
                        className={styles.frame}
                        allow="fullscreen"
                        allowFullScreen
                    />
                ) : (
                    <div className={styles.empty} role="status" aria-live="polite">
                        <span className={styles.emptyMark} aria-hidden="true">ARL</span>
                        <h2>{isPending ? '배포 상태를 확인하고 있습니다' : error ? '미리보기를 불러오지 못했습니다' : '첫 미리보기 배포를 기다리고 있습니다'}</h2>
                        <p>
                            {isPending
                                ? '잠시만 기다려 주세요.'
                                : error
                                    ? error.message
                                    : '첫 배포가 완료되면 이곳에서 실행됩니다. 준비 상태는 자동으로 확인합니다.'}
                        </p>
                    </div>
                )}
            </section>

            <footer className={styles.footer}>
                <p>Windows 앱의 BIM·음향 작업 화면을 브라우저에서 확인하는 개발 미리보기입니다. 지원 기능과 계산 범위는 실행 중인 버전의 안내를 확인해 주세요.</p>
                {data?.runUrl && (
                    <a href={data.runUrl} target="_blank" rel="noopener noreferrer">배포 기록 ↗</a>
                )}
            </footer>
        </main>
    );
}
