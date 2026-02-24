-- ============================================================
-- 잡동사니 프로젝트 — PostgreSQL 초기화 스크립트
-- 생성일: 2026-02-20
-- ============================================================

-- UUID 생성 확장 (필요 시)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 전문 검색용 확장 (동향 검색, 추후 RAG 확장 대비)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================
-- 1. 관리자 (인증)
-- ============================================================
CREATE TABLE admins (
    id          SERIAL PRIMARY KEY,
    login_id    VARCHAR(50)  NOT NULL UNIQUE,       -- 로그인 ID
    password    VARCHAR(255) NOT NULL,               -- bcrypt 해시
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 기본 관리자 계정 (비밀번호는 배포 전 반드시 변경)
-- 아래는 'admin1234'의 bcrypt 해시 예시
INSERT INTO admins (login_id, password)
VALUES ('roger345', '$2b$10$03gM1er8RppHIfllR/z58u/H7HTqnMija4phmizfNMA/k0vjTHwi6');

COMMENT ON TABLE admins IS '관리자 계정 테이블 — 단일 관리자 구조';


-- ============================================================
-- 2. 동향 (크롤링 수집 데이터)
-- ============================================================
CREATE TABLE trends (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(20)  NOT NULL,           -- 수집 소스: hn, localllama, ml, programming, robotics
    field           VARCHAR(20)  NOT NULL,           -- 분야 분류: ai, dev, robotics
    title           TEXT         NOT NULL,           -- 번역된 제목
    content         TEXT,                            -- 번역된 본문 (없을 수 있음)
    comment_summary TEXT,                            -- AI 생성 댓글 요약
    thumbnails      TEXT[]       DEFAULT '{}',       -- 썸네일 URL 배열
    upvotes         INT          NOT NULL DEFAULT 0, -- 원본 업보트 수
    original_url    TEXT         NOT NULL,           -- 원문 링크
    original_id     VARCHAR(100),                    -- 원본 게시글 ID (중복 방지용)
    batch_id        VARCHAR(50),                     -- 수집 배치 ID
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 커서 기반 페이지네이션 (created_at DESC)
CREATE INDEX idx_trends_created_at ON trends (created_at DESC);

-- 필터 조합 인덱스 (field + source + 시간순)
CREATE INDEX idx_trends_field_source ON trends (field, source, created_at DESC);

-- 원본 게시글 중복 방지
CREATE UNIQUE INDEX idx_trends_original ON trends (source, original_id);

-- 전문 검색 인덱스 (제목 + 본문)
CREATE INDEX idx_trends_search ON trends USING gin (
    (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')))
);

-- trigram 인덱스 (한국어 부분 검색 지원)
CREATE INDEX idx_trends_title_trgm ON trends USING gin (title gin_trgm_ops);

COMMENT ON TABLE trends IS '동향 카드 — 외부 사이트에서 크롤링 & 번역된 데이터';


-- ============================================================
-- 3. 동향 상위 댓글
-- ============================================================
CREATE TABLE trend_comments (
    id         SERIAL PRIMARY KEY,
    trend_id   INT   NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    text       TEXT  NOT NULL,                       -- 번역된 댓글 내용
    votes      INT   NOT NULL DEFAULT 0,             -- 댓글 업보트 수
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trend_comments_trend ON trend_comments (trend_id);

COMMENT ON TABLE trend_comments IS '동향 카드의 상위 댓글 (번역)';


-- ============================================================
-- 4. 블로그 글
-- ============================================================
CREATE TABLE posts (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(300) NOT NULL,               -- 글 제목
    content     TEXT         NOT NULL,               -- Markdown 본문
    description VARCHAR(500),                        -- 목록용 요약 (자동 생성 가능)
    views       INT          NOT NULL DEFAULT 0,     -- 조회수
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 커서 기반 페이지네이션
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);

-- 인기글 TOP 5 (조회수 기준)
CREATE INDEX idx_posts_views ON posts (views DESC);

COMMENT ON TABLE posts IS '블로그 글 — Markdown 기반';


-- ============================================================
-- 5. 태그 & 글-태그 관계
-- ============================================================
CREATE TABLE tags (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE                 -- 태그명 (유니크)
);

COMMENT ON TABLE tags IS '블로그 태그 목록';

CREATE TABLE post_tags (
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  INT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- 태그별 글 조회 인덱스
CREATE INDEX idx_post_tags_tag ON post_tags (tag_id);

COMMENT ON TABLE post_tags IS '블로그 글 ↔ 태그 다대다 관계';


-- ============================================================
-- 6. Tools (잡동사니 도구)
-- ============================================================
CREATE TABLE tools (
    id          VARCHAR(50) PRIMARY KEY,             -- 도구 식별자: pdf-merge, image-compress 등
    name        VARCHAR(100) NOT NULL,               -- 표시 이름: PDF 병합, 이미지 압축 등
    description TEXT,                                -- 도구 설명
    usage_count INT NOT NULL DEFAULT 0,              -- 누적 사용 횟수
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 초기 도구 데이터
INSERT INTO tools (id, name, description) VALUES
    ('image-compress',   '이미지 압축',       '브라우저에서 직접 이미지 용량 줄이기'),
    ('pdf-merge',        'PDF 병합',         '여러 PDF를 하나로 합치기'),
    ('qr-generator',     'QR 코드 생성',     '텍스트/URL → QR 코드 이미지 생성'),
    ('dice-roller',      '주사위 굴리기',     'D4~D20 다면체 주사위를 3D로 굴려보기');

COMMENT ON TABLE tools IS '잡동사니 도구 목록 및 사용 통계';


-- ============================================================
-- 7. 방문자 통계
-- ============================================================
CREATE TABLE visitors (
    id         SERIAL PRIMARY KEY,
    visit_date DATE        NOT NULL DEFAULT CURRENT_DATE, -- 방문 날짜
    count      INT         NOT NULL DEFAULT 0,            -- 해당일 방문자 수
    UNIQUE (visit_date)
);

COMMENT ON TABLE visitors IS '일별 방문자 수 집계';


-- ============================================================
-- 8. 배치 작업 이력
-- ============================================================
CREATE TABLE batch_jobs (
    id              SERIAL PRIMARY KEY,
    job_id          VARCHAR(50)  NOT NULL UNIQUE,     -- 배치 식별자: batch_20260220_0700
    status          VARCHAR(20)  NOT NULL DEFAULT 'running', -- running, completed, failed
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    items_collected INT          NOT NULL DEFAULT 0,  -- 수집된 항목 수
    errors          INT          NOT NULL DEFAULT 0,  -- 에러 수
    error_log       TEXT                              -- 에러 상세 로그
);

CREATE INDEX idx_batch_jobs_started ON batch_jobs (started_at DESC);

COMMENT ON TABLE batch_jobs IS '크롤링 배치 작업 실행 이력';



-- ============================================================
-- 9. 업로드 파일 관리
-- ============================================================
CREATE TABLE uploads (
    id            SERIAL PRIMARY KEY,
    filename      VARCHAR(255) NOT NULL,             -- UPLOAD_DIR 기준 상대 경로: blog/YYYY/MM/uuid.ext
    original_name VARCHAR(255),                      -- 원본 파일명
    mime_type     VARCHAR(50)  NOT NULL,             -- MIME 타입 (image/jpeg 등)
    size_bytes    INT          NOT NULL,             -- 파일 크기 (bytes)
    url           TEXT         NOT NULL,             -- 공개 접근 URL
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 글 삭제 시 filename 기준으로 파일 조회 → 빠른 매칭
CREATE INDEX idx_uploads_filename ON uploads (filename);

COMMENT ON TABLE uploads IS '블로그 이미지 업로드 파일 관리 (VM 로컬 저장)';
