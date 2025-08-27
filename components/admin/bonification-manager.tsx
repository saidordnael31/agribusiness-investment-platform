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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Target, DollarSign, Clock, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BonificationRule {
  id: string
  name: string
  description: string
  type: "investment_amount" | "lock_period" | "performance_goal" | "promotion"
  condition: {
    minAmount?: number
    maxAmount?: number
    minPeriod?: number
    targetAmount?: number
    promotionCode?: string
  }
  bonus: {
    additionalRate: number
    type: "fixed" | "progressive"
    duration?: number
  }
  isActive: boolean
  userType: "investor" | "distributor" | "both"
  createdAt: string
  usageCount: number
}

export function BonificationManager() {
  const { toast } = useToast()
  const [bonificationRules, setBonificationRules] = useState<BonificationRule[]>([
    {
      id: "1",
      name: "Investimento Premium",
      description: "Bonificação para investimentos acima de R$ 100.000",
      type: "investment_amount",
      condition: { minAmount: 100000 },
      bonus: { additionalRate: 0.3, type: "fixed" },
      isActive: true,
      userType: "investor",
      createdAt: "2025-01-01",
      usageCount: 45,
    },
    {
      id: "2",
      name: "Compromisso 6 Meses",
      description: "Taxa adicional por manter investimento por 6 meses",
      type: "lock_period",
      condition: { minPeriod: 6 },
      bonus: { additionalRate: 0.2, type: "fixed", duration: 6 },
      isActive: true,
      userType: "investor",
      createdAt: "2025-01-01",
      usageCount: 23,
    },
    {
      id: "3",
      name: "Meta Distribuidor 500K",
      description: "Bonificação para distribuidores que captarem R$ 500.000",
      type: "performance_goal",
      condition: { targetAmount: 500000 },
      bonus: { additionalRate: 1.0, type: "fixed", duration: 12 },
      isActive: true,
      userType: "distributor",
      createdAt: "2025-01-01",
      usageCount: 12,
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<BonificationRule | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "investment_amount" as BonificationRule["type"],
    minAmount: "",
    maxAmount: "",
    minPeriod: "",
    targetAmount: "",
    promotionCode: "",
    additionalRate: 0,
    duration: "",
    userType: "investor" as "investor" | "distributor" | "both",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const condition: BonificationRule["condition"] = {}
    if (formData.minAmount) condition.minAmount = Number.parseInt(formData.minAmount)
    if (formData.maxAmount) condition.maxAmount = Number.parseInt(formData.maxAmount)
    if (formData.minPeriod) condition.minPeriod = Number.parseInt(formData.minPeriod)
    if (formData.targetAmount) condition.targetAmount = Number.parseInt(formData.targetAmount)
    if (formData.promotionCode) condition.promotionCode = formData.promotionCode

    const newRule: BonificationRule = {
      id: editingRule?.id || Date.now().toString(),
      name: formData.name,
      description: formData.description,
      type: formData.type,
      condition,
      bonus: {
        additionalRate: formData.additionalRate,
        type: "fixed",
        duration: formData.duration ? Number.parseInt(formData.duration) : undefined,
      },
      isActive: true,
      userType: formData.userType,
      createdAt: editingRule?.createdAt || new Date().toISOString().split("T")[0],
      usageCount: editingRule?.usageCount || 0,
    }

    if (editingRule) {
      setBonificationRules(bonificationRules.map((r) => (r.id === editingRule.id ? newRule : r)))
      toast({
        title: "Bonificação atualizada!",
        description: "As alterações foram salvas com sucesso.",
      })
    } else {
      setBonificationRules([...bonificationRules, newRule])
      toast({
        title: "Bonificação criada!",
        description: "A nova regra de bonificação foi adicionada.",
      })
    }

    setIsDialogOpen(false)
    setEditingRule(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "investment_amount",
      minAmount: "",
      maxAmount: "",
      minPeriod: "",
      targetAmount: "",
      promotionCode: "",
      additionalRate: 0,
      duration: "",
      userType: "investor",
    })
  }

  const handleEdit = (rule: BonificationRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description,
      type: rule.type,
      minAmount: rule.condition.minAmount?.toString() || "",
      maxAmount: rule.condition.maxAmount?.toString() || "",
      minPeriod: rule.condition.minPeriod?.toString() || "",
      targetAmount: rule.condition.targetAmount?.toString() || "",
      promotionCode: rule.condition.promotionCode || "",
      additionalRate: rule.bonus.additionalRate,
      duration: rule.bonus.duration?.toString() || "",
      userType: rule.userType,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setBonificationRules(bonificationRules.filter((r) => r.id !== id))
    toast({
      title: "Bonificação removida!",
      description: "A regra de bonificação foi excluída.",
    })
  }

  const toggleActive = (id: string) => {
    setBonificationRules(bonificationRules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)))
    toast({
      title: "Status atualizado!",
      description: "O status da bonificação foi alterado.",
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "investment_amount":
        return <DollarSign className="w-4 h-4" />
      case "lock_period":
        return <Clock className="w-4 h-4" />
      case "performance_goal":
        return <Target className="w-4 h-4" />
      case "promotion":
        return <Gift className="w-4 h-4" />
      default:
        return <Target className="w-4 h-4" />
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case "investment_amount":
        return "Por Valor"
      case "lock_period":
        return "Por Prazo"
      case "performance_goal":
        return "Por Meta"
      case "promotion":
        return "Promoção"
      default:
        return type
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatRate = (rate: number) => {
    return `+${rate.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Gerenciamento de Bonificações
          </h2>
          <p className="text-muted-foreground">Configure regras de bonificação e incentivos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Bonificação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Editar Bonificação" : "Nova Bonificação"}</DialogTitle>
              <DialogDescription>Configure os detalhes da regra de bonificação</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Bonificação</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Bonificação</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  >
                    <option value="investment_amount">Por Valor de Investimento</option>
                    <option value="lock_period">Por Prazo de Compromisso</option>
                    <option value="performance_goal">Por Meta de Performance</option>
                    <option value="promotion">Promoção Especial</option>
                  </select>
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

              {/* Condições baseadas no tipo */}
              {formData.type === "investment_amount" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minAmount">Valor Mínimo (R$)</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      value={formData.minAmount}
                      onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAmount">Valor Máximo (R$) - Opcional</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      value={formData.maxAmount}
                      onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {formData.type === "lock_period" && (
                <div>
                  <Label htmlFor="minPeriod">Período Mínimo (meses)</Label>
                  <Input
                    id="minPeriod"
                    type="number"
                    value={formData.minPeriod}
                    onChange={(e) => setFormData({ ...formData, minPeriod: e.target.value })}
                  />
                </div>
              )}

              {formData.type === "performance_goal" && (
                <div>
                  <Label htmlFor="targetAmount">Meta de Captação (R$)</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  />
                </div>
              )}

              {formData.type === "promotion" && (
                <div>
                  <Label htmlFor="promotionCode">Código da Promoção</Label>
                  <Input
                    id="promotionCode"
                    value={formData.promotionCode}
                    onChange={(e) => setFormData({ ...formData, promotionCode: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="additionalRate">Taxa Adicional (%)</Label>
                  <Input
                    id="additionalRate"
                    type="number"
                    step="0.1"
                    value={formData.additionalRate}
                    onChange={(e) => setFormData({ ...formData, additionalRate: Number.parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duração (meses) - Opcional</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="Permanente"
                  />
                </div>
                <div>
                  <Label htmlFor="userType">Público-Alvo</Label>
                  <select
                    id="userType"
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  >
                    <option value="investor">Investidores</option>
                    <option value="distributor">Distribuidores</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingRule ? "Atualizar" : "Criar"} Bonificação</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Bonificação</CardTitle>
          <CardDescription>Gerencie todas as regras de bonificação da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Bonificação</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonificationRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(rule.type)}
                      <span className="text-sm">{getTypeName(rule.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.condition.minAmount && `Min: ${formatCurrency(rule.condition.minAmount)}`}
                    {rule.condition.minPeriod && `${rule.condition.minPeriod} meses`}
                    {rule.condition.targetAmount && `Meta: ${formatCurrency(rule.condition.targetAmount)}`}
                    {rule.condition.promotionCode && rule.condition.promotionCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatRate(rule.bonus.additionalRate)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rule.userType === "both"
                        ? "Ambos"
                        : rule.userType === "investor"
                          ? "Investidor"
                          : "Distribuidor"}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.usageCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch checked={rule.isActive} onCheckedChange={() => toggleActive(rule.id)} />
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
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
    </div>
  )
}
