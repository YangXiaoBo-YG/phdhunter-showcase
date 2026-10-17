'use client';

import { useState } from 'react';
import { ZHEJIANG_CITIES, INSTITUTION_OPTIONS } from '@/types';
import type { Preferences, WorkPace, CareerPath, BenefitOption, InstitutionType } from '@/types';

const WORK_PACE_OPTIONS: { value: WorkPace; label: string; desc: string }[] = [
  { value: '事少离家近', label: '事少离家近', desc: '稳定、低压、重视生活' },
  { value: '大城市拼搏', label: '大城市拼搏', desc: '高强度换高回报' },
  { value: '躺平养生', label: '躺平养生', desc: '最小压力、最大自由' },
  { value: '学术热爱', label: '学术热爱', desc: '方向匹配最重要' },
  { value: '均衡发展', label: '均衡发展', desc: '各方面都想兼顾' },
];

const CAREER_OPTIONS: { value: CareerPath; label: string }[] = [
  { value: '学术路线', label: '学术路线（教职→长聘）' },
  { value: '科研路线', label: '科研路线（专职科研/研究院）' },
  { value: '产业研发', label: '产业研发（企业R&D）' },
  { value: '不限', label: '不限' },
];

const BENEFIT_OPTIONS: BenefitOption[] = [
  '编制', '薪资/安家费', '科研启动经费', '住房补贴', '子女教育', '晋升空间', '学术自由度',
];

const STEPS = ['工作节奏', '城市偏好', '职业路径', '福利优先级', '机构偏好'];

interface Props {
  initial?: Preferences | null;
  onSubmit: (prefs: Preferences) => void;
  onBack: () => void;
}

export default function PreferenceWizard({ initial, onSubmit, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [workPace, setWorkPace] = useState<WorkPace | null>(initial?.work_pace || null);
  const [cities, setCities] = useState<string[]>(initial?.preferred_cities || []);
  const [career, setCareer] = useState<CareerPath | null>(initial?.career_path || null);
  const [benefits, setBenefits] = useState<BenefitOption[]>(initial?.benefit_priorities || []);
  const [institutions, setInstitutions] = useState<InstitutionType[]>(initial?.institution_preferences || []);

  function toggleCity(c: string) {
    setCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  function toggleInst(i: InstitutionType) {
    setInstitutions((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  function toggleBenefit(b: BenefitOption) {
    setBenefits((prev) => {
      if (prev.includes(b)) return prev.filter((x) => x !== b);
      if (prev.length >= 3) return prev;
      return [...prev, b];
    });
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  function finish() {
    onSubmit({
      work_pace: workPace,
      preferred_cities: cities,
      career_path: career,
      benefit_priorities: benefits,
      institution_preferences: institutions,
    });
  }

  return (
    <div>
      {/* 进度条 */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand' : 'bg-surface'}`} />
        ))}
      </div>
      <p className="text-xs text-secondary mb-4">
        步骤 {step + 1}/{STEPS.length} · {STEPS[step]}
        <span className="ml-2 text-secondary/60">（可跳过）</span>
      </p>

      {/* Step 1: 工作节奏 */}
      {step === 0 && (
        <div className="space-y-2">
          {WORK_PACE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setWorkPace(workPace === opt.value ? null : opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                workPace === opt.value
                  ? 'border-brand bg-brand/5'
                  : 'border-border hover:border-foreground/30'
              }`}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-secondary ml-2">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: 城市偏好 */}
      {step === 1 && (
        <div className="flex flex-wrap gap-2">
          {ZHEJIANG_CITIES.map((c) => (
            <button
              key={c}
              onClick={() => toggleCity(c)}
              className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
                cities.includes(c)
                  ? 'border-brand bg-brand/5 text-brand font-medium'
                  : 'border-border text-secondary hover:border-foreground/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Step 3: 职业路径 */}
      {step === 2 && (
        <div className="space-y-2">
          {CAREER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCareer(career === opt.value ? null : opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                career === opt.value
                  ? 'border-brand bg-brand/5'
                  : 'border-border hover:border-foreground/30'
              }`}
            >
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 4: 福利优先级 */}
      {step === 3 && (
        <div>
          <p className="text-xs text-secondary mb-3">选择最看重的 3 项（已选 {benefits.length}/3）</p>
          <div className="flex flex-wrap gap-2">
            {BENEFIT_OPTIONS.map((b) => (
              <button
                key={b}
                onClick={() => toggleBenefit(b)}
                className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
                  benefits.includes(b)
                    ? 'border-brand bg-brand/5 text-brand font-medium'
                    : benefits.length >= 3
                      ? 'border-border text-secondary/40 cursor-not-allowed'
                      : 'border-border text-secondary hover:border-foreground/30'
                }`}
              >
                {benefits.includes(b) && <span className="mr-1">{benefits.indexOf(b) + 1}.</span>}
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: 机构偏好 */}
      {step === 4 && (
        <div className="flex flex-wrap gap-2">
          {INSTITUTION_OPTIONS.map((i) => (
            <button
              key={i}
              onClick={() => toggleInst(i)}
              className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
                institutions.includes(i)
                  ? 'border-brand bg-brand/5 text-brand font-medium'
                  : 'border-border text-secondary hover:border-foreground/30'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      )}

      {/* 按钮 */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : onBack()}
          className="px-5 py-2.5 text-sm border border-border rounded-lg text-secondary hover:text-foreground transition-colors"
        >
          {step > 0 ? '上一步' : '返回画像'}
        </button>
        <button
          onClick={next}
          className="flex-1 py-2.5 text-sm font-medium bg-brand text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          {step < STEPS.length - 1 ? '下一步' : '获取推荐'}
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={next}
            className="px-5 py-2.5 text-sm text-secondary hover:text-foreground transition-colors"
          >
            跳过
          </button>
        )}
      </div>
    </div>
  );
}
