"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Shield, TrendingUp, Users, Building, Upload, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  name: string
  email: string
  type: string
}

export default function DocumentsPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        setUser(JSON.parse(userStr))
      }
    }
  }, [])

  const isAdmin = user?.type === "admin"
  const isDistributor = user?.type === "distributor"
  const canAccessDistributorDocs = isAdmin || isDistributor

  const handleDownload = (fileName: string) => {
    toast({
      title: "Download iniciado",
      description: `Baixando ${fileName}...`,
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      toast({
        title: "Upload realizado",
        description: `${files.length} arquivo(s) enviado(s) com sucesso.`,
      })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Documentos Institucionais</h1>
        <p className="text-muted-foreground text-lg">
          Acesse todos os documentos oficiais, relatórios de auditoria e lâminas de investimento do Clube de
          Investimentos Privado Agroderi.
        </p>
      </div>

      {/* Admin Upload Section */}
      {isAdmin && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" />
            Gerenciar Documentos
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Upload de Documentos
                </CardTitle>
                <CardDescription>Adicione novos documentos em formato ZIP ou PDF</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Arraste arquivos aqui ou clique para selecionar</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.zip"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild>
                      <span>Selecionar Arquivos</span>
                    </Button>
                  </label>
                </div>
                <div className="text-xs text-muted-foreground">Formatos aceitos: PDF, ZIP (máx. 50MB)</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos Recentes</CardTitle>
                <CardDescription>Últimos documentos adicionados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>regulamento_2024.pdf</span>
                    <span className="text-muted-foreground">Hoje</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>materiais_vendas.zip</span>
                    <span className="text-muted-foreground">Ontem</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>auditoria_2024.pdf</span>
                    <span className="text-muted-foreground">2 dias</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

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
                Regulamento do Clube
              </CardTitle>
              <CardDescription>Documento oficial do clube de investimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Regulamento_Clube_Agroderi.pdf")}
              >
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
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Politica_Investimentos_Agroderi.pdf")}
              >
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
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Codigo_Etica_Agroderi.pdf")}
              >
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
              <CardTitle>Auditoria Independente - 2024</CardTitle>
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
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Auditoria_Independente_2024.pdf")}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Relatório
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auditoria Independente - 2023</CardTitle>
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
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Auditoria_Independente_2023.pdf")}
              >
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
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Lamina_Cota_Senior_Agroderi.pdf")}
              >
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
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Lamina_Cota_Subordinada_Agroderi.pdf")}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Lâmina
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {canAccessDistributorDocs && (
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
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Manual_Distribuidor_Agroderi.pdf")}
                >
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
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Tabela_Comissoes_Agroderi.pdf")}
                >
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
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Material_Vendas_Agroderi.zip")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  )
}
