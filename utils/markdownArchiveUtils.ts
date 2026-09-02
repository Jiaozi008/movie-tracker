import { Movie, MovieStatus, MediaType } from '../types';
import { generateUUID } from './uuidUtils';
import { safeFormatDateTime, getTodayLocalDateString } from './dateUtils';
import JSZip from 'jszip';

/**
 * 将单部影视记录序列化为 Obsidian / Notion 兼容的带有 YAML Frontmatter 的 Markdown 纯文本
 */
export function exportMovieToMarkdown(m: Movie): string {
    const stars = '⭐'.repeat(Math.min(5, Math.max(0, m.rating || 0)));
    const dateStr = safeFormatDateTime(m.addedAt);
    const updatedStr = safeFormatDateTime(m.lastUpdated);

    const tagsYaml = (m.tags || []).length > 0
        ? `\ntags:\n${m.tags!.map(t => `  - "${t.replace(/"/g, '\\"')}"`).join('\n')}`
        : '';

    const tagsHash = (m.tags || []).map(t => `#${t.trim()}`).join(' ');
    const genresHash = (m.genre || '').split(/[,，/、\s]+/).filter(Boolean).map(g => `#${g.trim()}`).join(' ');

    const directorLinks = (m.director || '')
        .split(/[,，/、|]+/)
        .map(d => d.trim())
        .filter(Boolean)
        .map(d => `[[${d}]]`)
        .join('、');

    const castLinks = (m.cast || '')
        .split(/[,，/、|]+/)
        .map(c => c.trim())
        .filter(Boolean)
        .map(c => `[[${c}]]`)
        .join('、');

    const statusText = m.status === MovieStatus.WATCHED ? '已看' : (m.status === MovieStatus.WATCHING ? '在看' : '想看');
    const mediaTypeText = m.mediaType === 'tv' ? '电视剧' : '电影';

    let md = `---
id: "${m.id}"
title: "${(m.title || '').replace(/"/g, '\\"')}"
original_title: "${(m.originalTitle || '').replace(/"/g, '\\"')}"
year: "${m.year || ''}"
media_type: "${m.mediaType || 'movie'}"
status: "${m.status}"
rating: ${m.rating || 0}
tmdb_rating: ${m.tmdbRating || 0}
director: "${(m.director || '').replace(/"/g, '\\"')}"
cast: "${(m.cast || '').replace(/"/g, '\\"')}"
country: "${(m.country || '').replace(/"/g, '\\"')}"
genre: "${(m.genre || '').replace(/"/g, '\\"')}"
platform: "${(m.platform || '').replace(/"/g, '\\"')}"
duration: ${m.duration || 0}
current_episode: ${m.currentEpisode || 0}
total_episodes: ${m.totalEpisodes || 0}
watch_iteration: ${m.watchIteration || 1}
playback_speed: ${m.playbackSpeed || 1.0}
added_at: "${dateStr}"
last_updated: "${updatedStr}"${tagsYaml}
---

# ${m.title}${m.year ? ` (${m.year})` : ''}

${m.quote ? `> **经典台词**：${m.quote}\n` : ''}
${m.posterImage ? `![海报](${m.posterImage})\n` : ''}
### 🎬 档案信息
- **类型**：${genresHash || m.genre || '未分类'}
- **导演**：${directorLinks || m.director || '未知'}
- **主演**：${castLinks || m.cast || '未知'}
- **地区**：${m.country || '未知'}
- **平台**：${m.platform ? `[[${m.platform}]]` : '未知'}
- **体裁**：${mediaTypeText}${m.mediaType === 'tv' && m.totalEpisodes ? ` (全 ${m.totalEpisodes} 集 / 进度: ${m.currentEpisode || 0} 集)` : ''}
- **片长**：${m.duration ? `${m.duration} 分钟` : '未知'}
- **状态**：${statusText}${m.watchIteration && m.watchIteration > 1 ? ` (🔥 第 ${m.watchIteration} 刷)` : ''}
- **个人评分**：${stars ? `${stars} (${m.rating} 分)` : '未评分'}${m.tmdbRating ? ` / TMDB: ${m.tmdbRating} 分` : ''}
${tagsHash ? `- **标签**：${tagsHash}` : ''}
- **标记时间**：${dateStr}

${m.review ? `### 📝 观影评价\n${m.review}\n` : ''}
${m.overview ? `### 📖 剧情简介\n${m.overview}\n` : ''}
`;

    return md;
}

/**
 * 将整座观影资料库导出为单篇聚合 Markdown 总览档案
 */
export function exportLibraryToMarkdownMaster(movies: Movie[]): string {
    const totalCount = movies.length;
    const watchedCount = movies.filter(m => m.status === MovieStatus.WATCHED).length;
    const watchingCount = movies.filter(m => m.status === MovieStatus.WATCHING).length;
    const planningCount = movies.filter(m => m.status === MovieStatus.PLANNING).length;

    let content = `# 🎬 观影记录私人资料库档案 (CineLog Master Archive)

