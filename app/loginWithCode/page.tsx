import { LoginWithCodeForm } from "@/components/auth/login-with-code-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function LoginWithCodePage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative password-reset-page"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Overlay escuro para melhor contraste */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Formulário centralizado */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <Card className="bg-[#D9D9D9] border-0 w-full" style={{ borderRadius: '15px' }}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-xl sm:text-2xl lg:text-3xl leading-tight">Entrar com Código</CardTitle>
            <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
              Digite seu email para receber um código de verificação
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <LoginWithCodeForm />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/80 mt-4">
          Prefere usar senha?{" "}
          <Link href="/login" className="text-[#00BC6E] hover:underline font-semibold">
            Fazer login tradicional
          </Link>
        </p>
      </div>
    </div>
  )
}






