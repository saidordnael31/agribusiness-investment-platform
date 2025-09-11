import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Shield, BarChart3, Users, Calendar, FileText } from "lucide-react"

const marketData = [
  { name: "Selic/Tesouro", min: 0.8, max: 1.0, avg: 0.9 },
  { name: "CDBs/Fundos RF", min: 1.0, max: 1.2, avg: 1.1 },
  { name: "Fundos Multi", min: 1.5, max: 2.0, avg: 1.75 },
  { name: "Clube Akintec", min: 2.5, max: 4.0, avg: 3.25 },
]

const highlights = {
  opsAtivas: 18,
  volume30d: 12800000,
  proj: {
    "12m": { conservador: 1.8, base: 2.6, otimista: 3.2 },
    "24m": { conservador: 2.1, base: 3.1, otimista: 3.9 },
    "36m": { conservador: 2.4, base: 3.4, otimista: 4.2 },
  },
}

export default function HomePage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/akintec/30min"

  return (
    <div className="min-h-screen bg-background">
      <section className="pt-16 pb-24 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            Clube Privado de Investimentos do Agronegócio
          </h1>
          <div className="space-y-4 mb-8 max-w-3xl mx-auto">
            <p className="text-xl text-muted-foreground text-pretty">
              Oportunidade exclusiva para convidados com retorno acima da média de mercado.
            </p>
            <p className="text-lg text-muted-foreground text-pretty">
              Operações reais de antecipação de recebíveis do agro brasileiro, com governança e transparência.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Badge variant="outline" className="px-4 py-2 bg-background text-foreground border-border">
              <Shield className="w-4 h-4 mr-2" />
              Estrutura privada auditada
            </Badge>
            <Badge variant="outline" className="px-4 py-2 bg-background text-foreground border-border">
              <TrendingUp className="w-4 h-4 mr-2" />
              Aportes a partir de R$ 5.000
            </Badge>
            <Badge variant="outline" className="px-4 py-2 bg-background text-foreground border-border">
              <Users className="w-4 h-4 mr-2" />
              Exclusivo por indicação
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href={calendlyUrl} target="_blank" rel="noopener noreferrer">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent" asChild>
              <a href="/login">Sou Distribuidor</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-card-foreground mb-12">
            Comparativo de Mercado (média mensal)
          </h2>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {marketData.map((item) => (
                <div key={item.name} className="flex justify-between items-center p-4 bg-background rounded-lg">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {item.min}% - {item.max}%
                    </span>
                    <span className="font-bold text-primary text-lg">{item.avg}% a.m.</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center mt-6">
              Rentabilidade ALVO/ESPERADA, não garantida. Varia conforme ticket, prazo e perfil do investidor.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Diferenciais Competitivos</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Estrutura Privada Auditada</CardTitle>
                <CardDescription>Governança independente com relatórios periódicos.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Transparência & Relatórios</CardTitle>
                <CardDescription>Painel com operações, métricas e acompanhamento mensal.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Impacto Real no Agro</CardTitle>
                <CardDescription>
                  Antecipação de recebíveis para agricultores familiares; revenda a compradores AAA.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-card-foreground mb-12">
            Informações de Mercado, Operações e Projeções
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-primary">{highlights.opsAtivas}</CardTitle>
                <CardDescription>Operações em curso</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-primary">
                  R$ {(highlights.volume30d / 1000000).toFixed(1)}M
                </CardTitle>
                <CardDescription>Volume financiado (30 dias)</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg font-bold text-primary">Projeções</CardTitle>
                <CardDescription>Rentabilidade alvo (% a.m.)</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">Cenários de Projeção (% a.m. alvo/esperado)</h3>
            <div className="space-y-4">
              {Object.entries(highlights.proj).map(([periodo, valores]) => (
                <div key={periodo} className="bg-background p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{periodo}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-muted-foreground">{valores.conservador}%</div>
                      <div className="text-xs">Conservador</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-primary">{valores.base}%</div>
                      <div className="text-xs">Base</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{valores.otimista}%</div>
                      <div className="text-xs">Otimista</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Como Funciona</h2>
          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Indicação por distribuidor credenciado</h3>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Reunião de qualificação (Calendly)</h3>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Proposta personalizada (ticket e prazo)</h3>
              </div>
            </div>

            <div className="text-center mt-8">
              <Button size="lg" asChild>
                <a href={calendlyUrl} target="_blank" rel="noopener noreferrer">
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar Reunião
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-card border-t border-border py-8 px-4">
        <div className="container mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800 leading-relaxed">
                Este produto NÃO é um FIDC regulado pela CVM. Trata-se de um Clube de Investimento Privado, restrito a
                participantes convidados e qualificados, com base em contratos civis de sociedade em conta de
                participação. Rentabilidade apresentada é alvo/esperada, não garantida. Há riscos de mercado, crédito e
                liquidez. Resgates e liquidez respeitam prazos contratuais.
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">© 2024 Akintec Platform. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
