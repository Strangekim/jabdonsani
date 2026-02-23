import { RawComment } from "../crawlers/types";

const formatComments = (comments: RawComment[]): string => {
    if (comments.length === 0) return "(댓글 없음)";
    return comments
        .map((c, i) => `[${i + 1}] ${c.author} (votes: ${c.votes}): ${c.text}`)
        .join("\n");
};

/**
 * HN용 프롬프트: 번역 + field 분류 (ai/dev)
 */
export const buildHNPrompt = (
    title: string,
    content: string,
    comments: RawComment[]
): string => {
    return `You are a tech article translator. Translate the following Hacker News post from English to Korean and classify its field.

TITLE: ${title}

CONTENT: ${content || "(no content body)"}

TOP COMMENTS:
${formatComments(comments)}

Respond ONLY with valid JSON (no markdown fences, no extra text):
{
  "translatedTitle": "한국어 제목",
  "translatedContent": "한국어 본문 요약 (2-3문장). 원문이 비어있으면 제목 기반으로 간단히 설명.",
  "field": "ai 또는 dev (AI/ML/LLM 관련이면 ai, 일반 개발/프로그래밍이면 dev)",
  "commentSummary": "댓글 핵심 논의 한국어 요약 (1-2문장)",
  "translatedComments": [
    { "original": "원문 댓글", "translated": "번역된 댓글", "votes": 0 }
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
    return `You are a tech article translator. Translate the following Reddit post from English to Korean.

TITLE: ${title}

CONTENT: ${content || "(no content body)"}

TOP COMMENTS:
${formatComments(comments)}

Respond ONLY with valid JSON (no markdown fences, no extra text):
{
  "translatedTitle": "한국어 제목",
  "translatedContent": "한국어 본문 요약 (2-3문장). 원문이 비어있으면 제목 기반으로 간단히 설명.",
  "commentSummary": "댓글 핵심 논의 한국어 요약 (1-2문장)",
  "translatedComments": [
    { "original": "원문 댓글", "translated": "번역된 댓글", "votes": 0 }
  ]
}`;
};
