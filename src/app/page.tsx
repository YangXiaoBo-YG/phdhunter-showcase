import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// 强制动态渲染，避免构建时调用数据库
export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const { count: jobCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: orgs } = await supabase
      .from('jobs')
      .select('organization')
      .eq('status', 'active');

    const uniqueOrgs = new Set(orgs?.map((o) => o.organization) || []);
    return { jobCount: jobCount || 0, orgCount: uniqueOrgs.size };
  } catch {
    return { jobCount: 0, orgCount: 0 };
  }
}

export default async function HomePage() {
  const { jobCount, orgCount } = await getStats();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex items-center justify-center px-4 py-20 sm:py-28">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 leading-tight">
            找到适合你的<span className="text-brand">浙江博士岗位</span>
          </h1>
          <p className="text-secondary text-base mb-8">
            AI 个性化推荐 · 编制类型一目了然 · 高校+事业单位+央国企一站聚合
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/recommend"
              className="px-8 py-3 text-sm font-medium bg-brand text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              AI 智能推荐
            </Link>
            <Link
              href="/jobs"
              className="px-8 py-3 text-sm font-medium border border-border text-foreground rounded-xl hover:bg-surface transition-colors"
            >
              浏览全部岗位
            </Link>
          </div>
        </div>
      </section>

      {/* 三个卖点 */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FeatureCard
            icon={<SparkleIcon />}
            title="AI 智能匹配"
            desc="填写学术画像和生活偏好，AI 根据研究方向、城市、编制等维度个性化推荐"
          />
          <FeatureCard
            icon={<ShieldIcon />}
            title="编制透明"
            desc="事业编制、备案制、人事代理、合同制一目了然，不再信息不对称"
          />
          <FeatureCard
            icon={<GridIcon />}
            title="一站聚合"
            desc="浙江高校、科研院所、央国企研究院招聘信息聚合，每周自动更新"
          />
        </div>
      </section>

      {/* 统计 */}
      <section className="border-t border-border px-4 py-8">
        <div className="max-w-4xl mx-auto flex justify-center gap-12 text-center">
          <div>
            <p className="text-2xl font-bold text-brand">{orgCount}+</p>
            <p className="text-xs text-secondary mt-1">覆盖机构</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand">{jobCount}+</p>
            <p className="text-xs text-secondary mt-1">在线岗位</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand">11</p>
            <p className="text-xs text-secondary mt-1">地市覆盖</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-surface rounded-xl p-5 border border-border">
      <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      <p className="text-xs text-secondary leading-relaxed">{desc}</p>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06a.75.75 0 1 1-1.06 1.06L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.062 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM3 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 8ZM14 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 14 8ZM7.172 13.828a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 0 1 0 1.06ZM12.828 13.828a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0ZM10 14a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 14ZM10 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M9.661 2.237a.75.75 0 0 1 .678 0 12.04 12.04 0 0 0 7.143 1.867.75.75 0 0 1 .768.768c.187 4.431-1.3 8.61-4.137 11.388a12.603 12.603 0 0 1-3.862 2.768.75.75 0 0 1-.502 0 12.6 12.6 0 0 1-3.862-2.768C2.951 13.482 1.464 9.303 1.65 4.872a.75.75 0 0 1 .768-.768A12.04 12.04 0 0 0 9.66 2.237ZM13.28 8.03a.75.75 0 0 0-1.06-1.06L9 10.19 7.78 8.97a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.75-3.75Z" clipRule="evenodd" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25l.01 9.5A2.25 2.25 0 0 1 16.76 17H3.26A2.25 2.25 0 0 1 1 14.75l-.01-9.5Zm8.26 9.52v-3.5l-2.25.313v3.187h2.25Zm1.5 0h2.25v-3.187l-2.25-.313v3.5Zm3.75 0h2.25V12.5l-2.25-.313v2.573Zm0-4.103 2.25.313v-2.5l-2.25-.312v2.499Zm-1.5-.21-2.25-.312v-2.5l2.25.313v2.499Zm-3.75-.521-2.25-.312V7.083l2.25.312v2.563Zm-3.75-.521L3.25 9.14V6.77l2.25.312v2.355Zm0 1.546-2.25.313v2.573h2.25v-2.886Z" clipRule="evenodd" />
    </svg>
  );
}
