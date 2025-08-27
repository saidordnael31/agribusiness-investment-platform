"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface DisclaimersProps {
  variant?: "default" | "compact" | "footer"
  className?: string
}

export function Disclaimers({ variant = "default", className = "" }: DisclaimersProps) {
  const disclaimers = [
    "Este produto NÃO é um FIDC regulado pela CVM.",
    "Trata-se de um Clube de Investimento Privado, baseado em contratos civis de sociedade em conta de participação.",
    "Rentabilidade apresentada é alvo/esperada, não garantida. Há riscos de mercado, crédito e liquidez.",
    "Investimento restrito a participantes convidados e qualificados por indicação. Não se trata de oferta pública.",
    "Resgates e liquidez respeitam prazos contratuais.",
    "Auditoria, relatórios mensais e controles de governança são disponibilizados para transparência, mas não substituem a regulamentação da CVM.",
  ]

  if (variant === "footer") {
    return (
      <div className={`bg-muted/50 border-t border-border py-6 px-4 ${className}`}>
        <div className="container mx-auto">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <h4 className="font-semibold text-foreground">Avisos Importantes</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {disclaimers.map((disclaimer, index) => (
              <p key={index}>• {disclaimer}</p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <Card className={`border-amber-200 bg-amber-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-2">Avisos Importantes</h4>
              <ul className="space-y-1 text-xs text-amber-700">
                {disclaimers.slice(0, 3).map((disclaimer, index) => (
                  <li key={index}>• {disclaimer}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-amber-200 bg-amber-50 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-4">Avisos Importantes - Clube de Investimentos Privado</h4>
            <ul className="space-y-2 text-sm text-amber-700">
              {disclaimers.map((disclaimer, index) => (
                <li key={index}>• {disclaimer}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
