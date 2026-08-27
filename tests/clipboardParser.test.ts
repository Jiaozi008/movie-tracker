import { describe, it, expect } from 'vitest';
import { parseClipboardMediaText } from '../utils/clipboardParser';

describe('parseClipboardMediaText', () => {
  it('should parse book bracket title and year', () => {
    const res = parseClipboardMediaText('《奥本海默》 (2023) 诺兰 8.8分');
    expect(res).not.toBeNull();
    expect(res?.title).toBe('奥本海默');
    expect(res?.year).toBe('2023');
  });

  it('should parse season from English format S02', () => {
    const res = parseClipboardMediaText('Slow Horses S04 (2024)');
    expect(res).not.toBeNull();
    expect(res?.title).toBe('Slow Horses');
    expect(res?.season).toBe(4);
    expect(res?.mediaType).toBe('tv');
    expect(res?.year).toBe('2024');
  });

  it('should parse season from Chinese format 第二季', () => {
    const res = parseClipboardMediaText('三体 第二季 (2025) 电视剧');
    expect(res).not.toBeNull();
    expect(res?.title).toBe('三体');
    expect(res?.season).toBe(2);
    expect(res?.mediaType).toBe('tv');
  });

  it('should parse douban link with title', () => {
    const res = parseClipboardMediaText('推荐看《繁花》 https://movie.douban.com/subject/35372412/ 2023 王家卫');
    expect(res).not.toBeNull();
    expect(res?.title).toBe('繁花');
    expect(res?.year).toBe('2023');
  });

  it('should handle clean text without metadata', () => {
    const res = parseClipboardMediaText('盗梦空间');
    expect(res).not.toBeNull();
    expect(res?.title).toBe('盗梦空间');
  });
});
