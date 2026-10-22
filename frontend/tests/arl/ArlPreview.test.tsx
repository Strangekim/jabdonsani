import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ArlPreview from '../../src/app/arl/ArlPreview';

const sha = '12d6398ef5f3382cfb8ab7ac920dede9c4c0b853';
const previewUrl = `/api/arl-preview/releases/${sha}-39743018914-1/index.html`;
const clients: QueryClient[] = [];

function renderStatus(status: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => status })));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><ArlPreview /></QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.unstubAllGlobals();
});

describe('ARL host capability guidance', () => {
  it('describes BIM/acoustic work and refers scope to the running version without the obsolete no-solver claim', async () => {
    const { container } = renderStatus({ ready: true, sha, previewUrl,
      deployedAt: '2026-10-22T07:47:50Z',
      runUrl: 'https://github.com/Strangekim/AcousticRealityLab/actions/runs/39743018914' });
    expect(await screen.findByText(sha.slice(0, 7))).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveTextContent('음향 계산은 아직 구현되지 않았습니다');
    expect(container.querySelector('header')).toHaveTextContent(/BIM.*음향/);
    expect(container.querySelector('footer')).toHaveTextContent('지원 기능과 계산 범위');
    expect(container.querySelector('footer')).toHaveTextContent('실행 중인 버전');
    expect(screen.getByTitle(/Acoustic Reality Lab.*BIM.*음향/)).toHaveAttribute('src', previewUrl);
    expect(screen.getByRole('link', { name: /새 탭으로 열기/ })).toHaveAttribute('href', previewUrl);
    expect(screen.getByRole('link', { name: /새 탭으로 열기/ })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps an undeployed preview in the waiting state without an iframe or release link', async () => {
    const { container } = renderStatus({ ready: false });
    expect(await screen.findByRole('heading', { name: '첫 미리보기 배포를 기다리고 있습니다' })).toBeInTheDocument();
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /새 탭으로 열기/ })).not.toBeInTheDocument();
    expect(container.querySelector('footer')).toHaveTextContent('실행 중인 버전');
  });
});
