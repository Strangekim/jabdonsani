import anthropic from "../../config/anthropic";

/**
 * JSON 응답에서 markdown fence를 제거하고 파싱한다.
 * Claude가 생성하는 흔한 JSON 오류(trailing comma, 잘못된 따옴표)를 보정한다.
 */
export const extractJson = <T>(text: string): T => {
    // 1. markdown fence 제거
    let cleaned = text
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*```\s*$/i, "")
        .trim();

    // 2. 첫 { 부터 마지막 } 까지만 추출 (앞뒤 불필요한 텍스트 제거)
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
        cleaned = cleaned.slice(start, end + 1);
    }

    // 3. trailing comma 제거 (}, 또는 ],  앞의 쉼표)
    cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

    return JSON.parse(cleaned);
};

/**
 * Claude Haiku를 호출하여 텍스트를 처리한다.
 */
export const callClaude = async (prompt: string): Promise<string> => {
    const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [
            { role: "user", content: prompt },
        ],
    });

    const block = response.content[0];
    if (block.type !== "text") {
        throw new Error("Unexpected Claude response type: " + block.type);
    }
    return block.text;
};
