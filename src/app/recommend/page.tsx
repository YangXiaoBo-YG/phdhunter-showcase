'use client';

import { useState, useEffect } from 'react';
import ProfileForm from '@/components/ProfileForm';
import PreferenceWizard from '@/components/PreferenceWizard';
import JobCard from '@/components/JobCard';
import {
  getProfile, setProfile as saveProfile,
  getPreferences, setPreferences as savePreferences,
  getRecommendCache, setRecommendCache, clearRecommendCache,
  canMatch, getNextMatchTime, setLastMatchTime,
} from '@/lib/storage';
import type { AcademicProfile, Preferences, MatchResult, Job } from '@/types';

type Step = 'profile' | 'preferences' | 'loading' | 'results';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function RecommendPage() {
  const [step, setStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [results, setResults] = useState<(MatchResult & { job?: Job })[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  const [cachedTime, setCachedTime] = useState('');

  // 初始化：检查缓存和已有画像
  useEffect(() => {
    const cached = getRecommendCache();
    if (cached && Date.now() - cached.timestamp < THREE_DAYS_MS) {
      // 有未过期缓存，直接显示
      setProfile(cached.profile);
      setPreferences(cached.preferences);
      setResults(cached.results as (MatchResult & { job?: Job })[]);
      setCachedTime(formatTimeAgo(cached.timestamp));
      setStep('results');
      return;
    }

    const savedProfile = getProfile();
    const savedPrefs = getPreferences();
    if (savedProfile) {
      setProfile(savedProfile);
      if (savedPrefs) {
        setPreferences(savedPrefs);
        setStep('preferences'); // 直接到偏好步骤
      }
    }
  }, []);

  // 倒计时
  useEffect(() => {
    if (step !== 'results' || canMatch()) return;
    const next = getNextMatchTime();
    if (!next) return;

    const timer = setInterval(() => {
      const diff = next - Date.now();
      if (diff <= 0) {
        setCountdown('');
        clearInterval(timer);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${h}小时${m}分钟后可重新匹配`);
    }, 60000);

    // 立即计算一次
    const diff = next - Date.now();
    if (diff > 0) {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${h}小时${m}分钟后可重新匹配`);
    }

    return () => clearInterval(timer);
  }, [step]);

  function handleProfileSubmit(p: AcademicProfile) {
    setProfile(p);
    saveProfile(p);
    setStep('preferences');
  }

  function handlePreferencesSubmit(prefs: Preferences) {
    setPreferences(prefs);
    savePreferences(prefs);
    doMatch(profile!, prefs);
  }

  async function doMatch(prof: AcademicProfile, prefs: Preferences) {
    setStep('loading');
    setError('');

    try {
      const res = await fetch('/api/v1/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: prof, preferences: prefs }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(`匹配次数已用完，${formatCountdown(data.retry_after_ms)}`);
        setStep('results');
        return;
      }

      if (!res.ok) {
        throw new Error('匹配服务异常');
      }

      const data = await res.json();
      setResults(data.data || []);
      setDegraded(data.degraded || false);
      setLastMatchTime();
      setRecommendCache(data.data || [], prof, prefs);
      setCachedTime('');
      setStep('results');
    } catch (e) {
      setError((e as Error).message || '匹配失败，请稍后重试');
      setStep('results');
    }
  }

  function handleRematch() {
    if (!canMatch()) return;
    clearRecommendCache();
    if (profile && preferences) {
      doMatch(profile, preferences);
    } else {
      setStep('profile');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Step 1: 画像 */}
      {step === 'profile' && (
        <>
          <h1 className="text-lg font-bold mb-1">学术画像</h1>
          <p className="text-xs text-secondary mb-6">填写你的学术背景，帮助 AI 理解你的方向</p>
          <ProfileForm initial={profile} onSubmit={handleProfileSubmit} />
        </>
      )}

      {/* Step 2: 偏好 */}
      {step === 'preferences' && (
        <>
          <h1 className="text-lg font-bold mb-1">偏好设置</h1>
          <p className="text-xs text-secondary mb-6">告诉我们你理想的工作是什么样的</p>
          <PreferenceWizard
            initial={preferences}
            onSubmit={handlePreferencesSubmit}
            onBack={() => setStep('profile')}
          />
        </>
      )}

      {/* Loading */}
      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
          <p className="text-sm text-foreground font-medium">AI 正在匹配中...</p>
          <p className="text-xs text-secondary mt-1">预计 15-30 秒</p>
        </div>
      )}

      {/* Step 3: 结果 */}
      {step === 'results' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold">推荐结果</h1>
              {cachedTime && (
                <p className="text-xs text-secondary">基于 {cachedTime} 的匹配结果</p>
              )}
              {degraded && (
                <p className="text-xs text-orange-500">AI 精排暂不可用，当前为向量匹配结果</p>
              )}
            </div>
            <button
              onClick={handleRematch}
              disabled={!canMatch()}
              className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors"
            >
              重新匹配
            </button>
          </div>

          {countdown && (
            <p className="text-xs text-secondary bg-surface rounded-lg px-3 py-2 mb-4">{countdown}</p>
          )}

          {error && (
            <div className="bg-favorite/10 text-favorite text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
          )}

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((r) => (
                r.job ? (
                  <JobCard key={r.job_id} job={r.job as Job} match={r} />
                ) : null
              ))}
            </div>
          ) : !error ? (
            <div className="text-center py-16 text-secondary">
              <p className="text-lg mb-2">暂无匹配结果</p>
              <p className="text-sm">试试调整学术画像或偏好设置</p>
              <button
                onClick={() => setStep('profile')}
                className="mt-4 px-4 py-2 text-sm text-brand border border-brand rounded-lg hover:bg-brand/5"
              >
                修改画像
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '刚才';
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}小时${m}分钟后可重新匹配`;
}
