'use client';

import Link from 'next/link';
import BianzhiBadge from './BianzhiBadge';
import { addFavorite, removeFavorite, isFavorite, subscribeFavorites } from '@/lib/storage';
import { isPublicUrl } from '@/lib/url-utils';
import { useSyncExternalStore } from 'react';
import type { Job, MatchResult } from '@/types';

interface Props {
  job: Job;
  match?: MatchResult;
}

export default function JobCard({ job, match }: Props) {
  const fav = useSyncExternalStore(
    subscribeFavorites,
    () => isFavorite(job.id),
    () => false,
  );

  function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (fav) {
      removeFavorite(job.id);
    } else {
      addFavorite(job.id);
    }
  }

  const hasPublicUrl = isPublicUrl(job.source_url);

  return (
    <div className="bg-background border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
      {/* 上部：标题 + 单位 + 收藏 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-foreground hover:text-brand line-clamp-2 block">
            {job.title}
          </Link>
          <p className="text-xs text-secondary mt-0.5 truncate">{job.organization}{job.department ? ` · ${job.department}` : ''}</p>
        </div>
        <button onClick={toggleFav} className="shrink-0 p-1" aria-label={fav ? '取消收藏' : '收藏'}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`w-5 h-5 ${fav ? 'fill-favorite text-favorite' : 'fill-none text-secondary'}`} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* 中部：标签 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <BianzhiBadge type={job.bianzhi_type} />
        {job.position_type && (
          <span className="px-2 py-0.5 text-[11px] rounded-lg bg-surface text-secondary">{job.position_type}</span>
        )}
        {job.location_city && (
          <span className="px-2 py-0.5 text-[11px] rounded-lg bg-surface text-secondary">{job.location_city}</span>
        )}
        {job.institution_type && (
          <span className="px-2 py-0.5 text-[11px] rounded-lg bg-surface text-secondary">{job.institution_type}</span>
        )}
      </div>

      {/* AI推荐模式：匹配度+理由 */}
      {match && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${match.score}%` }} />
            </div>
            <span className="text-xs font-medium text-brand">{match.score}%</span>
          </div>
          {match.reason && (
            <p className="text-xs text-secondary bg-surface rounded-lg px-2.5 py-1.5">{match.reason}</p>
          )}
        </div>
      )}

      {/* 底部：时间 + 链接 */}
      <div className="flex items-center justify-between text-[11px] text-secondary">
        <div className="flex gap-3">
          {job.publish_date && <span>发布 {job.publish_date}</span>}
          {job.deadline && <span>截止 {job.deadline}</span>}
        </div>
        <div className="flex gap-3">
          {hasPublicUrl && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-brand hover:underline"
            >
              原始公告
            </a>
          )}
          <Link href={`/jobs/${job.id}`} className="text-brand hover:underline">
            查看详情
          </Link>
        </div>
      </div>
    </div>
  );
}
