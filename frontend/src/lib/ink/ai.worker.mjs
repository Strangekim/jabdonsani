import { chooseAction } from './ai.mjs';

self.onmessage = event => {
  const { view, profile, fast } = event.data;
  try {
    const result = chooseAction(view, profile, { fast });
    self.postMessage({ ok: true, version: view.version, result });
  } catch (error) {
    self.postMessage({ ok: false, version: view.version, error: error instanceof Error ? error.message : String(error) });
  }
};
