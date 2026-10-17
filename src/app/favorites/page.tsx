'use client';

import Link from 'next/link';

import { useState, useEffect } from 'react';
import JobCard from '@/components/JobCard';
import { getFavorites, subscribeFavorites } from '@/lib/storage';
import type { Job } from '@/types';

export default function FavoritesPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const favIds = getFavorites();

      if (favIds.length === 0) {
        setLoading(false);
        return;
      }

      // 批量查询收藏的岗位
      try {
        const res = await fetch(`/api/v1/jobs?pageSize=50`);
        const json = await res.json();
        const allJobs: Job[] = json.data || [];
        // 过滤出收藏的
        const favJobs = allJobs.filter((j: Job) => favIds.includes(j.id));

        // 如果第一页不够，可能需要单独查询
        if (favJobs.length < favIds.length) {
          // 逐个查询缺失的
          const missingIds = favIds.filter((id) => !favJobs.find((j) => j.id === id));
          for (const id of missingIds.slice(0, 20)) {
            try {
              const r = await fetch(`/api/v1/jobs/${id}`);
              const d = await r.json();
              if (d.data) favJobs.push(d.data);
            } catch {
              // 岗位可能已删除
            }
          }
        }

        setJobs(favJobs);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 监听收藏变化（从 JobCard 取消收藏后刷新）
  useEffect(() => {
    function handleStorage() {
      const favIds = getFavorites();
      setJobs((prev) => prev.filter((j) => favIds.includes(j.id)));
    }
    return subscribeFavorites(handleStorage);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-lg font-bold mb-4">我的收藏</h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-secondary">
          <p className="text-lg mb-2">还没有收藏的岗位</p>
          <p className="text-sm">
            去{' '}
            <Link href="/jobs" className="text-brand hover:underline">
              海选浏览
            </Link>{' '}
            看看吧
          </p>
        </div>
      )}
    </div>
  );
}
