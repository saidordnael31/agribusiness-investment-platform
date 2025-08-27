import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, User, Users, Shield } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Akintec Platform</h1>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Entrar na Plataforma</CardTitle>
                <CardDescription>Acesse sua conta para gerenciar seus investimentos</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Cadastre-se aqui
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Contas de Demonstração</h3>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">Investidor</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Acesso ao dashboard de investimentos, simuladores e histórico
                </p>
                <div className="bg-white p-3 rounded border text-sm">
                  <p>
                    <strong>Email:</strong> investidor@exemplo.com
                  </p>
                  <p>
                    <strong>Senha:</strong> 123456
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Distribuidor/Assessor</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Acesso a comissões, clientes, calculadoras e bonificações
                </p>
                <div className="bg-white p-3 rounded border text-sm">
                  <p>
                    <strong>Email:</strong> distributor@exemplo.com
                  </p>
                  <p>
                    <strong>Senha:</strong> 123456
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-base">Administrador</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Configuração de taxas, promoções e gestão da plataforma</p>
                <div className="bg-white p-3 rounded border text-sm">
                  <p>
                    <strong>Link:</strong>{" "}
                    <Link href="/admin/login" className="text-purple-600 hover:underline">
                      /admin/login
                    </Link>
                  </p>
                  <p>
                    <strong>Email:</strong> admin@akintec.com
                  </p>
                  <p>
                    <strong>Senha:</strong> demo123
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
