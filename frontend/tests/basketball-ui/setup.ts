import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/** jsdom이 제공하지 않는 파일 다운로드 URL만 보완한다. */
Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: () => 'blob:basketball-test' });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: () => undefined });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
