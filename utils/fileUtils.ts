import { Movie } from '../types';

export const convertToCSV = (data: Movie[]) => {
  const headers = ['ID', '标题', '年份', '国家/地区', '类型', '导演', '评分', '状态', '评价', '添加时间', '最后更新', '媒体类型', '当前集数', '总集数', '时长'];
  
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
    m.rating,
    m.status,
    escapeCsv(m.review),
    new Date(m.addedAt).toLocaleString('zh-CN'),
    new Date(m.lastUpdated).toLocaleString('zh-CN'),
    m.mediaType === 'tv' ? '电视剧' : '电影',
    m.currentEpisode || '',
    m.totalEpisodes || '',
    m.duration || ''
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
          current += char;
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
                 // Remove BOM if present for check
                 const cleanFirstLine = firstLine.charCodeAt(0) === 0xFEFF ? firstLine.slice(1) : firstLine;

                 const hasChineseHeader = cleanFirstLine.includes('标题') || cleanFirstLine.includes('年份');
                 
                 if (!hasChineseHeader) {
                     try {
                         const gbkDecoder = new TextDecoder('gbk');
                         const gbkContent = gbkDecoder.decode(buffer);
                         // Check GBK content
                         const gbkFirstLine = gbkContent.split(/\r?\n/)[0];
                         if (gbkFirstLine.includes('标题') || gbkFirstLine.includes('年份')) {
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
                    // Remove BOM if present
                    if (lines[0].charCodeAt(0) === 0xFEFF) {
                        lines[0] = lines[0].slice(1);
                    }
                    
                    // Map headers from Chinese to keys
                    const headerRow = parseCSVLine(lines[0]);
                    const headerMap: Record<string, keyof Movie | string> = {
                        'ID': 'id',
                        '标题': 'title',
                        '年份': 'year',
                        '国家/地区': 'country',
                        '类型': 'genre',
                        '导演': 'director',
                        '评分': 'rating',
                        '状态': 'status',
                        '评价': 'review',
                        '添加时间': 'addedAt',
                        '最后更新': 'lastUpdated',
                        '媒体类型': 'mediaType',
                        '当前集数': 'currentEpisode',
                        '总集数': 'totalEpisodes',
                        '时长': 'duration'
                    };

                    const keyIndex: Record<number, string> = {};
                    headerRow.forEach((h, i) => {
                        if (headerMap[h]) keyIndex[i] = headerMap[h];
                    });

                    for (let i = 1; i < lines.length; i++) {
                        const values = parseCSVLine(lines[i]);
                        if (values.length < 2) continue; // Skip empty rows

                        const movie: any = { posterColor: '#4f46e5' }; // Default color if missing
                        
                        Object.keys(keyIndex).forEach((idxStr) => {
                            const idx = parseInt(idxStr);
                            const key = keyIndex[idx];
                            const val = values[idx] ? values[idx].trim() : '';

                            if (key === 'rating' || key === 'currentEpisode' || key === 'totalEpisodes' || key === 'duration') {
                                movie[key] = val ? parseFloat(val) : 0;
                            } else if (key === 'addedAt' || key === 'lastUpdated') {
                                // Try to parse date string, fallback to now
                                const ts = Date.parse(val);
                                movie[key] = isNaN(ts) ? Date.now() : ts;
                            } else if (key === 'mediaType') {
                                movie[key] = val === '电视剧' ? 'tv' : 'movie';
                            } else {
                                movie[key] = val;
                            }
                        });
                        
                        if (!movie.id) movie.id = crypto.randomUUID();
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
