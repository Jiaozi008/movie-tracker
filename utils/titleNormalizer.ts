/**
 * Title normalization utility
 * Ensures consistent title matching for TV series deduplication
 */

/**
 * Normalize a media title for stable comparison/grouping.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes common suffixes like (电视剧), 第X季, Season X
 * - Collapses multiple spaces
 */
export function normalizeTitle(title: string | undefined | null): string {
    if (!title) return '';
    return title
        .trim()
        .toLowerCase()
        // Remove bracketed suffixes: (电视剧), [TV], 【第二季】 etc.
        .replace(/[\[【（(].*?[\]】）)]/g, '')
        // Remove season indicators: 第一季, 第2季, Season 1, S01
        .replace(/第[一二三四五六七八九十\d]+季/g, '')
        .replace(/season\s*\d+/gi, '')
        .replace(/\bs\d{1,2}\b/gi, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();
}
