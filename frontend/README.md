This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 농구 탭 (Micro-Turn Basketball)

`npm run dev` 후 `/basketball`에서 플레이합니다. 백엔드 없이 동작하는 순수 TypeScript 1:1 엔진과 React/SVG 디버그 UI입니다.

```bash
npm run test:basketball       # 엔진 규칙·재현·대칭성·능력치 테스트
npm run test:basketball-ui    # 실제 엔진을 연결한 React DOM 상호작용 테스트
npm run stats:basketball      # 10,000포제션 이상 + 능력치/조합 실험
npm run lint:basketball
npm run typecheck
npm run build
```

설계 및 검증: [`docs/basketball/game_design.md`](docs/basketball/game_design.md), [`test_results.md`](docs/basketball/test_results.md), [`balance_report.md`](docs/basketball/balance_report.md). 통계는 `docs/basketball/results/`에 저장됩니다. 이 게임의 3드리블은 실제 바운스가 아닌 드리블 **행동 단위**를 뜻합니다. 로컬 hotseat는 온라인 대전/보안 프로토콜이 아닙니다.
