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
import { Plus, Edit, Trash2, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Promotion {
  id: string
  name: string
  description: string
  code?: string
  bonusRate: number
  startDate: string
  endDate: string
  targetAudience: "investors" | "distributors" | "both"
  isActive: boolean
  usageCount: number
  maxUsage?: number
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
      targetAudience: "both",
      isActive: true,
      usageCount: 47,
      maxUsage: 100,
    },
    {
      id: "2",
      name: "Indicação Premiada",
      description: "Bonificação por cada indicação efetivada",
      bonusRate: 0.2,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      targetAudience: "both",
      isActive: true,
      usageCount: 23,
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
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    bonusRate: 0,
    startDate: "",
    endDate: "",
    targetAudience: "both" as "investors" | "distributors" | "both",
    maxUsage: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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
    }

    if (editingPromotion) {
      setPromotions(promotions.map((p) => (p.id === editingPromotion.id ? newPromotion : p)))
      toast({
        title: "Promoção atualizada!",
        description: "As alterações foram salvas com sucesso.",
      })
    } else {
      setPromotions([...promotions, newPromotion])
      toast({
        title: "Promoção criada!",
        description: "A nova promoção foi adicionada com sucesso.",
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
      targetAudience: "both",
      maxUsage: "",
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
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setPromotions(promotions.filter((p) => p.id !== id))
    toast({
      title: "Promoção removida!",
      description: "A promoção foi excluída com sucesso.",
    })
  }

  const toggleActive = (id: string) => {
    setPromotions(promotions.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)))
    toast({
      title: "Status atualizado!",
      description: "O status da promoção foi alterado.",
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
      case "both":
        return "Ambos"
      default:
        return audience
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Gerenciamento de Promoções
          </h2>
          <p className="text-muted-foreground">Configure promoções e ofertas especiais</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Promoção
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPromotion ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
              <DialogDescription>Configure os detalhes da promoção</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Promoção</Label>
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
              <div className="grid grid-cols-3 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetAudience">Público-Alvo</Label>
                  <select
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  >
                    <option value="both">Ambos</option>
                    <option value="investors">Investidores</option>
                    <option value="distributors">Distribuidores</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="maxUsage">Limite de Uso (opcional)</Label>
                  <Input
                    id="maxUsage"
                    type="number"
                    value={formData.maxUsage}
                    onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                    placeholder="Sem limite"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingPromotion ? "Atualizar" : "Criar"} Promoção</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promoções Ativas</CardTitle>
          <CardDescription>Gerencie todas as promoções da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Bonificação</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell className="font-medium">{promotion.name}</TableCell>
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
                  <TableCell>
                    {promotion.usageCount}
                    {promotion.maxUsage && ` / ${promotion.maxUsage}`}
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
    </div>
  )
}
