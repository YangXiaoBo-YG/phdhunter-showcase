'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BianzhiBadge from '@/components/BianzhiBadge';
import { addFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { isPublicUrl } from '@/lib/url-utils';
import type { Job } from '@/types';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/jobs/${id}`)
      .then((r) => r.json())
      .then((json) => {
        setJob(json.data || null);
        if (json.data) setFav(isFavorite(json.data.id));
      })
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id]);

  function toggleFav() {
    if (!job) return;
    if (fav) removeFavorite(job.id);
    else addFavorite(job.id);
    setFav(!fav);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-2/3 bg-surface rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-surface rounded animate-pulse" />
          <div className="h-40 bg-surface rounded-xl animate-pulse mt-6" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-secondary mb-4">岗位不存在或已下架</p>
        <button onClick={() => router.push('/jobs')} className="text-brand hover:underline">
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* 返回 */}
      <button onClick={() => router.back()} className="text-sm text-secondary hover:text-foreground mb-4 inline-flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        返回
      </button>

      {/* 标题区 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground mb-1">{job.title}</h1>
        <p className="text-secondary">
          {job.organization}
          {job.department ? ` · ${job.department}` : ''}
        </p>
      </div>

      {/* 编制标签（大号） */}
      <div className="mb-5">
        <BianzhiBadge type={job.bianzhi_type} size="md" />
      </div>

      {/* 基本信息栏 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <InfoItem label="岗位类型" value={job.position_type} />
        <InfoItem label="机构类型" value={job.institution_type} />
        <InfoItem label="城市" value={job.location_city} />
        <InfoItem label="学历要求" value={job.degree_requirement} />
      </div>

      {/* 学科方向 */}
      {(job.discipline?.length || job.research_direction) && (
        <Section title="学科方向">
          {job.discipline && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {job.discipline.map((d) => (
                <span key={d} className="px-2 py-0.5 text-xs bg-surface text-secondary rounded-lg">{d}</span>
              ))}
            </div>
          )}
          {job.research_direction && <p className="text-sm text-foreground">{job.research_direction}</p>}
        </Section>
      )}

      {/* 薪资待遇 */}
      {(job.salary_range || job.benefits?.length) && (
        <Section title="薪资待遇">
          {job.salary_range && <p className="text-sm font-medium text-brand mb-2">{job.salary_range}</p>}
          {job.benefits && (
            <ul className="space-y-1">
              {job.benefits.map((b, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                  <span className="text-brand mt-1">·</span> {b}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* 岗位描述 */}
      {job.raw_description && (
        <Section title="岗位描述">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {job.raw_description}
          </p>
        </Section>
      )}

      {/* 时间信息 */}
      <div className="flex gap-6 text-xs text-secondary mb-6">
        {job.publish_date && <span>发布日期：{job.publish_date}</span>}
        {job.deadline && <span>截止日期：{job.deadline}</span>}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={toggleFav}
          className={`px-5 py-2.5 text-sm rounded-lg border transition-colors ${
            fav
              ? 'bg-favorite/10 text-favorite border-favorite/30'
              : 'border-border text-secondary hover:text-foreground hover:bg-surface'
          }`}
        >
          {fav ? '已收藏' : '收藏'}
        </button>
        {isPublicUrl(job.source_url) && (
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 text-sm bg-brand text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            查看原始公告
          </a>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] text-secondary mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value || '-'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-foreground mb-2 pb-1 border-b border-border">{title}</h2>
      {children}
    </div>
  );
}
