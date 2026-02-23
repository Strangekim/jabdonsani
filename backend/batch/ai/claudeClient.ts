import anthropic from "../../config/anthropic";

/**
 * JSON 응답에서 markdown fence를 제거하고 파싱한다.
 */
export const extractJson = <T>(text: string): T => {
    // Claude가 ```json ... ``` 으로 감쌀 수 있으므로 제거
    const cleaned = text
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*```\s*$/i, "")
        .trim();
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
