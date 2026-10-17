import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/v1/jobs/:id — 岗位详情
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, organization, department, location_city, bianzhi_type, position_type, institution_type, degree_requirement, discipline, research_direction, salary_range, benefits, source_url, publish_date, deadline, crawl_date, status, raw_description, structured_tags, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
