import type { AcademicProfile, Preferences, MatchResult, RecommendCache } from '@/types';

// localStorage key 统一前缀
const PREFIX = 'phdhunter_';

const KEYS = {
  profile: `${PREFIX}profile`,
  preferences: `${PREFIX}preferences`,
  favorites: `${PREFIX}favorites`,
  lastMatchTime: `${PREFIX}last_match_time`,
  recommendCache: `${PREFIX}recommend_cache`,
} as const;

// ==================== 学术画像 ====================

export function getProfile(): AcademicProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : null;
}

export function setProfile(profile: AcademicProfile): void {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

// ==================== 偏好设置 ====================

export function getPreferences(): Preferences | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.preferences);
  return raw ? JSON.parse(raw) : null;
}

export function setPreferences(preferences: Preferences): void {
  localStorage.setItem(KEYS.preferences, JSON.stringify(preferences));
}

// ==================== 收藏管理 ====================

export function subscribeFavorites(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener('phdhunter:favorites', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('phdhunter:favorites', onChange);
  };
}


export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEYS.favorites);
  return raw ? JSON.parse(raw) : [];
}

export function addFavorite(jobId: string): void {
  const favorites = getFavorites();
  if (!favorites.includes(jobId)) {
    favorites.push(jobId);
    localStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
    window.dispatchEvent(new Event('phdhunter:favorites'));
  }
}

export function removeFavorite(jobId: string): void {
  const favorites = getFavorites().filter((id) => id !== jobId);
  localStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
  window.dispatchEvent(new Event('phdhunter:favorites'));
}

export function isFavorite(jobId: string): boolean {
  return getFavorites().includes(jobId);
}

// ==================== 匹配时间限流 ====================

export function getLastMatchTime(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.lastMatchTime);
  return raw ? Number(raw) : null;
}

export function setLastMatchTime(timestamp?: number): void {
  localStorage.setItem(KEYS.lastMatchTime, String(timestamp ?? Date.now()));
}

/** 检查是否可以进行新一轮匹配（3天冷却） */
export function canMatch(): boolean {
  const last = getLastMatchTime();
  if (!last) return true;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  return Date.now() - last >= THREE_DAYS_MS;
}

/** 获取下次可匹配的时间戳 */
export function getNextMatchTime(): number | null {
  const last = getLastMatchTime();
  if (!last) return null;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  return last + THREE_DAYS_MS;
}

// ==================== 推荐缓存 ====================

export function getRecommendCache(): RecommendCache | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.recommendCache);
  return raw ? JSON.parse(raw) : null;
}

export function setRecommendCache(results: MatchResult[], profile: AcademicProfile, preferences: Preferences): void {
  const cache: RecommendCache = {
    results,
    timestamp: Date.now(),
    profile,
    preferences,
  };
  localStorage.setItem(KEYS.recommendCache, JSON.stringify(cache));
}

export function clearRecommendCache(): void {
  localStorage.removeItem(KEYS.recommendCache);
}
