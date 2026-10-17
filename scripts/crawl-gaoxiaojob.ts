/**
 * 高校人才网爬虫测试脚本
 * 运行：npx tsx scripts/crawl-gaoxiaojob.ts
 */
import { runPipeline } from '../src/lib/crawler/pipeline';
import { gaoxiaojobSource } from '../src/lib/crawler/sources/gaoxiaojob';

async function main() {
  console.log('========================================');
  console.log('高校人才网浙江板块爬虫');
  console.log('========================================\n');

  const report = await runPipeline(gaoxiaojobSource);

  console.log('\n========================================');
  console.log('运行报告:');
  console.log(`  数据源: ${report.source}`);
  console.log(`  爬取数量: ${report.crawled}`);
  console.log(`  入库数量: ${report.inserted}`);
  console.log(`  跳过重复: ${report.skipped_duplicate}`);
  console.log(`  错误数量: ${report.errors.length}`);
  console.log(`  耗时: ${(report.duration_ms / 1000).toFixed(1)}s`);
  if (report.errors.length > 0) {
    console.log('  错误详情:');
    report.errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log('========================================');
}

main().catch(console.error);
