'use client';

import { BIANZHI_OPTIONS, POSITION_OPTIONS, INSTITUTION_OPTIONS, ZHEJIANG_CITIES } from '@/types';

interface Filters {
  bianzhi_type: string;
  position_type: string;
  institution_type: string;
  city: string;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  className?: string;
}

function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-medium text-secondary mb-2">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange('')}
          className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
            !value
              ? 'bg-brand text-white'
              : 'bg-surface text-secondary hover:text-foreground'
          }`}
        >
          全部
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              value === opt
                ? 'bg-brand text-white'
                : 'bg-surface text-secondary hover:text-foreground'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterSidebar({ filters, onChange, className }: Props) {
  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <aside className={className}>
      <PillGroup
        label="编制类型"
        options={BIANZHI_OPTIONS}
        value={filters.bianzhi_type}
        onChange={(v) => update('bianzhi_type', v)}
      />
      <PillGroup
        label="机构类型"
        options={INSTITUTION_OPTIONS}
        value={filters.institution_type}
        onChange={(v) => update('institution_type', v)}
      />
      <PillGroup
        label="城市"
        options={ZHEJIANG_CITIES}
        value={filters.city}
        onChange={(v) => update('city', v)}
      />
      <PillGroup
        label="岗位类型"
        options={POSITION_OPTIONS}
        value={filters.position_type}
        onChange={(v) => update('position_type', v)}
      />
    </aside>
  );
}
