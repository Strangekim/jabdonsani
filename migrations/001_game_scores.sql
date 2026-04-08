-- 게임 점수 테이블 추가 (기존 DB에 적용)
CREATE TABLE IF NOT EXISTS game_scores (
    id          SERIAL PRIMARY KEY,
    game_id     VARCHAR(50)  NOT NULL,
    nickname    VARCHAR(20)  NOT NULL,
    score       INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_ranking ON game_scores (game_id, score DESC);
