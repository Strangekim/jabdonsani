# API 명세서

## 공통 사항

### Base URL
```
/api
```

### 공통 응답 형식

**성공**
```json
{
  "success": true,
  "data": { ... }
}
```

**에러**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 메시지"
  }
}
```

### 페이지네이션 (공통)

커서 기반 무한 스크롤 방식 사용. `page` 대신 `cursor`로 다음 데이터 조회.

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| cursor | string | 마지막 아이템의 createdAt (ISO 8601). 첫 요청 시 생략 |
| limit | number | 한 번에 가져올 개수 (기본 20) |

**응답에 포함되는 페이지네이션 필드**
```json
{
  "nextCursor": "2026-02-19T19:00:00Z",
  "hasMore": true,
  "totalCount": 53
}
```

- `nextCursor` — 다음 요청에 넘길 커서. `null`이면 끝
- `hasMore` — `false`면 무한 스크롤 중지
- `totalCount` — 현재 필터 기준 전체 결과 수

---

### 공통 에러

| 상태코드 | 코드 | 설명 |
|---------|------|------|
| 400 | `BAD_REQUEST` | 요청 파라미터 누락 또는 형식 오류 |
| 401 | `UNAUTHORIZED` | 인증 필요 (세션 없음 또는 만료) |
| 403 | `FORBIDDEN` | 권한 없음 (관리자만 접근 가능) |
| 404 | `NOT_FOUND` | 요청한 리소스가 존재하지 않음 |
| 413 | `PAYLOAD_TOO_LARGE` | 업로드 파일 크기 초과 |
| 429 | `TOO_MANY_REQUESTS` | 요청 횟수 제한 초과 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

---

## 인증

### `POST /api/auth/login`
관리자 로그인

**요청**
```json
{ "id": "admin", "password": "****" }
```

**성공 `200`**
```json
{ "success": true, "data": { "message": "로그인 성공" } }
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 401 | `INVALID_CREDENTIALS` | ID 또는 비밀번호 불일치 |

---

### `POST /api/auth/logout`
로그아웃

**성공 `200`**
```json
{ "success": true, "data": { "message": "로그아웃 완료" } }
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 401 | `UNAUTHORIZED` | 로그인 상태가 아님 |

---

### `GET /api/auth/me`
현재 로그인 상태 확인

**성공 `200`**
```json
{ "success": true, "data": { "authenticated": true, "id": "admin" } }
```

**에러**: 공통 에러만 해당

---

## 동향

### `GET /api/trends`
동향 카드 목록 조회 (커서 기반 무한 스크롤)

**쿼리 파라미터**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| field | string | X | 분야 필터 (`ai`, `dev`, `robotics`) |
| source | string | X | 소스 필터 (`hn`, `localllama`, `ml`, `programming`, `robotics`) |
| cursor | string | X | 마지막 아이템의 createdAt. 첫 요청 시 생략 |
| limit | number | X | 페이지당 개수 (기본 20) |

**성공 `200`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "source": "hn",
        "fieldTag": "ai",
        "sourceTags": ["#HackerNews"],
        "fieldTags": ["#AI"],
        "title": "GPT-5 벤치마크 결과 공개",
        "content": "번역된 본문...",
        "thumbnails": ["https://..."],
        "commentSummary": "댓글 반응 요약...",
        "topComments": [
          { "text": "댓글 내용...", "votes": 142 }
        ],
        "upvotes": 342,
        "views": 1200,
        "originalUrl": "https://...",
        "createdAt": "2026-02-20T07:00:00Z"
      }
    ],
    "nextCursor": "2026-02-20T06:55:00Z",
    "hasMore": true,
    "totalCount": 53
  }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 400 | `INVALID_FILTER` | 존재하지 않는 분야/소스 필터값 |
| 400 | `INVALID_CURSOR` | 잘못된 커서 형식 |

---

### `GET /api/trends/search`
동향 검색 (커서 기반 무한 스크롤)

> 추후 RAG 도입 시 벡터 유사도 검색으로 확장 가능하도록 설계.
> 현재는 제목 + 본문 텍스트 검색 (PostgreSQL Full-Text Search).

**쿼리 파라미터**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| q | string | O | 검색 키워드 |
| field | string | X | 분야 필터 (검색과 필터 조합 가능) |
| source | string | X | 소스 필터 |
| cursor | string | X | 커서 |
| limit | number | X | 개수 (기본 20) |

**성공 `200`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "source": "hn",
        "title": "GPT-5 벤치마크 결과 공개",
        "content": "번역된 본문...",
        "relevance": 0.95,
        "upvotes": 342,
        "views": 1200,
        "originalUrl": "https://...",
        "createdAt": "2026-02-20T07:00:00Z"
      }
    ],
    "nextCursor": "2026-02-20T06:55:00Z",
    "hasMore": true,
    "totalCount": 12
  }
}
```

