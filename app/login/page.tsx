import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative password-reset-page"
    >
      {/* Overlay escuro para melhor contraste */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="w-full max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Formulário */}
          <div className="space-y-6">
            <Card className="bg-[#D9D9D9] border-0" style={{ borderRadius: '15px', width: '450px' }}>
              <CardHeader className="text-center">
                <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">Entre na Plataforma</CardTitle>
                <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-lg">Acesse sua conta e gerencie seus investimentos</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>
          </div>

          {/* Imagem */}
          <div className="flex justify-center lg:justify-end" style={{ marginRight: '120px', marginTop: '30px' }}>
            <img 
              src="/images/right.png" 
              alt="Ilustração de interação com tablet" 
              style={{ width: '500px' }}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
