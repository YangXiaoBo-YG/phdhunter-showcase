/**
 * 编制类型关键词识别
 */
import type { BianzhiType } from '@/types';

// 按优先级排列的识别规则（先匹配到的优先）
const BIANZHI_RULES: { pattern: RegExp; type: BianzhiType }[] = [
  { pattern: /事业编制|事业编|纳入编制|入编|占编/, type: '事业编制' },
  { pattern: /备案制|备案管理/, type: '备案制' },
  { pattern: /人事代理/, type: '人事代理' },
  { pattern: /合同制|合同聘用|劳动合同|聘用合同|企业编/, type: '合同制' },
];

// 辅助线索（优先级低，仅在主规则未命中时参考）
const BIANZHI_HINTS: { pattern: RegExp; type: BianzhiType }[] = [
  { pattern: /非升即走|预聘[—-]长聘|tenure.?track/i, type: '备案制' },
  { pattern: /年薪制(?!.*编制)/, type: '合同制' },
];

/**
 * 从文本中识别编制类型
 * @param text 岗位描述或公告全文
 * @returns 编制类型，无法识别时返回 "未标注"
 */
export function detectBianzhiType(text: string): BianzhiType {
  if (!text) return '未标注';

  // 第一轮：主规则
  for (const rule of BIANZHI_RULES) {
    if (rule.pattern.test(text)) {
      return rule.type;
    }
  }

  // 第二轮：辅助线索
  for (const hint of BIANZHI_HINTS) {
    if (hint.pattern.test(text)) {
      return hint.type;
    }
  }

  return '未标注';
}

/**
 * 批量识别，返回文本中所有命中的编制类型（用于一个公告含多种岗位的场景）
 */
export function detectAllBianzhiTypes(text: string): BianzhiType[] {
  if (!text) return ['未标注'];

  const found: BianzhiType[] = [];
  for (const rule of BIANZHI_RULES) {
    if (rule.pattern.test(text)) {
      found.push(rule.type);
    }
  }
  return found.length > 0 ? found : ['未标注'];
}
