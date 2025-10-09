import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Interceptar código de autenticação do Supabase na página principal
  if (pathname === "/" && searchParams.has("code")) {
    const code = searchParams.get("code")
    const type = searchParams.get("type")
    
    console.log("Middleware - Interceptando magic link:", { code, type, pathname })
    
    // Se for um magic link, redirecionar para o callback
    if (code && type === "magiclink") {
      const callbackUrl = new URL("/auth/callback", request.url)
      callbackUrl.searchParams.set("code", code)
      callbackUrl.searchParams.set("type", type)
      
      console.log("Middleware - Redirecionando para:", callbackUrl.toString())
      
      // Detectar se é dispositivo móvel
      const userAgent = request.headers.get("user-agent") || ""
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      
      if (isMobile) {
        // Para mobile, usar window.location.href para forçar redirecionamento
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Redirecionando...</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px 20px;
                  background: #f8f9fa;
                }
                .spinner {
                  border: 4px solid #f3f3f3;
                  border-top: 4px solid #10b981;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  animation: spin 1s linear infinite;
                  margin: 20px auto;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </head>
            <body>
              <h2>🔐 Processando Login</h2>
              <div class="spinner"></div>
              <p>Redirecionando para sua conta...</p>
              <script>
                // Forçar redirecionamento para mobile
                window.location.href = "${callbackUrl.toString()}";
                
                // Fallback após 3 segundos
                setTimeout(() => {
                  window.location.href = "${callbackUrl.toString()}";
                }, 3000);
              </script>
            </body>
          </html>
        `
        
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html",
          },
        })
      }
      
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