> 导出日期：${getTodayLocalDateString()} | 总收录：${totalCount} 部 (已看: ${watchedCount} / 在看: ${watchingCount} / 想看: ${planningCount})

---

## 📑 目录索引
${movies.map((m, idx) => `${idx + 1}. [${m.title} (${m.year || '未知'})](#${encodeURIComponent(m.title.replace(/\s+/g, '-'))}) - ${'⭐'.repeat(m.rating || 0)} (${m.status === MovieStatus.WATCHED ? '已看' : m.status === MovieStatus.WATCHING ? '在看' : '想看'})`).join('\n')}

---

`;

    movies.forEach((m, idx) => {
        content += `\n## ${idx + 1}. ${m.title} (${m.year || ''})\n\n`;
        content += exportMovieToMarkdown(m);
        content += `\n---\n`;
    });

    return content;
}

/**
 * 将观影资料库打包为适合导入 Obsidian / Logseq 的 ZIP 压缩包（每部独立 .md）
 */
export async function exportLibraryToObsidianZip(movies: Movie[]): Promise<Blob> {
    const zip = new JSZip();

    // 1. 创建分类文件夹
    const movieFolder = zip.folder('电影');
    const tvFolder = zip.folder('电视剧');

    movies.forEach(m => {
        const folder = m.mediaType === 'tv' ? tvFolder : movieFolder;
        // 安全文件名（移除 Windows/Unix 非法字符）
        const safeTitle = (m.title || '无标题').replace(/[\\/:*?"<>|]/g, '_');
        const filename = `${safeTitle}${m.year ? ` (${m.year})` : ''}.md`;
        const mdContent = exportMovieToMarkdown(m);
        folder?.file(filename, mdContent);
    });

    // 2. 添加 Master 索引页
    zip.file('README_观影总览.md', exportLibraryToMarkdownMaster(movies));

    return await zip.generateAsync({ type: 'blob' });
}

/**
 * 解析 Markdown 文本（支持 YAML Frontmatter 或标准 Markdown 标题）为 Movie 数组
 */
export function parseMarkdownToMovies(markdownContent: string): Movie[] {
    if (!markdownContent || !markdownContent.trim()) return [];

    const results: Movie[] = [];

    // 1. 如果包含多条 Frontmatter 记录，通过包含 frontmatter 起始特征进行切分
    if (markdownContent.includes('title:')) {
        const chunks = markdownContent.split(/(?:^|\n)(?=---\r?\n[a-zA-Z0-9_]+:)/g);

        for (const chunk of chunks) {
            if (!chunk || !chunk.trim() || !chunk.trim().startsWith('---')) continue;
            const movie = parseSingleMarkdownSection(chunk.trim());
            if (movie && movie.title) {
                results.push(movie);
            }
        }
    }

    // 2. 若未匹配到任何 Frontmatter，尝试解析无 frontmatter 的单篇手写笔记
    if (results.length === 0) {
        const singleParsed = parseSingleMarkdownSection(markdownContent.trim());
        if (singleParsed && singleParsed.title && !singleParsed.title.includes('观影记录') && !singleParsed.title.includes('CineLog')) {
            results.push(singleParsed);
        }
    }

    return results;
}

/**
 * 依据 YAML 区块和正文区块组装 Movie 对象
 */
function parseYamlAndBody(yamlBlock: string, bodyBlock: string): Movie | null {
    const movie: Partial<Movie> = {
        id: generateUUID(),
        title: '',
        status: MovieStatus.WATCHED,
        rating: 5,
        mediaType: 'movie',
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        watchIteration: 1
    };

    // 解析 YAML key-value
    const lines = yamlBlock.split(/\r?\n/);
    let currentTagArray: string[] | null = null;

    for (const line of lines) {
        if (line.trim().startsWith('- ') && currentTagArray) {
            const tagVal = line.trim().substring(2).replace(/^["']|["']$/g, '').trim();
            if (tagVal) currentTagArray.push(tagVal);
            continue;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        const key = line.substring(0, colonIdx).trim().toLowerCase();
        const val = line.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

        if (key === 'tags') {
            currentTagArray = [];
            movie.tags = currentTagArray;
            if (val && val.startsWith('[') && val.endsWith(']')) {
                movie.tags = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                currentTagArray = null;
            }
        } else if (key === 'id' && val) {
            movie.id = val;
        } else if (key === 'title') {
            movie.title = val;
        } else if (key === 'original_title') {
            movie.originalTitle = val;
        } else if (key === 'year') {
            movie.year = val;
        } else if (key === 'media_type') {
            movie.mediaType = val === 'tv' ? 'tv' : 'movie';
        } else if (key === 'status') {
            movie.status = (val === 'watching' || val === '在看') ? MovieStatus.WATCHING : (val === 'planning' || val === '想看') ? MovieStatus.PLANNING : MovieStatus.WATCHED;
        } else if (key === 'rating') {
            movie.rating = parseFloat(val) || 0;
        } else if (key === 'tmdb_rating') {
            movie.tmdbRating = parseFloat(val) || 0;
        } else if (key === 'director') {
            movie.director = val;
        } else if (key === 'cast') {
            movie.cast = val;
        } else if (key === 'country') {
            movie.country = val;
        } else if (key === 'genre') {
            movie.genre = val;
        } else if (key === 'platform') {
            movie.platform = val;
        } else if (key === 'quote') {
            movie.quote = val;
        } else if (key === 'duration') {
            movie.duration = parseInt(val) || undefined;
        } else if (key === 'current_episode') {
            movie.currentEpisode = parseInt(val) || undefined;
        } else if (key === 'total_episodes') {
            movie.totalEpisodes = parseInt(val) || undefined;
        } else if (key === 'watch_iteration') {
            movie.watchIteration = parseInt(val) || 1;
        } else if (key === 'playback_speed') {
            movie.playbackSpeed = parseFloat(val) || 1.0;
        } else if (key === 'added_at') {
            const parsedDate = Date.parse(val);
            if (!isNaN(parsedDate)) movie.addedAt = parsedDate;
        } else if (key === 'last_updated') {
            const parsedDate = Date.parse(val);
            if (!isNaN(parsedDate)) movie.lastUpdated = parsedDate;
        }
    }

    // 解析 Markdown 正文提取 quote, review, overview, poster
    if (bodyBlock) {
        const quoteMatch = bodyBlock.match(/>\s*\*\*经典台词\*\*[：:]\s*([^\n]+)/);
        if (quoteMatch && quoteMatch[1] && !movie.quote) {
            movie.quote = quoteMatch[1].trim();
        }

        const posterMatch = bodyBlock.match(/!\[(?:海报|poster)\]\(([^)]+)\)/i);
        if (posterMatch && posterMatch[1] && !movie.posterImage) {
            movie.posterImage = posterMatch[1].trim();
        }

        const reviewMatch = bodyBlock.match(/###\s*📝\s*观影评价\r?\n([\s\S]*?)(?=\r?\n###|$)/);
        if (reviewMatch && reviewMatch[1]) {
            movie.review = reviewMatch[1].trim();
        }

        const overviewMatch = bodyBlock.match(/###\s*📖\s*剧情简介\r?\n([\s\S]*?)(?=\r?\n###|$)/);
        if (overviewMatch && overviewMatch[1]) {
            movie.overview = overviewMatch[1].trim();
        }
    }

    return movie.title ? (movie as Movie) : null;
}

/**
 * 解析单篇 Markdown 内容
 */
function parseSingleMarkdownSection(text: string): Movie | null {
    if (!text || !text.trim()) return null;

    const trimmed = text.trim();
    const frontmatterMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);

    if (frontmatterMatch) {
        return parseYamlAndBody(frontmatterMatch[1], frontmatterMatch[2]);
    }

    // 无 frontmatter 模式，从 Markdown 标题与列表提取
    const movie: Partial<Movie> = {
        id: generateUUID(),
        title: '',
        status: MovieStatus.WATCHED,
        rating: 5,
        mediaType: 'movie',
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        watchIteration: 1
    };

    const titleMatch = trimmed.match(/^#+\s*([^(#\n]+)(?:\((\d{4})\))?/m);
    if (titleMatch) {
        movie.title = titleMatch[1].trim();
        if (titleMatch[2]) movie.year = titleMatch[2].trim();
    }

    const quoteMatch = trimmed.match(/>\s*\*\*经典台词\*\*[：:]\s*([^\n]+)/);
    if (quoteMatch) movie.quote = quoteMatch[1].trim();

    const reviewMatch = trimmed.match(/###\s*📝\s*观影评价\r?\n([\s\S]*?)(?=\r?\n###|$)/);
    if (reviewMatch) movie.review = reviewMatch[1].trim();

    const overviewMatch = trimmed.match(/###\s*📖\s*剧情简介\r?\n([\s\S]*?)(?=\r?\n###|$)/);
    if (overviewMatch) movie.overview = overviewMatch[1].trim();

    return movie.title ? (movie as Movie) : null;
}
