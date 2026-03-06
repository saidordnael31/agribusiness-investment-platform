import { Mail, Phone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contatos - Agrinvest",
  description: "Entre em contato conosco",
}

export default function ContatosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#01223F] via-[#003562] to-[#01223F]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-urbanist">
              Entre em Contato
            </h1>
            <p className="text-xl text-white/80 font-ibm-plex-sans">
              Estamos aqui para ajudar você. Entre em contato através dos canais abaixo.
            </p>
          </div>

          {/* Cards de Contato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Email */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Mail className="w-6 h-6 text-blue-400" />
                  </div>
                  <CardTitle className="text-white">E-mail</CardTitle>
                </div>
                <CardDescription className="text-white/70">
                  Envie-nos um e-mail e responderemos o mais breve possível
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href="mailto:luiz.fortuna@akintec.com"
                  className="text-lg font-semibold text-blue-400 hover:text-blue-300 transition-colors break-all"
                >
                  luiz.fortuna@akintec.com
                </a>
                <div className="mt-4">
                  <Button
                    asChild
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <a href="mailto:luiz.fortuna@akintec.com">
                      Enviar E-mail
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Telefone */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Phone className="w-6 h-6 text-green-400" />
                  </div>
                  <CardTitle className="text-white">Telefone</CardTitle>
                </div>
                <CardDescription className="text-white/70">
                  Fale conosco pelo telefone durante o horário comercial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href="tel:+5511993338228"
                  className="text-lg font-semibold text-green-400 hover:text-green-300 transition-colors"
                >
                  (11) 9 9333-8228
                </a>
                <div className="mt-4">
                  <Button
                    asChild
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <a href="tel:+5511993338228">
                      Ligar Agora
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informações Adicionais */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Horário de Atendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-white/80">
                <p className="font-medium">Segunda a Sexta: 9h às 18h</p>
                <p className="text-sm text-white/60">
                  Estamos disponíveis para atendê-lo durante o horário comercial.
                  Fora deste horário, você pode enviar um e-mail e responderemos assim que possível.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Botão de Voltar */}
          <div className="mt-8 text-center">
            <Button
              asChild
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Link href="/">
                Voltar para a Página Inicial
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

