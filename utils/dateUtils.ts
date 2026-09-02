/**
 * 本地时间与时区安全格式化与解析工具库
 * 解决 UTC 时区偏移导致的日期显示前移/后移、ISO 跨日截断问题
 */

/**
 * 格式化为本地 YYYY-MM-DD 字符串（用于 input[type="date"]、热力图 key、按天聚合）
 */
export function formatLocalDateKey(input?: number | string | Date | null): string {
    if (!input && input !== 0) return '';
    const d = typeof input === 'number' || typeof input === 'string' ? new Date(input) : input;
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 格式化为本地 YYYY-MM 字符串（用于月份筛选、月度统计）
 */
export function formatLocalMonthKey(input?: number | string | Date | null): string {
    if (!input && input !== 0) return '';
    const d = typeof input === 'number' || typeof input === 'string' ? new Date(input) : input;
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * 格式化为本地年份字符串
 */
export function formatLocalYearKey(input?: number | string | Date | null): string {
    if (!input && input !== 0) return '';
    const d = typeof input === 'number' || typeof input === 'string' ? new Date(input) : input;
    if (!d || isNaN(d.getTime())) return '';
    return d.getFullYear().toString();
}

/**
 * 获取今日本地 YYYY-MM-DD
 */
export function getTodayLocalDateString(): string {
    return formatLocalDateKey(new Date());
}

/**
 * 获取偏移天数的本地 YYYY-MM-DD
 */
export function getOffsetLocalDateString(daysOffset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return formatLocalDateKey(d);
}

/**
 * 安全解析日期字符串为本地时间戳
 * 解决浏览器将 'YYYY-MM-DD' 默认按 UTC 零点解析导致 UTC-X 地区前一天或丢失本地时区问题
 */
export function parseLocalDate(input: string | number | Date | null | undefined): number {
    if (!input && input !== 0) return Date.now();
    if (typeof input === 'number') {
        return isNaN(input) ? Date.now() : input;
    }
    if (input instanceof Date) {
        return isNaN(input.getTime()) ? Date.now() : input.getTime();
    }

    const str = String(input).trim();
    if (!str) return Date.now();

    // 匹配纯日期格式: YYYY-MM-DD 或 YYYY/M/D 或 YYYY.M.D
    const dateOnlyMatch = str.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
    if (dateOnlyMatch) {
        const year = parseInt(dateOnlyMatch[1], 10);
        const month = parseInt(dateOnlyMatch[2], 10) - 1;
        const day = parseInt(dateOnlyMatch[3], 10);
        
        // 如果是今天，继承当前时间的时分秒毫秒；否则设为本地正午或0点
        const now = new Date();
        if (
            year === now.getFullYear() &&
            month === now.getMonth() &&
            day === now.getDate()
        ) {
            return now.getTime();
        }
        return new Date(year, month, day, 12, 0, 0, 0).getTime();
    }

    // 匹配包含时间的格式: YYYY-MM-DD HH:mm(:ss) 或 YYYY/M/D HH:mm(:ss)
    const dateTimeMatch = str.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})[日\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (dateTimeMatch) {
        const year = parseInt(dateTimeMatch[1], 10);
        const month = parseInt(dateTimeMatch[2], 10) - 1;
        const day = parseInt(dateTimeMatch[3], 10);
        const hour = parseInt(dateTimeMatch[4], 10);
        const minute = parseInt(dateTimeMatch[5], 10);
        const second = dateTimeMatch[6] ? parseInt(dateTimeMatch[6], 10) : 0;
        return new Date(year, month, day, hour, minute, second, 0).getTime();
    }

    // 标准 Date.parse 回退
    const parsed = Date.parse(str);
    return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * 安全显示本地日期 (例如: 2026/8/28 或 2026-08-28)
 */
export function safeFormatDate(timestamp: any): string {
    if (!timestamp && timestamp !== 0) return '未知时间';
    const date = typeof timestamp === 'number' || typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (!(date instanceof Date) || isNaN(date.getTime())) return '未知时间';
    try {
        return date.toLocaleDateString('zh-CN');
    } catch {
        return '未知时间';
    }
}

/**
 * 安全显示本地完整日期时间 (例如: 2026/8/28 21:48:00)
 */
export function safeFormatDateTime(timestamp: any): string {
    if (!timestamp && timestamp !== 0) return '未知时间';
    const date = typeof timestamp === 'number' || typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (!(date instanceof Date) || isNaN(date.getTime())) return '未知时间';
    try {
        return date.toLocaleString('zh-CN');
    } catch {
        return '未知时间';
    }
}

/**
 * 格式化最近打卡友好时间（刚刚、X分钟前、今天 12:30、昨天 18:20、8月26日）
 * 严格依据本地系统时区
 */
export function formatRelativeWatchDate(timestamp?: number | string | Date | null): string {
    if (!timestamp && timestamp !== 0) return '';
    const now = new Date();
    const date = typeof timestamp === 'number' || typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    if (!date || isNaN(date.getTime())) return '';

    const diffMs = now.getTime() - date.getTime();
    // 如果未来时间（如微小时钟不同步），显示刚刚
    if (diffMs < 0 && diffMs > -60000) return '刚刚';
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

    const isToday = date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate();

    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (isToday) return `今天 ${timeStr}`;
    if (isYesterday) return `昨天 ${timeStr}`;

    return `${date.getMonth() + 1}月${date.getDate()}日`;
}
