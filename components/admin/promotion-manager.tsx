"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Gift, Target, TrendingUp, Users, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

interface Promotion {
  id: string
  name: string
  description: string
  code?: string
  bonusRate: number
  startDate: string
  endDate: string
  targetAudience: "investors" | "distributors" | "offices" | "advisors" | "all"
  isActive: boolean
  usageCount: number
  maxUsage?: number
  campaignType: "bonus_rate" | "commission_boost" | "performance_goal" | "referral"
  conditions?: {
    minInvestment?: number
    minCaptation?: number
    targetOffices?: string[]
    targetAdvisors?: string[]
  }
  results?: {
    totalParticipants: number
    totalImpact: number
    conversionRate: number
  }
}

interface PerformanceGoal {
  id: string
  name: string
  description: string
  targetAmount: number
  bonusRate: number
  duration: number // months
  targetAudience: "offices" | "advisors" | "both"
  isActive: boolean
  participants: number
  achieved: number
  startDate: string
  endDate: string
}

export function PromotionManager() {
  const { toast } = useToast()

  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: "1",
      name: "Promoção Ano Novo",
      description: "Taxa especial para novos investimentos até 31/03",
      code: "NEWYEAR2025",
      bonusRate: 0.4,
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      targetAudience: "all",
      isActive: true,
      usageCount: 47,
      maxUsage: 100,
      campaignType: "bonus_rate",
      conditions: { minInvestment: 10000 },
      results: { totalParticipants: 47, totalImpact: 235000, conversionRate: 23.5 },
    },
    {
      id: "2",
      name: "Indicação Premiada",
      description: "Bonificação por cada indicação efetivada",
      bonusRate: 0.2,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      targetAudience: "all",
      isActive: true,
      usageCount: 23,
      campaignType: "referral",
      results: { totalParticipants: 23, totalImpact: 115000, conversionRate: 15.3 },
    },
    {
      id: "3",
      name: "Distribuidor Premium",
      description: "Bonificação especial para distribuidores elite",
      bonusRate: 1.5,
      startDate: "2025-02-01",
      endDate: "2025-04-30",
      targetAudience: "distributors",
      isActive: false,
      usageCount: 0,
      maxUsage: 50,
      campaignType: "commission_boost",
      conditions: { minCaptation: 500000 },
      results: { totalParticipants: 0, totalImpact: 0, conversionRate: 0 },
    },
  ])

  const [performanceGoals, setPerformanceGoals] = useState<PerformanceGoal[]>([
    {
      id: "1",
      name: "Meta Escritório 500K",
      description: "Escritórios que captarem R$ 500K ganham +1% adicional por 12 meses",
      targetAmount: 500000,
      bonusRate: 1.0,
      duration: 12,
      targetAudience: "offices",
      isActive: true,
      participants: 15,
      achieved: 8,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    },
    {
      id: "2",
      name: "Meta Assessor 1M",
      description: "Assessores que captarem R$ 1M ganham +2% adicional por 12 meses",
      targetAmount: 1000000,
      bonusRate: 2.0,
      duration: 12,
      targetAudience: "advisors",
      isActive: true,
      participants: 25,
      achieved: 3,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [editingGoal, setEditingGoal] = useState<PerformanceGoal | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    bonusRate: 0,
    startDate: "",
    endDate: "",
    targetAudience: "all" as "investors" | "distributors" | "offices" | "advisors" | "all",
    maxUsage: "",
    campaignType: "bonus_rate" as "bonus_rate" | "commission_boost" | "performance_goal" | "referral",
    minInvestment: "",
    minCaptation: "",
  })

  const [goalFormData, setGoalFormData] = useState({
    name: "",
    description: "",
    targetAmount: 0,
    bonusRate: 0,
    duration: 12,
    targetAudience: "both" as "offices" | "advisors" | "both",
    startDate: "",
    endDate: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const conditions: any = {}
    if (formData.minInvestment) conditions.minInvestment = Number(formData.minInvestment)
    if (formData.minCaptation) conditions.minCaptation = Number(formData.minCaptation)

    const newPromotion: Promotion = {
      id: editingPromotion?.id || Date.now().toString(),
      name: formData.name,
      description: formData.description,
      code: formData.code || undefined,
      bonusRate: formData.bonusRate,
      startDate: formData.startDate,
      endDate: formData.endDate,
      targetAudience: formData.targetAudience,
      isActive: true,
      usageCount: editingPromotion?.usageCount || 0,
      maxUsage: formData.maxUsage ? Number.parseInt(formData.maxUsage) : undefined,
      campaignType: formData.campaignType,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      results: editingPromotion?.results || { totalParticipants: 0, totalImpact: 0, conversionRate: 0 },
    }

    if (editingPromotion) {
      setPromotions(promotions.map((p) => (p.id === editingPromotion.id ? newPromotion : p)))
      toast({
        title: "Campanha atualizada!",
        description: "As alterações foram salvas com sucesso.",
      })
    } else {
      setPromotions([...promotions, newPromotion])
      toast({
        title: "Campanha criada!",
        description: "A nova campanha foi adicionada com sucesso.",
      })
    }

    setIsDialogOpen(false)
    setEditingPromotion(null)
    setFormData({
      name: "",
      description: "",
      code: "",
      bonusRate: 0,
      startDate: "",
      endDate: "",
      targetAudience: "all",
      maxUsage: "",
      campaignType: "bonus_rate",
      minInvestment: "",
      minCaptation: "",
    })
  }

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newGoal: PerformanceGoal = {
      id: editingGoal?.id || Date.now().toString(),
      name: goalFormData.name,
      description: goalFormData.description,
      targetAmount: goalFormData.targetAmount,
      bonusRate: goalFormData.bonusRate,
      duration: goalFormData.duration,
      targetAudience: goalFormData.targetAudience,
      isActive: true,
      participants: editingGoal?.participants || 0,
      achieved: editingGoal?.achieved || 0,
      startDate: goalFormData.startDate,
      endDate: goalFormData.endDate,
    }

    if (editingGoal) {
      setPerformanceGoals(performanceGoals.map((g) => (g.id === editingGoal.id ? newGoal : g)))
      toast({
        title: "Meta atualizada!",
        description: "As alterações foram salvas com sucesso.",
      })
    } else {
      setPerformanceGoals([...performanceGoals, newGoal])
      toast({
        title: "Meta criada!",
        description: "A nova meta foi adicionada com sucesso.",
      })
    }

    setIsGoalDialogOpen(false)
    setEditingGoal(null)
    setGoalFormData({
      name: "",
      description: "",
      targetAmount: 0,
      bonusRate: 0,
      duration: 12,
      targetAudience: "both",
      startDate: "",
      endDate: "",
    })
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      name: promotion.name,
      description: promotion.description,
      code: promotion.code || "",
      bonusRate: promotion.bonusRate,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      targetAudience: promotion.targetAudience,
      maxUsage: promotion.maxUsage?.toString() || "",
      campaignType: promotion.campaignType,
      minInvestment: promotion.conditions?.minInvestment?.toString() || "",
      minCaptation: promotion.conditions?.minCaptation?.toString() || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setPromotions(promotions.filter((p) => p.id !== id))
    toast({
      title: "Campanha removida!",
      description: "A campanha foi excluída com sucesso.",
    })
  }

  const toggleActive = (id: string) => {
    setPromotions(promotions.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)))
    toast({
      title: "Status atualizado!",
      description: "O status da campanha foi alterado.",
    })
  }

  const formatRate = (rate: number) => {
    return `+${rate.toFixed(1)}%`
  }

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case "investors":
        return "Investidores"
      case "distributors":
        return "Distribuidores"
      case "offices":
        return "Escritórios"
      case "advisors":
        return "Assessores"
      case "all":
        return "Todos"
      case "both":
        return "Ambos"
      default:
        return audience
    }
  }

  const getCampaignTypeLabel = (type: string) => {
    switch (type) {
      case "bonus_rate":
        return "Taxa Bônus"
      case "commission_boost":
        return "Boost Comissão"
      case "performance_goal":
        return "Meta Performance"
      case "referral":
        return "Indicação"
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Gestão de Campanhas e Metas
          </h2>
          <p className="text-muted-foreground">Configure campanhas promocionais e metas de performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotions.filter((p) => p.isActive).length}</div>
            <p className="text-xs text-muted-foreground">De {promotions.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.reduce((sum, p) => sum + (p.results?.totalParticipants || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total engajados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impacto Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(promotions.reduce((sum, p) => sum + (p.results?.totalImpact || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Volume gerado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Atingidas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceGoals.reduce((sum, g) => sum + g.achieved, 0)}</div>
            <p className="text-xs text-muted-foreground">
              De {performanceGoals.reduce((sum, g) => sum + g.participants, 0)} participantes
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas Promocionais</TabsTrigger>
          <TabsTrigger value="goals">Metas de Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Campanha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{editingPromotion ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
                  <DialogDescription>Configure os detalhes da campanha promocional</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome da Campanha</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Código (opcional)</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="Ex: PROMO2025"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="campaignType">Tipo de Campanha</Label>
                      <select
                        id="campaignType"
                        value={formData.campaignType}
                        onChange={(e) => setFormData({ ...formData, campaignType: e.target.value as any })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="bonus_rate">Taxa Bônus</option>
                        <option value="commission_boost">Boost Comissão</option>
                        <option value="performance_goal">Meta Performance</option>
                        <option value="referral">Indicação</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="bonusRate">Taxa de Bonificação (%)</Label>
                      <Input
                        id="bonusRate"
                        type="number"
                        step="0.1"
                        value={formData.bonusRate}
                        onChange={(e) => setFormData({ ...formData, bonusRate: Number.parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="startDate">Data de Início</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Data de Fim</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="targetAudience">Público-Alvo</Label>
                      <select
                        id="targetAudience"
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="all">Todos</option>
                        <option value="investors">Investidores</option>
                        <option value="distributors">Distribuidores</option>
                        <option value="offices">Escritórios</option>
                        <option value="advisors">Assessores</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="maxUsage">Limite de Uso</Label>
                      <Input
                        id="maxUsage"
                        type="number"
                        value={formData.maxUsage}
                        onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                        placeholder="Sem limite"
                      />
                    </div>
                    <div>
                      <Label htmlFor="minInvestment">Investimento Mínimo</Label>
                      <Input
                        id="minInvestment"
                        type="number"
                        value={formData.minInvestment}
                        onChange={(e) => setFormData({ ...formData, minInvestment: e.target.value })}
                        placeholder="R$ 0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="minCaptation">Captação Mínima</Label>
                      <Input
                        id="minCaptation"
                        type="number"
                        value={formData.minCaptation}
                        onChange={(e) => setFormData({ ...formData, minCaptation: e.target.value })}
                        placeholder="R$ 0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">{editingPromotion ? "Atualizar" : "Criar"} Campanha</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campanhas Ativas</CardTitle>
              <CardDescription>Gerencie todas as campanhas promocionais da plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Bonificação</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Público</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell className="font-medium">{promotion.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCampaignTypeLabel(promotion.campaignType)}</Badge>
                      </TableCell>
                      <TableCell>
                        {promotion.code ? (
                          <Badge variant="outline">{promotion.code}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatRate(promotion.bonusRate)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(promotion.startDate).toLocaleDateString("pt-BR")} -{" "}
                        {new Date(promotion.endDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAudienceLabel(promotion.targetAudience)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p>{promotion.results?.totalParticipants || 0} participantes</p>
                          <p className="text-muted-foreground">{formatCurrency(promotion.results?.totalImpact || 0)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch checked={promotion.isActive} onCheckedChange={() => toggleActive(promotion.id)} />
                          <Badge variant={promotion.isActive ? "default" : "secondary"}>
                            {promotion.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(promotion)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(promotion.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta de Performance"}</DialogTitle>
                  <DialogDescription>Configure metas de captação e performance</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleGoalSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goalName">Nome da Meta</Label>
                      <Input
                        id="goalName"
                        value={goalFormData.name}
                        onChange={(e) => setGoalFormData({ ...goalFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="goalTargetAmount">Valor Meta (R$)</Label>
                      <Input
                        id="goalTargetAmount"
                        type="number"
                        value={goalFormData.targetAmount}
                        onChange={(e) => setGoalFormData({ ...goalFormData, targetAmount: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="goalDescription">Descrição</Label>
                    <Textarea
                      id="goalDescription"
                      value={goalFormData.description}
                      onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="goalBonusRate">Taxa Bônus (%)</Label>
                      <Input
                        id="goalBonusRate"
                        type="number"
                        step="0.1"
                        value={goalFormData.bonusRate}
                        onChange={(e) => setGoalFormData({ ...goalFormData, bonusRate: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="goalDuration">Duração (meses)</Label>
                      <Input
                        id="goalDuration"
                        type="number"
                        value={goalFormData.duration}
                        onChange={(e) => setGoalFormData({ ...goalFormData, duration: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="goalTargetAudience">Público-Alvo</Label>
                      <select
                        id="goalTargetAudience"
                        value={goalFormData.targetAudience}
                        onChange={(e) => setGoalFormData({ ...goalFormData, targetAudience: e.target.value as any })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                      >
                        <option value="both">Ambos</option>
                        <option value="offices">Escritórios</option>
                        <option value="advisors">Assessores</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goalStartDate">Data de Início</Label>
                      <Input
                        id="goalStartDate"
                        type="date"
                        value={goalFormData.startDate}
                        onChange={(e) => setGoalFormData({ ...goalFormData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="goalEndDate">Data de Fim</Label>
                      <Input
                        id="goalEndDate"
                        type="date"
                        value={goalFormData.endDate}
                        onChange={(e) => setGoalFormData({ ...goalFormData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsGoalDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">{editingGoal ? "Atualizar" : "Criar"} Meta</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Metas de Performance</CardTitle>
              <CardDescription>Gerencie metas de captação para escritórios e assessores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceGoals.map((goal) => (
                  <div key={goal.id} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Target className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{goal.name}</h3>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                      </div>
                      <Badge variant={goal.isActive ? "default" : "secondary"}>
                        {goal.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Meta</p>
                        <p className="font-semibold">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Bônus</p>
                        <p className="font-semibold text-purple-600">{formatRate(goal.bonusRate)}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Participantes</p>
                        <p className="font-semibold text-blue-600">{goal.participants}</p>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Atingiram</p>
                        <p className="font-semibold text-emerald-600">{goal.achieved}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Público: {getAudienceLabel(goal.targetAudience)}</span>
                        <span>Duração: {goal.duration} meses</span>
                        <span>
                          {new Date(goal.startDate).toLocaleDateString("pt-BR")} -{" "}
                          {new Date(goal.endDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance das Campanhas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {promotions
                    .filter((p) => p.isActive)
                    .map((promotion) => (
                      <div key={promotion.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{promotion.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {promotion.results?.totalParticipants || 0} participantes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(promotion.results?.totalImpact || 0)}</p>
                          <p className="text-sm text-muted-foreground">
                            {(promotion.results?.conversionRate || 0).toFixed(1)}% conversão
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Progresso das Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceGoals
                    .filter((g) => g.isActive)
                    .map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{goal.name}</p>
                          <span className="text-sm text-muted-foreground">
                            {goal.achieved}/{goal.participants}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{
                              width: `${goal.participants > 0 ? (goal.achieved / goal.participants) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {goal.participants > 0 ? ((goal.achieved / goal.participants) * 100).toFixed(1) : 0}% de
                          sucesso
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
