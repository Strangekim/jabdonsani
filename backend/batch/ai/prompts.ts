import { RawComment } from "../crawlers/types";

const formatComments = (comments: RawComment[]): string => {
    if (comments.length === 0) return "(댓글 없음)";
    return comments
        .map((c, i) => `[${i + 1}] ${c.author} (votes: ${c.votes}): ${c.text}`)
        .join("\n");
};

const TRANSLATION_RULES = `
번역 규칙:
- 전체적으로 반말체로 작성 (예: "~이다", "~했다", "~임", "~함")
- 밈, 유머, 풍자, 비꼬는 뉘앙스는 한국 인터넷 감성에 맞게 살려서 번역 (직역 금지)
- 기술 용어(LLM, API, PR, CI/CD 등)는 영어 그대로 유지
- 원문의 톤(진지함/가벼움/분노/감탄)을 그대로 유지
- 영어권 밈이나 관용구는 의미가 통하는 한국어 표현으로 의역`;

/**
 * HN용 프롬프트: 번역 + field 분류 (ai/dev)
 */
export const buildHNPrompt = (
    title: string,
    content: string,
    comments: RawComment[]
): string => {
    return `You are a Korean tech translator who deeply understands internet culture, memes, and developer humor. Translate the following Hacker News post into Korean and classify its field.
${TRANSLATION_RULES}

TITLE: ${title}

CONTENT: ${content || "(no content body)"}

TOP COMMENTS:
${formatComments(comments)}

Respond ONLY with valid JSON (no markdown fences, no extra text):
{
  "translatedTitle": "한국어 제목 (반말체)",
  "translatedContent": "본문이 있으면 한국어로 요약 (2-3문장, 반말체). 본문이 없으면 반드시 빈 문자열(\"\")로 반환. 절대 추측하거나 제목에서 내용을 만들어내지 말 것.",
  "field": "ai 또는 dev (AI/ML/LLM 관련이면 ai, 일반 개발/프로그래밍이면 dev)",
  "commentSummary": "댓글 핵심 논의 한국어 요약 (1-2문장, 반말체)",
  "translatedComments": [
    { "original": "원문 댓글", "translated": "번역된 댓글 (반말체, 밈/유머 살림)", "votes": 0 }
  ]
}`;
};

/**
 * Reddit용 프롬프트: 번역만 (field는 subreddit으로 결정)
 */
export const buildRedditPrompt = (
    title: string,
    content: string,
    comments: RawComment[]
): string => {
    return `You are a Korean tech translator who deeply understands internet culture, memes, and developer humor. Translate the following Reddit post into Korean.
${TRANSLATION_RULES}

TITLE: ${title}

CONTENT: ${content || "(no content body)"}

TOP COMMENTS:
${formatComments(comments)}

Respond ONLY with valid JSON (no markdown fences, no extra text):
{
  "translatedTitle": "한국어 제목 (반말체)",
  "translatedContent": "본문이 있으면 한국어로 요약 (2-3문장, 반말체). 본문이 없으면 반드시 빈 문자열(\"\")로 반환. 절대 추측하거나 제목에서 내용을 만들어내지 말 것.",
  "commentSummary": "댓글 핵심 논의 한국어 요약 (1-2문장, 반말체)",
  "translatedComments": [
    { "original": "원문 댓글", "translated": "번역된 댓글 (반말체, 밈/유머 살림)", "votes": 0 }
  ]
}`;
};
