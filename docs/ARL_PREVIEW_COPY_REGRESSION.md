# ARL host description regression

## Plan before implementation — 2026-10-22

The host entry page still describes ARL as a 3D-only prototype with no acoustic
calculation. The independently deployed ARL workbench now contains BIM input,
device/material controls and a limited acoustic solver, so that fixed claim is
stale. The host must describe its purpose and direct users to the running
version's capability and calculation-scope guidance.

Acceptance goal:

- Render the real React entry component with an actual QueryClient and a mocked
  status HTTP response; verify the visible description does not repeat the stale
  unsupported-feature claim.
- Describe BIM/acoustic work and identify the embedded workbench accessibly.
- Keep the exact verified release URL, commit display and independent-tab link.
- Keep the no-release state truthful; it must not claim a particular runtime is
  ready before the status endpoint reports one.
- Change only explanatory text. Status parsing, polling, iframe permissions,
  hosting routes and deployment authentication are outside this correction.

Baseline: `Strangekim/jabdonsani` main
`73c14c502533cd943a901f13b93bd63cee963340`, tree
`8caf6779521f32dd50ef93cb1951a410b407b7ea`.

The regression tests are written and run before modifying the production
component. Results will be appended below.

## RED

Before editing `ArlPreview.tsx`, ran from `frontend`:

```sh
./node_modules/.bin/vitest run --config vitest.arl.config.ts
```

Vitest 3.2.7: **2 tests failed, 0 passed, exit 1**. The first failure printed the
real component's obsolete `음향 계산은 아직 구현되지 않았습니다` text. The second
showed the missing guidance to consult the running version in the waiting state.
The tests use React Testing Library/jsdom and the real QueryClient; only the
HTTP status response is replaced. No production component was modified before
this result.

## Smallest correction

Updated three displayed strings: the page description, iframe accessible title,
and footer. They describe BIM/acoustic work and ask the user to check the running
version's supported functions and calculation scope. No feature checklist is
duplicated in the host, so a rollback or future independent ARL release does not
leave a hardcoded solver-status assertion behind.

## GREEN

Repeated the same Vitest command: **2 tests passed, 0 failed, exit 0**.
The ready-state test also verifies that the full release URL, short commit,
accessible iframe, and safe independent-tab link remain intact. The waiting
state still has no iframe or release link before a release exists.

Targeted ESLint of `ArlPreview.tsx`, the new test and its Vitest config passed
with the repository's existing ESLint configuration. The isolated snapshot used
the already installed frontend dependencies; no package or lockfile changed.

In the full repository, rerun from `frontend`:

```sh
npx --no-install vitest run --config vitest.arl.config.ts
npx --no-install eslint src/app/arl/ArlPreview.tsx tests/arl/ArlPreview.test.tsx vitest.arl.config.ts
```

This evidence covers rendered DOM and the existing release-link contract, not
WASM execution or graphics. Parent integration owns the host commit, deployment,
and live-page confirmation. No remote commit or push was made by this worker.
