export enum MovieStatus {
  WATCHED = '完结',
  PLANNING = '想看',
  DROPPED = '弃坑',
  WATCHING = '追剧中',
}

export type MediaType = 'movie' | 'tv';

export interface EpisodeWatchLog {
  episode: number;
  date: number; // Timestamp in milliseconds
  playbackSpeed?: number; // 该集实际观看倍速 (如 1.0, 1.5, 2.0)
  note?: string;
}

export interface RewatchLog {
  iteration: number; // 观看轮次 (1, 2, 3...)
  date: number; // 观影日期时间戳
  note?: string; // 该轮重温心得/笔记
  rating?: number; // 该轮评分
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string; // 原名/外文原名（Markdown 归档导入导出使用）
  year: string;
  country?: string; // New field
  genre: string;
  director?: string;
  rating: number; // 0 to 5 (supports 0.5 step)
  tmdbRating?: number; // TMDB 平台评分 (0 to 10)
  overview?: string; // 剧情简介
  status: MovieStatus;
  review: string;
  posterColor: string; // Used for gradient placeholder if no image
  posterImage?: string; // Base64 encoded image
  addedAt: number; // Timestamp
  lastUpdated: number; // Timestamp for real-time save feedback

  // New fields for TV Series support
  mediaType: MediaType;
  currentEpisode?: number;
  totalEpisodes?: number;

  // New field for Duration
  duration?: number; // Minutes (Total for movie, per episode for TV)

  // Playback Speed fields
  playbackSpeed?: number; // 1.0, 1.5, 1.75, 2.0, or custom (0.5-3.0)
  actualWatchTime?: number; // Calculated: duration / speed (or episodes * duration / speed for TV)
  platform?: string; // New field for streaming platform
  cast?: string; // Main cast members, comma-separated
  watchIteration?: number; // 观看轮次（第几刷）
  watchHistory?: EpisodeWatchLog[]; // 追剧每集打卡时间流水
  rewatchHistory?: RewatchLog[]; // 电影/剧集重温多刷时间流水
  tags?: string[]; // 自定义标签（如“高分烧脑”、“治愈系”、“合家欢”）
  quote?: string; // 经典台词 / 灵光一现短评
}

export interface MovieStats {
  total: number;
  watched: number;
  averageRating: number;
  favoriteGenre: string;
}

export interface GeminiMovieResponse {
  title: string;
  year: string;
  country: string; // New field
  genre: string;
  director: string;
  summary: string;
  suggestedColorHex: string;
  mediaType: MediaType;
  totalEpisodes?: number;
  duration?: number; // Minutes
  tags?: string[];
  quote?: string; // 经典台词 / 灵光一现短评
}

export interface SyncConfig {
  githubToken: string;
  gistId: string;
  lastSyncTime: number;
  autoSync: boolean;
}
