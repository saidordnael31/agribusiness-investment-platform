import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Agrinvest</h1>
          </Link>
        </div>

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

        </div>
      </div>
    </div>
  )
}
