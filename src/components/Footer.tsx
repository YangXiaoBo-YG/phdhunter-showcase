import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-2">PhDHunter</h4>
            <p className="text-secondary text-xs leading-relaxed">
              面向博士求职者的浙江省岗位推荐网站。AI 个性化推荐，编制类型一目了然。
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">快速链接</h4>
            <ul className="space-y-1 text-xs">
              <li><Link href="/recommend" className="text-secondary hover:text-brand">AI 智能推荐</Link></li>
              <li><Link href="/jobs" className="text-secondary hover:text-brand">海选浏览</Link></li>
              <li><Link href="/favorites" className="text-secondary hover:text-brand">我的收藏</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">数据来源</h4>
            <p className="text-secondary text-xs leading-relaxed">
              浙江省高校人事处、省人社厅、央国企官网等公开招聘信息，每周自动更新。
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-secondary">
          © {new Date().getFullYear()} PhDHunter · 仅供求职参考，以招聘单位官方公告为准
        </div>
      </div>
    </footer>
  );
}