> `relevance` 필드는 RAG 도입 시 유사도 점수로 활용. 현재는 텍스트 매칭 기반 정렬.

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 400 | `QUERY_REQUIRED` | 검색어 누락 |
| 400 | `QUERY_TOO_SHORT` | 검색어 2자 미만 |

---

### `GET /api/trends/popular`
오늘의 인기글 TOP 5 (업보트 기준)

**성공 `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "GPT-5 벤치마크 결과 공개",
      "source": "hn",
      "upvotes": 342,
      "createdAt": "2026-02-20T07:00:00Z"
    }
  ]
}
```

**에러**: 공통 에러만 해당

---

## 블로그

### `GET /api/posts`
글 목록 조회 (커서 기반 무한 스크롤)

**쿼리 파라미터**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| tag | string | X | 태그 필터 |
| cursor | string | X | 마지막 아이템의 createdAt. 첫 요청 시 생략 |
| limit | number | X | 한 번에 가져올 개수 (기본 10) |

**성공 `200`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Ollama + Open WebUI 로컬 AI 챗봇 구축기",
        "description": "RTX 4060 Ti 환경에서...",
        "tags": ["AI", "로컬LLM", "Ollama"],
        "views": 1842,
        "createdAt": "2026-02-18T09:00:00Z"
      }
    ],
    "nextCursor": "2026-02-15T09:00:00Z",
    "hasMore": true,
    "totalCount": 12
  }
}
```

**에러**: 공통 에러만 해당

---

### `GET /api/posts/:id`
글 상세 조회

**성공 `200`**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Ollama + Open WebUI 로컬 AI 챗봇 구축기",
    "content": "## 왜 로컬 LLM인가?\n\nChatGPT...",
    "tags": ["AI", "로컬LLM", "Ollama"],
    "views": 1842,
    "createdAt": "2026-02-18T09:00:00Z",
    "updatedAt": "2026-02-18T09:00:00Z",
    "prevPost": { "id": 2, "title": "Docker Compose로..." },
    "nextPost": { "id": 3, "title": "Vite 6.0 마이그레이션..." }
  }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 404 | `POST_NOT_FOUND` | 해당 ID의 글이 없음 |

---

### `POST /api/posts`
글 작성 (인증 필요)

**요청**
```json
{
  "title": "새 글 제목",
  "content": "## Markdown 본문...",
  "tags": ["태그1", "태그2"]
}
```

**성공 `201`**
```json
{
  "success": true,
  "data": { "id": 5, "message": "글이 작성되었습니다" }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 400 | `TITLE_REQUIRED` | 제목 누락 |
| 400 | `CONTENT_REQUIRED` | 본문 누락 |
| 401 | `UNAUTHORIZED` | 미인증 |

---

### `PUT /api/posts/:id`
글 수정 (인증 필요)

**요청**
```json
{
  "title": "수정된 제목",
  "content": "## 수정된 본문...",
  "tags": ["태그1", "태그3"]
}
```

**성공 `200`**
```json
{
  "success": true,
  "data": { "id": 5, "message": "글이 수정되었습니다" }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 400 | `TITLE_REQUIRED` | 제목 누락 |
| 400 | `CONTENT_REQUIRED` | 본문 누락 |
| 401 | `UNAUTHORIZED` | 미인증 |
| 404 | `POST_NOT_FOUND` | 해당 ID의 글이 없음 |

---

### `DELETE /api/posts/:id`
글 삭제 (인증 필요)

**성공 `200`**
```json
{
  "success": true,
  "data": { "message": "글이 삭제되었습니다" }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 401 | `UNAUTHORIZED` | 미인증 |
| 404 | `POST_NOT_FOUND` | 해당 ID의 글이 없음 |

---

### `GET /api/posts/popular`
인기 글 TOP 5 (조회수 기준)

**성공 `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "title": "GPT-4o에게 코드 리뷰를 맡겨본 3개월간의 기록",
      "views": 3412,
      "createdAt": "2026-01-28T09:00:00Z"
    }
  ]
}
```

**에러**: 공통 에러만 해당

---

### `POST /api/posts/upload`
이미지 업로드 (Markdown 에디터용, 인증 필요)

**요청**: `multipart/form-data`
| 필드 | 타입 | 설명 |
|------|------|------|
| image | file | 업로드할 이미지 (jpg, png, gif, webp) |

**성공 `200`**
```json
{
  "success": true,
  "data": { "url": "/uploads/2026/02/abc123.webp" }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 400 | `INVALID_FILE_TYPE` | 허용되지 않는 파일 형식 |
| 401 | `UNAUTHORIZED` | 미인증 |
| 413 | `PAYLOAD_TOO_LARGE` | 파일 크기 초과 (최대 5MB) |

---

## 태그

### `GET /api/tags`
태그 목록 + 글 수 (태그 클라우드용)

**성공 `200`**
```json
{
  "success": true,
  "data": [
    { "name": "AI", "count": 5 },
    { "name": "TypeScript", "count": 3 },
    { "name": "Docker", "count": 2 }
  ]
}
```

**에러**: 공통 에러만 해당

---

## Tools

### `GET /api/tools/usage`
도구별 누적 사용 횟수 조회

**성공 `200`**
```json
{
  "success": true,
  "data": [
    { "id": "pdf-merge", "name": "PDF 병합", "count": 1247 },
    { "id": "image-compress", "name": "이미지 압축", "count": 1053 },
    { "id": "web-game", "name": "웹게임", "count": 879 }
  ]
}
```

**에러**: 공통 에러만 해당

---

### `POST /api/tools/:id/use`
도구 사용 기록 (카운트 +1)

**성공 `200`**
```json
{
  "success": true,
  "data": { "id": "pdf-merge", "count": 1248 }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 404 | `TOOL_NOT_FOUND` | 존재하지 않는 도구 ID |

---

## 방문자 통계

### `GET /api/visitors`
Today / Total 방문자 수 조회

**성공 `200`**
```json
{
  "success": true,
  "data": { "today": 1247, "total": 38920 }
}
```

**에러**: 공통 에러만 해당

---

### `POST /api/visitors/track`
방문 기록 (페이지 접속 시 호출)

**성공 `200`**
```json
{
  "success": true,
  "data": { "tracked": true }
}
```

**에러**: 공통 에러만 해당

---

## 배치 (내부용)

### `POST /api/batch/crawl`
수집 배치 수동 실행 (인증 필요)

**성공 `200`**
```json
{
  "success": true,
  "data": { "message": "배치 실행이 시작되었습니다", "jobId": "batch_20260220_0700" }
}
```

**에러**
| 상태코드 | 코드 | 상황 |
|---------|------|------|
| 401 | `UNAUTHORIZED` | 미인증 |
| 409 | `BATCH_ALREADY_RUNNING` | 이미 배치가 실행 중 |

---

### `GET /api/batch/status`
마지막 배치 실행 상태 조회

**성공 `200`**
```json
{
  "success": true,
  "data": {
    "jobId": "batch_20260220_0700",
    "status": "completed",
    "startedAt": "2026-02-20T07:00:00Z",
    "completedAt": "2026-02-20T07:03:42Z",
    "itemsCollected": 53,
    "errors": 0
  }
}
```

**에러**: 공통 에러만 해당
