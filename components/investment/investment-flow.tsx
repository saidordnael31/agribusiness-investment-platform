"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ArrowLeft, User, LogOut } from "lucide-react"
import { InvestmentSelection } from "./investment-selection"
import { InvestmentConfirmation } from "./investment-confirmation"
import { InvestmentSuccess } from "./investment-success"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  name: string
  email: string
  type: string
}

export type InvestmentData = {
  quotaType: "senior" | "subordinate"
  amount: number
  expectedReturn: number
  monthlyReturn: number
}

export function InvestmentFlow() {
  const [user, setUser] = useState<UserData | null>(null)
  const [currentStep, setCurrentStep] = useState<"selection" | "confirmation" | "success">("selection")
  const [investmentData, setInvestmentData] = useState<InvestmentData | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user")
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    })
    router.push("/")
  }

  const handleInvestmentSelection = (data: InvestmentData) => {
    setInvestmentData(data)
    setCurrentStep("confirmation")
  }

  const handleConfirmInvestment = () => {
    // Simulate investment processing
    setTimeout(() => {
      setCurrentStep("success")
      toast({
        title: "Investimento realizado com sucesso!",
        description: "Seu investimento foi processado e será creditado em sua conta.",
      })
    }, 2000)
  }

  const handleBackToSelection = () => {
    setCurrentStep("selection")
    setInvestmentData(null)
  }

  const handleBackToDashboard = () => {
    router.push("/investor")
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
                <TrendingUp className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-card-foreground">Novo Investimento</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user.name}</span>
                <Badge variant="secondary">Investidor</Badge>
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
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === "selection" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm">Seleção</span>
            </div>
            <div className="w-16 h-px bg-border" />
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === "confirmation"
                    ? "bg-primary text-primary-foreground"
                    : currentStep === "success"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm">Confirmação</span>
            </div>
            <div className="w-16 h-px bg-border" />
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === "success" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </div>
              <span className="ml-2 text-sm">Concluído</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === "selection" && <InvestmentSelection onNext={handleInvestmentSelection} />}
        {currentStep === "confirmation" && investmentData && (
          <InvestmentConfirmation
            investmentData={investmentData}
            onConfirm={handleConfirmInvestment}
            onBack={handleBackToSelection}
          />
        )}
        {currentStep === "success" && investmentData && (
          <InvestmentSuccess investmentData={investmentData} onBackToDashboard={handleBackToDashboard} />
        )}
      </div>
    </div>
  )
}
