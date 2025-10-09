import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Interceptar código de autenticação do Supabase na página principal
  if (pathname === "/" && searchParams.has("code")) {
    const code = searchParams.get("code")
    const type = searchParams.get("type")
    
    // Se for um magic link, redirecionar para o callback
    if (code && type === "magiclink") {
      const callbackUrl = new URL("/auth/callback", request.url)
      callbackUrl.searchParams.set("code", code)
      callbackUrl.searchParams.set("type", type)
      
      return NextResponse.redirect(callbackUrl)
    }
  }

  // Bloquear apenas rotas específicas de cadastro de investidores
  if (pathname.startsWith("/cadastro") || pathname.startsWith("/investor/signup")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
