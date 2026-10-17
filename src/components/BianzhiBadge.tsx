import type { BianzhiType } from '@/types';

const STYLES: Record<string, string> = {
  '事业编制': 'bg-bianzhi-shiye-bg text-bianzhi-shiye-text',
  '备案制': 'bg-bianzhi-beian-bg text-bianzhi-beian-text',
  '人事代理': 'bg-bianzhi-other-bg text-bianzhi-other-text',
  '合同制': 'bg-bianzhi-other-bg text-bianzhi-other-text',
  '未标注': 'bg-transparent text-secondary border border-dashed border-border',
};

interface Props {
  type: BianzhiType | string | null;
  size?: 'sm' | 'md';
}

export default function BianzhiBadge({ type, size = 'sm' }: Props) {
  const label = type || '未标注';
  const style = STYLES[label] || STYLES['未标注'];
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]';

  return (
    <span className={`inline-block rounded-xl font-medium whitespace-nowrap ${style} ${sizeClass}`}>
      {label}
    </span>
  );
}
