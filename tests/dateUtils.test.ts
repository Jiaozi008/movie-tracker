import { describe, it, expect } from 'vitest';
import {
    formatLocalDateKey,
    formatLocalMonthKey,
    formatLocalYearKey,
    getTodayLocalDateString,
    getOffsetLocalDateString,
    parseLocalDate,
    safeFormatDate,
    safeFormatDateTime,
    formatRelativeWatchDate
} from '../utils/dateUtils';

describe('Local Time & Timezone Date Utils Tests', () => {
    it('formatLocalDateKey 应该正确格式化为本地 YYYY-MM-DD', () => {
        const d = new Date(2026, 7, 28, 14, 30); // 2026-08-28 14:30 local
        expect(formatLocalDateKey(d)).toBe('2026-08-28');
        expect(formatLocalDateKey(d.getTime())).toBe('2026-08-28');
        expect(formatLocalDateKey(null)).toBe('');
    });

    it('formatLocalMonthKey 与 formatLocalYearKey 应该正确提取本地年月', () => {
        const d = new Date(2026, 7, 28);
        expect(formatLocalMonthKey(d)).toBe('2026-08');
        expect(formatLocalYearKey(d)).toBe('2026');
    });

    it('getTodayLocalDateString 应该返回今天的本地 YYYY-MM-DD', () => {
        const todayStr = getTodayLocalDateString();
        expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const now = new Date();
        const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        expect(todayStr).toBe(expected);
    });

    it('getOffsetLocalDateString 应该返回正确偏移的本地日期', () => {
        const yesterdayStr = getOffsetLocalDateString(-1);
        expect(yesterdayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('parseLocalDate 能够正确将 YYYY-MM-DD 解析为本地日期而不会发生时区跨日漂移', () => {
        const ts = parseLocalDate('2026-05-15');
        const parsedDate = new Date(ts);
        expect(parsedDate.getFullYear()).toBe(2026);
        expect(parsedDate.getMonth()).toBe(4); // 5月 (0-indexed 4)
        expect(parsedDate.getDate()).toBe(15);
    });

    it('parseLocalDate 能够解析带有时间部分的日期字符串', () => {
        const ts = parseLocalDate('2026-08-28 21:48:00');
        const parsedDate = new Date(ts);
        expect(parsedDate.getFullYear()).toBe(2026);
        expect(parsedDate.getMonth()).toBe(7); // 8月
        expect(parsedDate.getDate()).toBe(28);
        expect(parsedDate.getHours()).toBe(21);
        expect(parsedDate.getMinutes()).toBe(48);
    });

    it('safeFormatDate 与 safeFormatDateTime 能够安全输出且容错未知时间', () => {
        expect(safeFormatDate(null)).toBe('未知时间');
        expect(safeFormatDate('invalid-date')).toBe('未知时间');
        
        const ts = new Date(2026, 7, 28, 21, 48, 0).getTime();
        expect(safeFormatDate(ts)).toContain('2026');
        expect(safeFormatDateTime(ts)).toContain('2026');
    });

    it('formatRelativeWatchDate 能够友好显示相对时间', () => {
        const now = Date.now();
        expect(formatRelativeWatchDate(now)).toBe('刚刚');
        expect(formatRelativeWatchDate(now - 5 * 60 * 1000)).toBe('5 分钟前');

        const earlierToday = new Date();
        earlierToday.setHours(earlierToday.getHours() - 3);
        if (earlierToday.getDate() === new Date().getDate()) {
            expect(formatRelativeWatchDate(earlierToday.getTime())).toContain('今天');
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(12, 0, 0, 0);
        expect(formatRelativeWatchDate(yesterday.getTime())).toContain('昨天');
    });
});
