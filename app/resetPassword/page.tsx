import { ResetPasswordForm } from "../../components/auth/reset-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordPage() {
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
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-xl sm:text-2xl lg:text-3xl leading-tight">Redefinir Senha</CardTitle>
            <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
              Digite o email associado à sua conta para receber instruções de redefinição de senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResetPasswordForm />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/80 mt-4">
          Lembrou da senha?{" "}
          <Link href="/login" className="text-[#00BC6E] hover:underline font-semibold">
            Voltar ao Login
          </Link>
        </p>
      </div>
    </div>
  )
}
