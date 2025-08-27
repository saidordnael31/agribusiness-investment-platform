"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { formatCurrency } from "@/lib/utils"

interface ApprovalRequest {
  id: string
  transaction_type: string
  amount: number
  advisor_id: string
  advisor_name: string
  status: string
  requested_at: string
  rejection_reason?: string
}

function ApprovalsContent() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadApprovalRequests()
  }, [])

  const loadApprovalRequests = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase
        .from("transaction_approvals")
        .select(`
          *,
          profiles!advisor_id(name)
        `)
        .eq("office_id", user.user.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })

      if (error) throw error

      const formattedRequests = data.map((item) => ({
        id: item.id,
        transaction_type: item.transaction_type,
        amount: item.amount,
        advisor_id: item.advisor_id,
        advisor_name: item.profiles?.name || "Nome não encontrado",
        status: item.status,
        requested_at: item.requested_at,
        rejection_reason: item.rejection_reason,
      }))

      setRequests(formattedRequests)
    } catch (error: any) {
      toast({
        title: "Erro ao carregar solicitações",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproval = async (requestId: string, approved: boolean) => {
    setProcessingId(requestId)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const updateData: any = {
        status: approved ? "approved" : "rejected",
        approved_at: new Date().toISOString(),
        approved_by: user.user.id,
      }

      if (!approved && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      }

      const { error } = await supabase.from("transaction_approvals").update(updateData).eq("id", requestId)

      if (error) throw error

      toast({
        title: approved ? "Solicitação aprovada!" : "Solicitação rejeitada!",
        description: approved ? "A transação foi aprovada com sucesso." : "A solicitação foi rejeitada.",
      })

      loadApprovalRequests()
      setRejectionReason("")
    } catch (error: any) {
      toast({
        title: "Erro ao processar solicitação",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando solicitações...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Aprovações Pendentes</h1>
        <p className="text-muted-foreground">Gerencie as solicitações de depósito e resgate dos seus assessores</p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhuma solicitação pendente no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {request.transaction_type === "deposit" ? "Depósito" : "Resgate"}
                      <Badge variant="outline">{formatCurrency(request.amount)}</Badge>
                    </CardTitle>
                    <CardDescription>Solicitado por: {request.advisor_name}</CardDescription>
                  </div>
                  <Badge variant="secondary">Pendente</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Solicitado em: {new Date(request.requested_at).toLocaleString("pt-BR")}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo da rejeição (opcional)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproval(request.id, true)}
                      disabled={processingId === request.id}
                      className="flex-1"
                    >
                      {processingId === request.id ? "Processando..." : "Aprovar"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleApproval(request.id, false)}
                      disabled={processingId === request.id}
                      className="flex-1"
                    >
                      {processingId === request.id ? "Processando..." : "Rejeitar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ApprovalsPage() {
  return (
    <ProtectedRoute allowedTypes={["distributor"]} requiresHierarchy="office">
      <ApprovalsContent />
    </ProtectedRoute>
  )
}
