import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative password-reset-page"
    >
      {/* Overlay escuro para melhor contraste */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Formulário centralizado */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <Card className="bg-[#D9D9D9] border-0 w-full" style={{ borderRadius: '15px' }}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-xl sm:text-2xl lg:text-3xl leading-tight">Entre na Plataforma</CardTitle>
            <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">Acesse sua conta e gerencie seus investimentos</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
