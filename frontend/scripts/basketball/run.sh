#!/usr/bin/env bash
set -euo pipefail
# 별도 임시 디렉터리에서 순수 TypeScript 엔진을 컴파일해 브라우저 의존성 없이 검증한다.
cd "$(dirname "$0")/../.."
BUILD_DIR="$(mktemp -d /tmp/basketball-check.XXXXXX)"
trap 'rm -rf "$BUILD_DIR"' EXIT
./node_modules/.bin/tsc --project scripts/basketball/tsconfig.json --outDir "$BUILD_DIR"
MODE="${1:-test}"
if [[ "$MODE" == "test" || "$MODE" == "all" ]]; then
  node --test "$BUILD_DIR"/tests/basketball/*.test.js
fi
if [[ "$MODE" == "statistics" || "$MODE" == "all" ]]; then
  node "$BUILD_DIR"/scripts/basketball/simulate.js "${2:-10000}" "${3:-100}"
fi
