"use client"

import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface RenewalAlertDialogProps {
  investment: {
    id: string
    amount: number
    expiry_date: string
    days_until_expiry: number
    commitment_period?: number | null
    profitability_liquidity?: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onRenewalComplete?: () => void
}

export function RenewalAlertDialog({
  investment,
  open,
  onOpenChange,
  onRenewalComplete,
}: RenewalAlertDialogProps) {
  const { toast } = useToast()
  const [action, setAction] = useState<"renew" | "renew_with_new_rules" | "suggest_increase" | null>(null)
  const [additionalAmount, setAdditionalAmount] = useState<string>("")
  const [newCommitmentPeriod, setNewCommitmentPeriod] = useState<string>("")
  const [newLiquidity, setNewLiquidity] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const formattedAmount = formatCurrency(investment.amount)
  const formattedExpiryDate = new Date(investment.expiry_date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const isExpired = investment.days_until_expiry <= 0
  const currentPeriod = investment.commitment_period || 12
  const currentLiquidity = investment.profitability_liquidity || "Mensal"

  useEffect(() => {
    if (open) {
      // Resetar campos quando o dialog abrir
      setAction(null)
      setAdditionalAmount("")
      setNewCommitmentPeriod("")
      setNewLiquidity("")
    }
  }, [open])

  const handleRenew = async () => {
    if (!action) {
      toast({
        title: "Ação necessária",
        description: "Por favor, selecione uma opção de renovação",
        variant: "destructive",
      })
      return
    }

    if (action === "renew_with_new_rules") {
      if (!newCommitmentPeriod || !newLiquidity) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, selecione o período e a liquidez para renovação com novas regras",
          variant: "destructive",
        })
        return
      }
    }

    if (action === "suggest_increase") {
      const amount = parseFloat(additionalAmount.replace(/[^\d,.-]/g, "").replace(",", "."))
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, informe um valor válido para aumentar o aporte",
          variant: "destructive",
        })
        return
      }
    }

    setLoading(true)

    try {
      const response = await fetch("/api/investments/renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          investmentId: investment.id,
          action: action,
          additionalAmount:
            action === "suggest_increase"
              ? parseFloat(additionalAmount.replace(/[^\d,.-]/g, "").replace(",", "."))
              : null,
          newCommitmentPeriod: action === "renew_with_new_rules" ? Number(newCommitmentPeriod) : null,
          newLiquidity: action === "renew_with_new_rules" ? newLiquidity : null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao processar renovação")
      }

      toast({
        title: "Renovação processada",
        description: data.message || "Sua renovação foi processada com sucesso!",
      })

      onOpenChange(false)
      if (onRenewalComplete) {
        onRenewalComplete()
      }
    } catch (error) {
      console.error("Erro ao processar renovação:", error)
      toast({
        title: "Erro ao processar renovação",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setAction(null)
    setAdditionalAmount("")
    setNewCommitmentPeriod("")
    setNewLiquidity("")
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            {isExpired ? "⏰ Investimento Vencido" : "⚠️ Alerta de Renovação"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-4">
            <div>
              <p className="mb-2">
                Você tem <strong>{formattedAmount}</strong> investidos.
              </p>
              <p className="mb-2">
                Data de vencimento: <strong>{formattedExpiryDate}</strong>
              </p>
              {isExpired ? (
                <p className="text-sm text-red-600 font-semibold">
                  Seu investimento venceu há <strong>{Math.abs(investment.days_until_expiry)} dias</strong>.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Faltam aproximadamente <strong>{investment.days_until_expiry} dias</strong> para o vencimento.
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Período atual: <strong>{currentPeriod} meses</strong> | Liquidez: <strong>{currentLiquidity}</strong>
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="font-semibold mb-4">O que você deseja fazer?</p>

              <div className="space-y-3">
                <Button
                  variant={action === "renew" ? "default" : "outline"}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => setAction("renew")}
                  disabled={loading}
                >
                  <div className="flex flex-col items-start w-full">
                    <span className="font-semibold">✓ Renovar contrato</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Mesmo valor ({formattedAmount}), {currentPeriod} meses, {currentLiquidity}
                    </span>
                  </div>
                </Button>

                <Button
                  variant={action === "renew_with_new_rules" ? "default" : "outline"}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => setAction("renew_with_new_rules")}
                  disabled={loading}
                >
                  <div className="flex flex-col items-start w-full">
                    <span className="font-semibold">✓ Renovar com novas regras</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Escolha novo período e liquidez (ex: 36 meses, mensal)
                    </span>
                  </div>
                </Button>

                <Button
                  variant={action === "suggest_increase" ? "default" : "outline"}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => setAction("suggest_increase")}
                  disabled={loading}
                >
                  <div className="flex flex-col items-start w-full">
                    <span className="font-semibold">✓ Sugerir aumento de aporte</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Captação passiva - adicione mais valor ao investimento
                    </span>
                  </div>
                </Button>
              </div>

              {action === "renew_with_new_rules" && (
                <div className="mt-4 space-y-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="new-period">Novo período (meses)</Label>
                    <Select
                      value={newCommitmentPeriod}
                      onValueChange={setNewCommitmentPeriod}
                      disabled={loading}
                    >
                      <SelectTrigger id="new-period">
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 meses</SelectItem>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses</SelectItem>
                        <SelectItem value="24">24 meses</SelectItem>
                        <SelectItem value="36">36 meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-liquidity">Nova liquidez</Label>
                    <Select
                      value={newLiquidity}
                      onValueChange={setNewLiquidity}
                      disabled={loading}
                    >
                      <SelectTrigger id="new-liquidity">
                        <SelectValue placeholder="Selecione a liquidez" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                        <SelectItem value="Bienal">Bienal</SelectItem>
                        <SelectItem value="Trienal">Trienal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {action === "suggest_increase" && (
                <div className="mt-4 space-y-2 p-4 bg-muted rounded-lg">
                  <Label htmlFor="additional-amount">Valor adicional (R$)</Label>
                  <Input
                    id="additional-amount"
                    type="text"
                    placeholder="0,00"
                    value={additionalAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,.-]/g, "")
                      setAdditionalAmount(value)
                    }}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe o valor adicional que deseja adicionar ao investimento. 
                    O investimento atual será renovado e um novo investimento será criado com este valor adicional.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            Depois
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRenew}
            disabled={
              !action ||
              loading ||
              (action === "renew_with_new_rules" && (!newCommitmentPeriod || !newLiquidity)) ||
              (action === "suggest_increase" && !additionalAmount)
            }
            className="bg-[#00BC6E] hover:bg-[#00a05a]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Renovação"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
