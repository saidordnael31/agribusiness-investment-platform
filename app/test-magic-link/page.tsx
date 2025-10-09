"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function TestMagicLinkPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSendMagicLink = async () => {
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira um email válido.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar magic link')
      }

      toast({
        title: "Magic link enviado!",
        description: `Um link de acesso foi enviado para ${email}`,
      })
    } catch (error: any) {
      console.error('Erro ao enviar magic link:', error)
      toast({
        title: "Erro ao enviar magic link",
        description: error.message || "Não foi possível enviar o magic link.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Teste Magic Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          
          <Button 
            onClick={handleSendMagicLink}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Enviando..." : "Enviar Magic Link"}
          </Button>

          <div className="text-sm text-gray-600 text-center">
            <p>Este é um teste para verificar se o magic link está funcionando.</p>
            <p>Verifique o console do navegador para logs detalhados.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
