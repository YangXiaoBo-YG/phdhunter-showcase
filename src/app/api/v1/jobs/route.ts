import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/v1/jobs — 岗位列表（筛选+分页+搜索）
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize')) || 20));
  const offset = (page - 1) * pageSize;

  // 筛选参数
  const bianzhiType = params.get('bianzhi_type');
  const positionType = params.get('position_type');
  const institutionType = params.get('institution_type');
  const city = params.get('city');
  const discipline = params.get('discipline');
  const q = params.get('q');

  // 构建查询
  let query = supabase
    .from('jobs')
    .select('id, title, organization, department, location_city, bianzhi_type, position_type, institution_type, degree_requirement, discipline, salary_range, benefits, source_url, publish_date, deadline, status, created_at', { count: 'exact' })
    .eq('status', 'active')
    .order('publish_date', { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  // 应用筛选
  if (bianzhiType) {
    query = query.eq('bianzhi_type', bianzhiType);
  }
  if (positionType) {
    query = query.eq('position_type', positionType);
  }
  if (institutionType) {
    query = query.eq('institution_type', institutionType);
  }
  if (city) {
    query = query.eq('location_city', city);
  }
  if (discipline) {
    query = query.contains('discipline', [discipline]);
  }

  // 搜索：title + organization 模糊匹配
  if (q) {
    query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  });
}
