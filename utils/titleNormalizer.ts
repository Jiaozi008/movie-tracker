/**
 * Title normalization utility
 * Ensures consistent title matching for TV series deduplication while preserving distinct seasons
 */

/**
 * Normalize a media title for stable comparison/grouping.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes generic platform/type bracketed suffixes: (电视剧), [TV], (网剧), (动画)
 * - Collapses multiple spaces
 */
export function normalizeTitle(title: string | undefined | null): string {
    if (!title) return '';
    return title
        .trim()
        .toLowerCase()
        // Remove generic bracketed media markers but KEEP season indicators
        .replace(/[\[【（(]\s*(?:电视剧|网剧|美剧|日剧|韩剧|国剧|英剧|港剧|台剧|动画|动漫|纪录片|电影|tv|movie)\s*[\]】）)]/gi, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

