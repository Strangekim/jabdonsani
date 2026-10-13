import { createStatisticsAccumulator, stepStatistics, type StatisticsOptions } from '@/lib/basketball/statistics';

/** 대량 검증을 별도 스레드에서 돌려 경기 조작과 화면을 멈추지 않는다. */
self.onmessage = (event: MessageEvent<StatisticsOptions>) => {
    try {
        const accumulator = createStatisticsAccumulator(event.data);
        const advance = () => {
            try {
                const result = stepStatistics(accumulator, 150);
                self.postMessage(result);
                if (!result.done) setTimeout(advance, 0);
            } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : '통계 실행 오류' }); }
        };
        advance();
    } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : '통계 초기화 오류' }); }
};
