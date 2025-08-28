import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle, Mail } from "lucide-react"

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Cadastro Realizado!</CardTitle>
          <CardDescription>Sua conta foi criada com sucesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Verifique seu email</p>
              <p className="text-blue-700">Enviamos um link de confirmação para ativar sua conta.</p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Após confirmar seu email, você poderá fazer login na plataforma.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Ir para Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
