import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Shield, TrendingUp, Users, Building } from "lucide-react"

export default function DocumentsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Documentos Institucionais</h1>
        <p className="text-muted-foreground text-lg">
          Acesse todos os documentos oficiais, relatórios de auditoria e lâminas de investimento do FIDC Agroderi.
        </p>
      </div>

      {/* Documentos de Compliance */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Documentos de Compliance
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Regulamento do Fundo
              </CardTitle>
              <CardDescription>Documento oficial registrado na CVM</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Política de Investimentos
              </CardTitle>
              <CardDescription>Diretrizes e critérios de investimento</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Código de Ética
              </CardTitle>
              <CardDescription>Princípios e condutas da gestão</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Relatórios de Auditoria */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          Relatórios de Auditoria
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Auditoria CLA Global - 2024</CardTitle>
              <CardDescription>Relatório anual de auditoria independente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Data:</span>
                <span className="font-medium">Dezembro 2024</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <span className="font-medium text-green-600">Aprovado</span>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download Relatório
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auditoria CLA Global - 2023</CardTitle>
              <CardDescription>Relatório anual de auditoria independente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Data:</span>
                <span className="font-medium">Dezembro 2023</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <span className="font-medium text-green-600">Aprovado</span>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download Relatório
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Lâminas de Investimento */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Lâminas de Investimento
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cota Sênior</CardTitle>
              <CardDescription>Informações detalhadas sobre a cota sênior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Rentabilidade alvo:</span>
                  <span className="font-medium text-primary">3% a.m.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Perfil:</span>
                  <span className="font-medium">Conservador</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Liquidez:</span>
                  <span className="font-medium">D+2</span>
                </div>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download Lâmina
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cota Subordinada</CardTitle>
              <CardDescription>Informações detalhadas sobre a cota subordinada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Rentabilidade alvo:</span>
                  <span className="font-medium text-secondary">3,5% a.m.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Perfil:</span>
                  <span className="font-medium">Arrojado</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Liquidez:</span>
                  <span className="font-medium">D+2</span>
                </div>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download Lâmina
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Documentos para Distribuidores */}
      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Documentos para Distribuidores
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Manual do Distribuidor
              </CardTitle>
              <CardDescription>Guia completo para distribuidores</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tabela de Comissões
              </CardTitle>
              <CardDescription>Estrutura detalhada de comissões</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Material de Vendas
              </CardTitle>
              <CardDescription>Apresentações e materiais promocionais</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download ZIP
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
