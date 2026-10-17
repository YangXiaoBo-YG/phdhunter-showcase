'use client';

import { useState } from 'react';
import type { AcademicProfile } from '@/types';

// 预设研究领域
const FIELD_OPTIONS = [
  '计算机科学与技术', '电子科学与技术', '信息与通信工程', '人工智能',
  '机械工程', '材料科学与工程', '化学工程与技术', '土木工程',
  '生物学', '基础医学', '临床医学', '药学',
  '物理学', '化学', '数学', '统计学',
  '环境科学与工程', '电气工程', '控制科学与工程',
  '工商管理', '管理科学与工程', '应用经济学', '理论经济学',
  '法学', '教育学', '心理学', '马克思主义理论',
  '中国语言文学', '外国语言文学', '新闻传播学',
  '建筑学', '城乡规划学', '食品科学与工程',
  '农学', '林学', '海洋科学', '生态学',
];

interface Props {
  initial?: AcademicProfile | null;
  onSubmit: (profile: AcademicProfile) => void;
}

export default function ProfileForm({ initial, onSubmit }: Props) {
  const [fields, setFields] = useState<string[]>(initial?.research_fields || []);
  const [customField, setCustomField] = useState('');
  const [keywords, setKeywords] = useState<string[]>(initial?.research_keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [skills, setSkills] = useState<string[]>(initial?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [degree, setDegree] = useState(initial?.degree || '');
  const [pubSummary, setPubSummary] = useState(initial?.publications_summary || '');
  const [school, setSchool] = useState(initial?.school || '');
  const [major, setMajor] = useState(initial?.major || '');

  function toggleField(f: string) {
    setFields((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  function addCustomField() {
    const v = customField.trim();
    if (v && !fields.includes(v)) {
      setFields([...fields, v]);
      setCustomField('');
    }
  }

  function addTag(list: string[], setter: (v: string[]) => void, input: string, inputSetter: (v: string) => void) {
    const v = input.trim();
    if (v && !list.includes(v)) {
      setter([...list, v]);
      inputSetter('');
    }
  }

  function removeTag(list: string[], setter: (v: string[]) => void, tag: string) {
    setter(list.filter((t) => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fields.length === 0 || !degree) return;
    onSubmit({
      research_fields: fields,
      research_keywords: keywords,
      skills,
      degree: degree as AcademicProfile['degree'],
      publications_summary: pubSummary,
      school,
      major,
    });
  }

  const isValid = fields.length > 0 && degree;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 研究领域（必填） */}
      <div>
        <label className="block text-sm font-medium mb-2">
          研究领域 <span className="text-favorite">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {FIELD_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleField(f)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                fields.includes(f)
                  ? 'bg-brand text-white'
                  : 'bg-surface text-secondary hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customField}
            onChange={(e) => setCustomField(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
            placeholder="输入自定义领域"
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand"
          />
          <button type="button" onClick={addCustomField} className="px-3 py-1.5 text-sm bg-surface rounded-lg hover:bg-border transition-colors">
            添加
          </button>
        </div>
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {fields.filter((f) => !FIELD_OPTIONS.includes(f)).map((f) => (
              <span key={f} className="px-2 py-0.5 text-xs bg-brand/10 text-brand rounded-lg flex items-center gap-1">
                {f}
                <button type="button" onClick={() => toggleField(f)} className="hover:text-favorite">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 研究关键词 */}
      <div>
        <label className="block text-sm font-medium mb-2">研究关键词</label>
        <TagInput tags={keywords} input={keywordInput} onInputChange={setKeywordInput}
          onAdd={() => addTag(keywords, setKeywords, keywordInput, setKeywordInput)}
          onRemove={(t) => removeTag(keywords, setKeywords, t)}
          placeholder="如：深度学习、图神经网络" />
      </div>

      {/* 技能标签 */}
      <div>
        <label className="block text-sm font-medium mb-2">技能标签</label>
        <TagInput tags={skills} input={skillInput} onInputChange={setSkillInput}
          onAdd={() => addTag(skills, setSkills, skillInput, setSkillInput)}
          onRemove={(t) => removeTag(skills, setSkills, t)}
          placeholder="如：Python、分子模拟" />
      </div>

      {/* 学历阶段（必填） */}
      <div>
        <label className="block text-sm font-medium mb-2">
          学历阶段 <span className="text-favorite">*</span>
        </label>
        <div className="flex gap-2">
          {(['博士在读', '博士应届', '博士后'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDegree(d)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                degree === d
                  ? 'border-brand bg-brand/10 text-brand font-medium'
                  : 'border-border text-secondary hover:border-foreground'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 发表概况 */}
      <div>
        <label className="block text-sm font-medium mb-2">发表概况</label>
        <textarea
          value={pubSummary}
          onChange={(e) => setPubSummary(e.target.value)}
          placeholder='如："SCI一区3篇，二区5篇，EI 2篇"'
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand resize-none"
        />
      </div>

      {/* 毕业院校 + 专业 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">毕业院校</label>
          <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="如：浙江大学"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">专业</label>
          <input type="text" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="如：计算机科学与技术"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand" />
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid}
        className="w-full py-2.5 text-sm font-medium bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        下一步
      </button>
    </form>
  );
}

function TagInput({ tags, input, onInputChange, onAdd, onRemove, placeholder }: {
  tags: string[]; input: string; onInputChange: (v: string) => void;
  onAdd: () => void; onRemove: (t: string) => void; placeholder: string;
}) {
  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand"
        />
        <button type="button" onClick={onAdd} className="px-3 py-1.5 text-sm bg-surface rounded-lg hover:bg-border transition-colors">添加</button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((t) => (
            <span key={t} className="px-2 py-0.5 text-xs bg-brand/10 text-brand rounded-lg flex items-center gap-1">
              {t}
              <button type="button" onClick={() => onRemove(t)} className="hover:text-favorite">×</button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
