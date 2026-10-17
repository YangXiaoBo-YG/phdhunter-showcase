'use client';

import { useState, useEffect, useCallback } from 'react';
import JobCard from '@/components/JobCard';
import FilterSidebar from '@/components/FilterSidebar';
import type { Job } from '@/types';

interface Filters {
  bianzhi_type: string;
  position_type: string;
  institution_type: string;
  city: string;
}

const EMPTY_FILTERS: Filters = {
  bianzhi_type: '',
  position_type: '',
  institution_type: '',
  city: '',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 20;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (filters.bianzhi_type) params.set('bianzhi_type', filters.bianzhi_type);
    if (filters.position_type) params.set('position_type', filters.position_type);
    if (filters.institution_type) params.set('institution_type', filters.institution_type);
    if (filters.city) params.set('city', filters.city);
    if (search) params.set('q', search);

    try {
      const res = await fetch(`/api/v1/jobs?${params}`);
      const json = await res.json();
      setJobs(json.data || []);
      setTotal(json.pagination?.total || 0);
      setTotalPages(json.pagination?.totalPages || 0);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters, search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function handleFilterChange(newFilters: Filters) {
    setFilters(newFilters);
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* 搜索栏 */}
      <div className="mb-4 flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索岗位、单位..."
            className="flex-1 px-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder-secondary focus:outline-none focus:border-brand"
          />
          <button type="submit" className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90 transition-opacity">
            搜索
          </button>
        </form>
        {/* 移动端筛选按钮 */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden px-3 py-2 text-sm border border-border rounded-lg bg-background relative"
        >
          筛选
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand text-white text-[10px] rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-6">
        {/* 左侧筛选器 */}
        <FilterSidebar
          filters={filters}
          onChange={handleFilterChange}
          className={`w-56 shrink-0 ${showFilters ? 'block' : 'hidden'} lg:block`}
        />

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {/* 统计 */}
          <p className="text-xs text-secondary mb-3">
            共 {total} 个岗位
            {search && <span> · 搜索 &quot;{search}&quot;</span>}
          </p>

          {/* 列表 */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
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
              <p className="text-lg mb-2">没有找到匹配的岗位</p>
              <p className="text-sm">试试调整筛选条件或搜索关键词</p>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-30 hover:bg-surface transition-colors"
              >
                上一页
              </button>
              <span className="text-sm text-secondary px-3">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-30 hover:bg-surface transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
