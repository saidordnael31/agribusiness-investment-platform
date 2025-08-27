import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Shield, Calculator } from "lucide-react"
import { Disclaimers } from "@/components/compliance/disclaimers"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-6 text-balance">
            Clube de Investimentos Privado do Agronegócio
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-pretty">
            Oportunidade Premium para Investidores Qualificados. Um veículo privado de antecipação de recebíveis que
            financia a agricultura familiar brasileira, com revenda garantida para compradores AAA nacionais e
            internacionais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?type=investor">
              <Button size="lg" className="w-full sm:w-auto">
                Sou Investidor
              </Button>
            </Link>
            <Link href="/register?type=distributor">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Sou Distribuidor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-card-foreground mb-12">Diferenciais Competitivos</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Estrutura Privada Auditada</CardTitle>
                <CardDescription>
                  Transparência e controles de governança com auditoria independente CLA Global
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Rentabilidade Premium</CardTitle>
                <CardDescription>
                  3% ao mês (Cota Sênior) e 3,5% ao mês (Cota Subordinada) com liquidez D+2
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Calculator className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Comissão Agressiva</CardTitle>
                <CardDescription>3% ao mês recorrente + bônus escalonado para distribuidores</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Investment Options */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">Estrutura e Rentabilidade</h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">Cota Sênior</CardTitle>
                <CardDescription>Perfil conservador com prioridade nos pagamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Rentabilidade alvo:</span>
                    <span className="font-bold text-primary">3% ao mês</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resgate:</span>
                    <span className="font-bold">D+2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aporte mínimo:</span>
                    <span className="font-bold">R$ 5.000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-secondary">Cota Subordinada</CardTitle>
                <CardDescription>Perfil arrojado com maior potencial de retorno</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Rentabilidade alvo:</span>
                    <span className="font-bold text-secondary">3,5% ao mês</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resgate:</span>
                    <span className="font-bold">D+2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aporte mínimo:</span>
                    <span className="font-bold">R$ 5.000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Disclaimers variant="footer" />

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">© 2024 Agroderi Platform. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
