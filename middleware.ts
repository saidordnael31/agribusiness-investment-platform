import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bloquear rotas de cadastro público para investidores
  if (pathname.startsWith("/register") || pathname.startsWith("/cadastro") || pathname.startsWith("/investor/signup")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
