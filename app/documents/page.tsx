"use client";

import type React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  Shield,
  TrendingUp,
  Building,
  Upload,
  Plus,
  UserCheck,
  Briefcase,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  name: string;
  email: string;
  user_type: string;
  role?: string;
  office_id?: string;
}

export default function DocumentsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    }
  }, []);

  const isAdmin = user?.user_type === "admin";
  const isOffice =
    user?.user_type === "distributor" && user?.role === "escritorio";
  const isManager =
    user?.user_type === "distributor" && user?.role === "gestor";
  const isLeader = user?.user_type === "distributor" && user?.role === "lider";
  const isAdvisor =
    user?.user_type === "distributor" && user?.role === "assessor";
  const isInvestor = user?.user_type === "investor";

  const canAccessDistributorDocs =
    isAdmin || isOffice || isManager || isLeader || isAdvisor;
  const canAccessOfficeDocs = isAdmin || isOffice;
  const canAccessManagerDocs = isAdmin || isOffice || isManager;
  const canAccessLeaderDocs = isAdmin || isOffice || isManager || isLeader;
  const canAccessAdvisorDocs =
    isAdmin || isOffice || isManager || isLeader || isAdvisor;

  const handleDownload = (fileName: string) => {
    toast({
      title: "Download iniciado",
      description: `Baixando ${fileName}...`,
    });

    // LOGICA PARA DOWNLOAD DO ARQUIVO
    // @assets\pdf\Contrato_SCP_Akintec_Investidor.pdf
    const fileUrl = '/pdf/' + fileName;

    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      toast({
        title: "Upload realizado",
        description: `${files.length} arquivo(s) enviado(s) com sucesso.`,
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Documentos Institucionais
        </h1>
        <p className="text-muted-foreground text-lg">
          Acesse todos os documentos oficiais, relatórios de auditoria e lâminas
          de investimento do Clube de Investimentos Privado Agroderi.
        </p>
        {user && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Logado como:{" "}
              <span className="font-medium text-foreground">{user.name}</span> -
              <span className="font-medium text-primary ml-1">
                {isAdmin && "Administrador"}
                {isOffice && "Escritório"}
                {isManager && "Gestor"}
                {isLeader && "Líder"}
                {isAdvisor && "Assessor"}
                {isInvestor && "Investidor"}
              </span>
            </p>
          </div>
        )}
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
                <CardDescription>
                  Adicione novos documentos em formato ZIP ou PDF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
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
                <div className="text-xs text-muted-foreground">
                  Formatos aceitos: PDF, ZIP (máx. 50MB)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos Recentes</CardTitle>
                <CardDescription>
                  Últimos documentos adicionados
                </CardDescription>
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
          Minuta do Contrato SCP do Investidor
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Minuta do Contrato SCP do Investidor
              </CardTitle>
              <CardDescription>
                Documento oficial do clube de investimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleDownload("Contrato_SCP_Akintec_Investidor.pdf")}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

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
              <CardDescription>
                Documento oficial do clube de investimentos
              </CardDescription>
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
              <CardDescription>
                Diretrizes e critérios de investimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() =>
                  handleDownload("Politica_Investimentos_Agroderi.pdf")
                }
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
              <CardDescription>
                Relatório anual de auditoria independente
              </CardDescription>
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
                onClick={() =>
                  handleDownload("Auditoria_Independente_2024.pdf")
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Download Relatório
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auditoria Independente - 2023</CardTitle>
              <CardDescription>
                Relatório anual de auditoria independente
              </CardDescription>
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
                onClick={() =>
                  handleDownload("Auditoria_Independente_2023.pdf")
                }
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
              <CardDescription>
                Informações detalhadas sobre a cota sênior
              </CardDescription>
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
                onClick={() =>
                  handleDownload("Lamina_Cota_Senior_Agroderi.pdf")
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Download Lâmina
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cota Subordinada</CardTitle>
              <CardDescription>
                Informações detalhadas sobre a cota subordinada
              </CardDescription>
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
                onClick={() =>
                  handleDownload("Lamina_Cota_Subordinada_Agroderi.pdf")
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Download Lâmina
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Documentos para Escritórios */}
      {canAccessOfficeDocs && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Documentos para Escritórios
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manual do Escritório
                </CardTitle>
                <CardDescription>
                  Guia completo para gestão de escritórios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    handleDownload("Manual_Escritorio_Agroderi.pdf")
                  }
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
                  Contratos de Parceria
                </CardTitle>
                <CardDescription>
                  Modelos de contratos para assessores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    handleDownload("Contratos_Parceria_Agroderi.zip")
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatórios Gerenciais
                </CardTitle>
                <CardDescription>
                  Templates para relatórios de performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    handleDownload("Templates_Relatorios_Agroderi.zip")
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Documentos para Gestores */}
      {canAccessManagerDocs && !isOffice && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Documentos para Gestores
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manual do Gestor
                </CardTitle>
                <CardDescription>
                  Guia para gestão de equipes e metas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Manual_Gestor_Akintec.pdf")}
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
                  Relatórios de Performance
                </CardTitle>
                <CardDescription>
                  Templates para acompanhamento de equipes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    handleDownload("Relatorios_Performance_Gestor.zip")
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Estrutura de Comissões
                </CardTitle>
                <CardDescription>
                  Tabela detalhada de comissões por hierarquia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    handleDownload("Estrutura_Comissoes_Akintec.pdf")
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Documentos para Líderes */}
      {canAccessLeaderDocs && !isOffice && !isManager && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Documentos para Líderes
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manual de Liderança
                </CardTitle>
                <CardDescription>
                  Guia para liderança de assessores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Manual_Lideranca_Akintec.pdf")}
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
                  Metas e Incentivos
                </CardTitle>
                <CardDescription>Sistema de metas para equipes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Metas_Incentivos_Lider.pdf")}
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
                  Treinamento de Equipes
                </CardTitle>
                <CardDescription>
                  Materiais para capacitação de assessores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    handleDownload("Treinamento_Equipes_Lider.zip")
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Documentos para Assessores */}
      {canAccessAdvisorDocs && !isOffice && !isManager && !isLeader && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Documentos para Assessores
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manual do Assessor
                </CardTitle>
                <CardDescription>
                  Guia completo para assessores Akintec
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Manual_Assessor_Akintec.pdf")}
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
                <CardDescription>
                  Estrutura detalhada de comissões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    handleDownload("Tabela_Comissoes_Agroderi.pdf")
                  }
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
                <CardDescription>
                  Apresentações e materiais promocionais
                </CardDescription>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Scripts de Vendas
                </CardTitle>
                <CardDescription>
                  Roteiros para abordagem de clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Scripts_Vendas_Agroderi.pdf")}
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
                  Treinamentos
                </CardTitle>
                <CardDescription>
                  Materiais de capacitação e treinamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleDownload("Treinamentos_Agroderi.zip")}
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
  );
}
