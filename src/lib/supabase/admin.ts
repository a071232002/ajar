import { createClient } from "@supabase/supabase-js";

/**
 * Service role client——只在伺服端（API route）使用，繞過 RLS。
 * 金鑰只存在伺服器環境變數，永不進前端 bundle。
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
