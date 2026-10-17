import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase 环境变量未配置');
  }
  return createClient(url, key);
}

// 延迟初始化，首次调用方法时才创建
let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = getClient();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabase as any)[prop as string];
  },
});

// 服务端专用实例
export function createServiceClient() {
  if (typeof window !== 'undefined') throw new Error('Administrative database access is server-only');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase 服务端环境变量未配置');
  }
  return createClient(url, key);
}
