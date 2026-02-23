import * as cheerio from "cheerio";

/**
 * URL에서 og:image 메타 태그를 추출한다. 3초 timeout.
 */
export const fetchThumbnail = async (url: string): Promise<string | null> => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; JabdonSaniBot/1.0)",
            },
        });
        clearTimeout(timeout);

        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);
        const ogImage =
            $('meta[property="og:image"]').attr("content") ||
            $('meta[name="og:image"]').attr("content") ||
            null;

        return ogImage || null;
    } catch {
        return null;
    }
};
