'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 99999,
        background: '#fff',
        borderBottom: '1px solid #e5e5e5',
      }}
    >
      <table
        style={{
          maxWidth: 1152,
          margin: '0 auto',
          padding: '0 16px',
          height: 56,
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <tbody>
          <tr>
            {/* Logo - 固定窄宽度，不会延伸 */}
            <td style={{ textAlign: 'left', width: 140, paddingLeft: 16 }}>
              <Link
                href="/"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1D9E75',
                  textDecoration: 'none',
                }}
              >
                PhDHunter
              </Link>
            </td>
            {/* 导航 - 占满剩余空间，内容靠右 */}
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: 16 }}>
              <NavButton label="AI推荐" href="/recommend" active={pathname === '/recommend'} onClick={() => router.push('/recommend')} />
              <NavButton label="海选浏览" href="/jobs" active={pathname?.startsWith('/jobs') || false} onClick={() => router.push('/jobs')} />
              <NavButton label="收藏" href="/favorites" active={pathname === '/favorites'} onClick={() => router.push('/favorites')} />
            </td>
          </tr>
        </tbody>
      </table>
    </header>
  );
}

function NavButton({ label, href, active, onClick }: { label: string; href: string; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      style={{
        display: 'inline-block',
        padding: '8px 16px',
        marginLeft: 4,
        borderRadius: 8,
        fontSize: 14,
        textDecoration: 'none',
        color: active ? '#1D9E75' : '#666',
        fontWeight: active ? 600 : 400,
        background: active ? '#e6f7f0' : 'transparent',
      }}
    >
      {label}
    </Link>
  );
}
