"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, User, LogOut, Calculator } from "lucide-react"
import { AdvancedCalculator } from "./advanced-calculator"
import { ComparisonCalculator } from "./comparison-calculator"
import { ScenarioAnalysis } from "./scenario-analysis"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  name: string
  email: string
  type: string
}

export function CommissionCalculator() {
  const [user, setUser] = useState<UserData | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    })
    window.location.href = "/"
  }

  const handleBackToDashboard = () => {
    router.push(user?.type === "distributor" ? "/distributor" : "/investor")
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <Calculator className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-card-foreground">Calculadora de Comissões</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user.name}</span>
                <Badge variant="secondary">{user.type === "distributor" ? "Distribuidor" : "Investidor"}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Calculadora Avançada de Comissões</h2>
          <p className="text-muted-foreground">
            Simule diferentes cenários de captação e calcule suas comissões na plataforma
          </p>
        </div>

        {/* Commission Structure Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estrutura de Comissões</CardTitle>
            <CardDescription>Entenda como funcionam as comissões e bônus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">Comissão Base</h4>
                <p className="text-2xl font-bold text-primary">3%</p>
                <p className="text-xs text-muted-foreground">ao mês sobre valor investido</p>
              </div>

              <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                <h4 className="font-semibold text-secondary mb-2">Divisão</h4>
                <p className="text-lg font-bold text-secondary">70% / 30%</p>
                <p className="text-xs text-muted-foreground">Assessor / Escritório</p>
              </div>

              <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                <h4 className="font-semibold text-accent mb-2">Bônus Meta 1</h4>
                <p className="text-lg font-bold text-accent">+1%</p>
                <p className="text-xs text-muted-foreground">R$ 500k captados</p>
              </div>

              <div className="p-4 bg-muted rounded-lg border">
                <h4 className="font-semibold mb-2">Bônus Meta 2</h4>
                <p className="text-lg font-bold">+2%</p>
                <p className="text-xs text-muted-foreground">R$ 1M captados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculator Tabs */}
        <Tabs defaultValue="advanced" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="advanced">Calculadora Avançada</TabsTrigger>
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
            <TabsTrigger value="scenarios">Análise de Cenários</TabsTrigger>
          </TabsList>

          <TabsContent value="advanced">
            <AdvancedCalculator />
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonCalculator />
          </TabsContent>

          <TabsContent value="scenarios">
            <ScenarioAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
