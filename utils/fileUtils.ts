import { Movie, MovieStatus } from '../types';
import { generateUUID } from './uuidUtils';

export const convertToCSV = (data: Movie[]) => {
  const headers = ['ID', '标题', '年份', '国家/地区', '类型', '导演', '主演', '评分', '平台评分', '状态', '评价', '剧情简介', '添加时间', '最后更新', '媒体类型', '当前集数', '总集数', '时长', '播放平台', '标签'];
  
  const escapeCsv = (str: string | undefined) => {
      if (!str) return '';
      const stringValue = String(str);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
  };

  const rows = data.map(m => [
    m.id,
    escapeCsv(m.title),
    escapeCsv(m.year),
    escapeCsv(m.country),
    escapeCsv(m.genre),
    escapeCsv(m.director),
    escapeCsv(m.cast),
    m.rating,
    m.tmdbRating || '',
    m.status,
    escapeCsv(m.review),
    escapeCsv(m.overview),
    new Date(m.addedAt).toLocaleString('zh-CN'),
    new Date(m.lastUpdated).toLocaleString('zh-CN'),
    m.mediaType === 'tv' ? '电视剧' : '电影',
    m.currentEpisode || '',
    m.totalEpisodes || '',
    m.duration || '',
    escapeCsv(m.platform),
    escapeCsv(m.tags ? m.tags.join(';') : '')
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const downloadFile = (content: string, type: 'json' | 'csv', filenamePrefix: string = 'cinelog_backup') => {
    let mimeType = '';
    let extension = '';

    if (type === 'json') {
      mimeType = 'application/json';
      extension = 'json';
    } else {
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
      // Add BOM for Excel compatibility with UTF-8
      content = '\uFEFF' + content; 
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// CSV Parsing Helper: Handles quoted strings correctly
const parseCSVLine = (text: string) => {
  const result = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
          if (inQuote && text[i + 1] === '"') {
              current += '"';
              i++; // Skip next quote
          } else {
              inQuote = !inQuote;
          }
      } else if (char === ',' && !inQuote) {
          result.push(current);
          current = '';
      } else {
          result.push(current);
      }
  }
  result.push(current);
  return result;
};

export const parseImportFile = (file: File): Promise<Movie[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            let content = '';

            // Detect encoding strategy
            const utf8Decoder = new TextDecoder('utf-8');
            const utf8Content = utf8Decoder.decode(buffer);
            
            content = utf8Content; // Default to UTF-8

            if (file.name.endsWith('.csv')) {
                 // Check for common Chinese headers to verify encoding
                 const firstLine = utf8Content.split(/\r?\n/)[0];
                 const cleanFirstLine = firstLine.charCodeAt(0) === 0xFEFF ? firstLine.slice(1) : firstLine;

                 const hasChineseHeader = cleanFirstLine.includes('标题') || cleanFirstLine.includes('片名') || cleanFirstLine.includes('年份');
                 
                 if (!hasChineseHeader) {
                     try {
                         const gbkDecoder = new TextDecoder('gbk');
                         const gbkContent = gbkDecoder.decode(buffer);
                         const gbkFirstLine = gbkContent.split(/\r?\n/)[0];
                         if (gbkFirstLine.includes('标题') || gbkFirstLine.includes('片名') || gbkFirstLine.includes('年份')) {
                             content = gbkContent;
                         }
                     } catch (err) {
                         console.warn('GBK decoding not supported or failed', err);
                     }
                 }
            }
            
            let newMovies: Movie[] = [];
            
            try {
                if (file.name.endsWith('.json')) {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        newMovies = parsed;
                    } else {
                        reject(new Error('JSON 格式错误：必须是数组格式'));
                        return;
                    }
                } else if (file.name.endsWith('.csv')) {
                    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
                    if (lines.length === 0) {
                        resolve([]);
                        return;
                    }
                    if (lines[0].charCodeAt(0) === 0xFEFF) {
                        lines[0] = lines[0].slice(1);
                    }
                    
                    // Map headers (supporting CineLog, Douban, NeoDB, Trakt)
                    const headerRow = parseCSVLine(lines[0]);
                    const headerMap: Record<string, keyof Movie | string> = {
                        'ID': 'id',
                        'id': 'id',
                        '标题': 'title',
                        '片名': 'title',
                        '电影名称': 'title',
                        '剧集名称': 'title',
                        '条目名称': 'title',
                        '名称': 'title',
                        'title': 'title',
                        '年份': 'year',
                        '年代': 'year',
                        'year': 'year',
                        '国家/地区': 'country',
                        '国家': 'country',
                        '地区': 'country',
                        '制片国家': 'country',
                        'country': 'country',
                        '类型': 'genre',
                        '影视类型': 'genre',
                        'genre': 'genre',
                        '导演': 'director',
                        'director': 'director',
                        '主演': 'cast',
                        '演员': 'cast',
                        'cast': 'cast',
                        '评分': 'rating',
                        '我的评分': 'rating',
                        '个人评分': 'rating',
                        'rating': 'rating',
                        '平台评分': 'tmdbRating',
                        'TMDB评分': 'tmdbRating',
                        '豆瓣评分': 'tmdbRating',
                        '状态': 'status',
                        '观影状态': 'status',
                        'status': 'status',
                        '评价': 'review',
                        '短评': 'review',
                        '我的短评': 'review',
                        '我的评价': 'review',
                        '影评': 'review',
                        'review': 'review',
                        'comment': 'review',
                        '剧情简介': 'overview',
                        '简介': 'overview',
                        'overview': 'overview',
                        '添加时间': 'addedAt',
                        '打卡时间': 'addedAt',
                        '标记时间': 'addedAt',
                        '创建时间': 'addedAt',
                        'addedAt': 'addedAt',
                        '最后更新': 'lastUpdated',
                        '媒体类型': 'mediaType',
                        'mediaType': 'mediaType',
                        '当前集数': 'currentEpisode',
                        '总集数': 'totalEpisodes',
                        '时长': 'duration',
                        '播放平台': 'platform',
                        '平台': 'platform',
                        'platform': 'platform',
                        '标签': 'tags',
                        'tags': 'tags'
                    };

                    const keyIndex: Record<number, string> = {};
                    headerRow.forEach((h, i) => {
                        const cleanHeader = h.trim();
                        if (headerMap[cleanHeader]) keyIndex[i] = headerMap[cleanHeader];
                    });

                    for (let i = 1; i < lines.length; i++) {
                        const values = parseCSVLine(lines[i]);
                        if (values.length < 2) continue;

                        const movie: any = {
                            posterColor: '#4f46e5',
                            status: MovieStatus.WATCHED,
                            mediaType: 'movie'
                        };
                        
                        Object.keys(keyIndex).forEach((idxStr) => {
                            const idx = parseInt(idxStr);
                            const key = keyIndex[idx];
                            const val = values[idx] ? values[idx].trim() : '';

                            if (key === 'rating') {
                                if (/^力荐|5星|5★/i.test(val)) movie.rating = 5;
                                else if (/^推荐|4星|4★/i.test(val)) movie.rating = 4;
                                else if (/^还行|3星|3★/i.test(val)) movie.rating = 3;
                                else if (/^较差|2星|2★/i.test(val)) movie.rating = 2;
                                else if (/^很差|1星|1★/i.test(val)) movie.rating = 1;
                                else movie.rating = val ? Math.min(5, Math.max(0, parseFloat(val))) : 0;
                            } else if (key === 'status') {
                                if (/^想看|计划/i.test(val)) movie.status = MovieStatus.PLANNING;
                                else if (/^在看|追剧/i.test(val)) movie.status = MovieStatus.WATCHING;
                                else if (/^弃/i.test(val)) movie.status = MovieStatus.DROPPED;
                                else movie.status = MovieStatus.WATCHED;
                            } else if (key === 'mediaType') {
                                movie.mediaType = /电视剧|剧集|tv|series/i.test(val) ? 'tv' : 'movie';
                            } else if (key === 'tmdbRating' || key === 'currentEpisode' || key === 'totalEpisodes' || key === 'duration') {
                                movie[key] = val ? parseFloat(val) : (key === 'tmdbRating' ? undefined : 0);
                            } else if (key === 'addedAt' || key === 'lastUpdated') {
                                const ts = Date.parse(val);
                                movie[key] = isNaN(ts) ? Date.now() : ts;
                            } else if (key === 'tags') {
                                movie.tags = val ? val.split(/[,;，；/、\s]+/).map(t => t.trim()).filter(Boolean) : undefined;
                            } else {
                                movie[key] = val;
                            }
                        });
                        
                        if (!movie.title) continue; // Skip invalid entries without title
                        if (!movie.id) movie.id = generateUUID();
                        newMovies.push(movie as Movie);
                    }
                } else {
                    reject(new Error('不支持的文件格式。请上传 .json 或 .csv 文件。'));
                    return;
                }
                resolve(newMovies);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsArrayBuffer(file);
    });
};
