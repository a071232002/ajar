import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 機器端點沒有 session，要自己決定這筆資料算誰的。
 * 明確帶 user_id 就用它；沒帶且全站只有一個使用者，就補上那一個
 * （單人時期的方便措施，多人時排程必須明講）。
 */
export async function resolveOwner(
  db: SupabaseClient,
  explicit?: string,
): Promise<{ userId: string } | { error: string }> {
  if (explicit) return { userId: explicit };

  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 2 });
  if (error) return { error: error.message };

  const users = data.users ?? [];
  if (users.length === 0) return { error: "系統還沒有任何使用者" };
  if (users.length > 1) {
    return { error: "有多個使用者，請在 body 帶上 user_id 指明這筆資料屬於誰" };
  }
  return { userId: users[0].id };
}
