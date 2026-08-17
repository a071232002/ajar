import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** CRON_SECRET 鑑權的機器端點，不走使用者 session */
const MACHINE_PATHS = [
  "/api/lesson-brief",
  "/api/lesson",
  "/api/plan",
  "/api/revalidate",
];

/** 不需要登入就能看的頁面 */
const PUBLIC_PATHS = ["/login", "/guest"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (MACHINE_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() 每次都要打一趟 Supabase Auth；getClaims() 用本機快取的 JWKS 驗簽，
  // 省掉每次導覽的一個網路來回。代價：登出後的 token 要等自然過期才失效，
  // 單人站可以接受。
  const {
    data: claims,
  } = await supabase.auth.getClaims();
  const user = claims?.claims ?? null;

  if (!user && !PUBLIC_PATHS.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
