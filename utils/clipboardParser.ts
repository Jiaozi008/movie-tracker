import { MediaType } from '../types';

export interface ParsedMediaInfo {
  title: string;
  year?: string;
  mediaType?: MediaType;
  season?: number;
  extractedKeywords: string;
}

/**
 * 智能解析剪贴板文本或链接，提取片名、年份、季数及影视类型
 */
export function parseClipboardMediaText(raw: string): ParsedMediaInfo | null {
  if (!raw || typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;

  let title = text;
  let year: string | undefined = undefined;
  let mediaType: MediaType | undefined = undefined;
  let season: number | undefined = undefined;

  // 1. 如果是豆瓣链接或包含豆瓣链接
  const doubanMatch = text.match(/movie\.douban\.com\/subject\/(\d+)/i);
  if (doubanMatch) {
    // 提取书名号中的文字或去掉链接后的标题文本
    const bracketMatch = text.match(/《([^》]+)》/);
    if (bracketMatch) {
      title = bracketMatch[1].trim();
    } else {
      // 去除 URL 本身，剩余如果还有文本就作为标题
      const cleanWithoutUrl = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      if (cleanWithoutUrl) {
        title = cleanWithoutUrl;
      }
    }
  }

  // 2. 检查是否有《...》书名号
  const bookBracket = title.match(/《([^》]+)》/);
  if (bookBracket) {
    title = bookBracket[1].trim();
  }

  // 3. 提取年份 (1900-2099)
  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // 4. 提取季数 (S01, S1, Season 1, 第x季, 第一季, 第二季...)
  const seasonEnMatch = text.match(/\bS(?:eason)?\s*0*(\d{1,2})\b/i);
  if (seasonEnMatch) {
    season = parseInt(seasonEnMatch[1], 10);
    mediaType = 'tv';
  } else {
    const seasonCnMatch = text.match(/第\s*([一二三四五六七八九十0-9]+)\s*季/);
    if (seasonCnMatch) {
      const cnMap: Record<string, number> = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
      };
      const val = seasonCnMatch[1];
      season = cnMap[val] || parseInt(val, 10) || undefined;
      mediaType = 'tv';
    }
  }

  // 5. 判断是否明确为电视剧
  if (!mediaType) {
    if (/电视剧|剧集|美剧|韩剧|日剧|国产剧|TV|Series|追剧/i.test(text)) {
      mediaType = 'tv';
    } else if (/电影|Movie|院线/i.test(text)) {
      mediaType = 'movie';
    }
  }

  // 6. 清理标题中的多余后缀（年份、豆瓣评语、评分等）
  let cleanTitle = title
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\b(19\d\d|20\d\d)\b/g, '')
    .replace(/\bS(?:eason)?\s*0*\d{1,2}\b/gi, '')
    .replace(/第\s*[一二三四五六七八九十0-9]+\s*季/g, '')
    .replace(/电视剧|电影|剧集|美剧|韩剧|日剧|国产剧|动画片|纪录片/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[【\[][^】\]]*[】\]]/g, '')
    .replace(/\d+(\.\d+)?\s*分/g, '')
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 如果清理后太短，回退到原 title 的书名号或前 20 字符
  if (cleanTitle.length === 0) {
    cleanTitle = bookBracket ? bookBracket[1].trim() : text.slice(0, 30).trim();
  }

  return {
    title: cleanTitle,
    year,
    mediaType,
    season,
    extractedKeywords: cleanTitle,
  };
}
