"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Settings, Percent, Target, Gift, Plus, Trash2 } from "lucide-react"

interface ReturnRate {
  id: string
  quotaType: "senior" | "subordinate"
  baseRate: number
  minInvestment: number
  maxInvestment: number
  isActive: boolean
}

interface Campaign {
  id: string
  name: string
  description: string
  bonusRate: number
  startDate: string
  endDate: string
  targetAudience: "investor" | "distributor" | "both"
  minInvestment: number
  isActive: boolean
}

interface PerformanceGoal {
  id: string
  name: string
  targetAmount: number
  bonusRate: number
  duration: number
  targetType: "distributor" | "office"
  isActive: boolean
}

export function AdminSettings() {
  const { toast } = useToast()

  // Estados para taxas de retorno
  const [returnRates, setReturnRates] = useState<ReturnRate[]>([
    {
      id: "1",
      quotaType: "senior",
      baseRate: 3.0,
      minInvestment: 5000,
      maxInvestment: 1000000,
      isActive: true,
    },
    {
      id: "2",
      quotaType: "subordinate",
      baseRate: 3.5,
      minInvestment: 5000,
      maxInvestment: 1000000,
      isActive: true,
    },
  ])

  // Estados para campanhas
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: "1",
      name: "Promoção Ano Novo",
      description: "Bônus especial para novos investimentos",
      bonusRate: 0.4,
      startDate: "2024-01-01",
      endDate: "2024-03-31",
      targetAudience: "both",
      minInvestment: 10000,
      isActive: true,
    },
  ])

  // Estados para metas de performance
  const [performanceGoals, setPerformanceGoals] = useState<PerformanceGoal[]>([
    {
      id: "1",
      name: "Meta R$ 500K",
      targetAmount: 500000,
      bonusRate: 1.0,
      duration: 12,
      targetType: "distributor",
      isActive: true,
    },
    {
      id: "2",
      name: "Meta R$ 1M",
      targetAmount: 1000000,
      bonusRate: 2.0,
      duration: 12,
      targetType: "distributor",
      isActive: true,
    },
  ])

  // Estados para novos itens
  const [newReturnRate, setNewReturnRate] = useState<Partial<ReturnRate>>({})
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({})
  const [newPerformanceGoal, setNewPerformanceGoal] = useState<Partial<PerformanceGoal>>({})

  const handleSaveReturnRate = () => {
    if (newReturnRate.quotaType && newReturnRate.baseRate && newReturnRate.minInvestment) {
      const rate: ReturnRate = {
        id: Date.now().toString(),
        quotaType: newReturnRate.quotaType,
        baseRate: newReturnRate.baseRate,
        minInvestment: newReturnRate.minInvestment,
        maxInvestment: newReturnRate.maxInvestment || 1000000,
        isActive: true,
      }
      setReturnRates([...returnRates, rate])
      setNewReturnRate({})
      toast({
        title: "Taxa de retorno salva",
        description: "A nova configuração foi aplicada com sucesso.",
      })
    }
  }

  const handleSaveCampaign = () => {
    if (newCampaign.name && newCampaign.bonusRate && newCampaign.startDate && newCampaign.endDate) {
      const campaign: Campaign = {
        id: Date.now().toString(),
        name: newCampaign.name,
        description: newCampaign.description || "",
        bonusRate: newCampaign.bonusRate,
        startDate: newCampaign.startDate,
        endDate: newCampaign.endDate,
        targetAudience: newCampaign.targetAudience || "both",
        minInvestment: newCampaign.minInvestment || 0,
        isActive: true,
      }
      setCampaigns([...campaigns, campaign])
      setNewCampaign({})
      toast({
        title: "Campanha criada",
        description: "A nova campanha foi configurada com sucesso.",
      })
    }
  }

  const handleSavePerformanceGoal = () => {
    if (newPerformanceGoal.name && newPerformanceGoal.targetAmount && newPerformanceGoal.bonusRate) {
      const goal: PerformanceGoal = {
        id: Date.now().toString(),
        name: newPerformanceGoal.name,
        targetAmount: newPerformanceGoal.targetAmount,
        bonusRate: newPerformanceGoal.bonusRate,
        duration: newPerformanceGoal.duration || 12,
        targetType: newPerformanceGoal.targetType || "distributor",
        isActive: true,
      }
      setPerformanceGoals([...performanceGoals, goal])
      setNewPerformanceGoal({})
      toast({
        title: "Meta de performance criada",
        description: "A nova meta foi configurada com sucesso.",
      })
    }
  }

  const toggleItemStatus = (type: string, id: string) => {
    if (type === "rate") {
      setReturnRates(returnRates.map((rate) => (rate.id === id ? { ...rate, isActive: !rate.isActive } : rate)))
    } else if (type === "campaign") {
      setCampaigns(
        campaigns.map((campaign) => (campaign.id === id ? { ...campaign, isActive: !campaign.isActive } : campaign)),
      )
    } else if (type === "goal") {
      setPerformanceGoals(
        performanceGoals.map((goal) => (goal.id === id ? { ...goal, isActive: !goal.isActive } : goal)),
      )
    }
    toast({
      title: "Status atualizado",
      description: "A configuração foi atualizada com sucesso.",
    })
  }

  const deleteItem = (type: string, id: string) => {
    if (type === "rate") {
      setReturnRates(returnRates.filter((rate) => rate.id !== id))
    } else if (type === "campaign") {
      setCampaigns(campaigns.filter((campaign) => campaign.id !== id))
    } else if (type === "goal") {
      setPerformanceGoals(performanceGoals.filter((goal) => goal.id !== id))
    }
    toast({
      title: "Item removido",
      description: "A configuração foi removida com sucesso.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Configurações Administrativas</h2>
      </div>

      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rates">Taxas de Retorno</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="goals">Metas de Performance</TabsTrigger>
        </TabsList>

        {/* Taxas de Retorno */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Configurar Taxas de Retorno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lista de taxas existentes */}
              <div className="space-y-4">
                {returnRates.map((rate) => (
                  <div key={rate.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={rate.quotaType === "senior" ? "default" : "secondary"}>
                          {rate.quotaType === "senior" ? "Cota Sênior" : "Cota Subordinada"}
                        </Badge>
                        <Badge variant={rate.isActive ? "default" : "outline"}>
                          {rate.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <p className="font-medium">{rate.baseRate}% ao mês</p>
                      <p className="text-sm text-muted-foreground">
                        Investimento:{" "}
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          rate.minInvestment,
                        )}{" "}
                        -{" "}
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          rate.maxInvestment,
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rate.isActive} onCheckedChange={() => toggleItemStatus("rate", rate.id)} />
                      <Button variant="outline" size="sm" onClick={() => deleteItem("rate", rate.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Formulário para nova taxa */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="quotaType">Tipo de Cota</Label>
                  <Select
                    value={newReturnRate.quotaType}
                    onValueChange={(value: "senior" | "subordinate") =>
                      setNewReturnRate({ ...newReturnRate, quotaType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="senior">Cota Sênior</SelectItem>
                      <SelectItem value="subordinate">Cota Subordinada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="baseRate">Taxa Base (%)</Label>
                  <Input
                    id="baseRate"
                    type="number"
                    step="0.1"
                    placeholder="3.0"
                    value={newReturnRate.baseRate || ""}
                    onChange={(e) =>
                      setNewReturnRate({ ...newReturnRate, baseRate: Number.parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="minInvestment">Investimento Mínimo</Label>
                  <Input
                    id="minInvestment"
                    type="number"
                    placeholder="5000"
                    value={newReturnRate.minInvestment || ""}
                    onChange={(e) =>
                      setNewReturnRate({ ...newReturnRate, minInvestment: Number.parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxInvestment">Investimento Máximo</Label>
                  <Input
                    id="maxInvestment"
                    type="number"
                    placeholder="1000000"
                    value={newReturnRate.maxInvestment || ""}
                    onChange={(e) =>
                      setNewReturnRate({ ...newReturnRate, maxInvestment: Number.parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleSaveReturnRate} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Taxa de Retorno
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campanhas */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Gerenciar Campanhas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lista de campanhas existentes */}
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{campaign.name}</h4>
                        <Badge variant={campaign.isActive ? "default" : "outline"}>
                          {campaign.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{campaign.description}</p>
                      <p className="text-sm">
                        <strong>Bônus:</strong> +{campaign.bonusRate}% |<strong> Período:</strong>{" "}
                        {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                        {new Date(campaign.endDate).toLocaleDateString()} |<strong> Público:</strong>{" "}
                        {campaign.targetAudience === "both"
                          ? "Todos"
                          : campaign.targetAudience === "investor"
                            ? "Investidores"
                            : "Distribuidores"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={campaign.isActive}
                        onCheckedChange={() => toggleItemStatus("campaign", campaign.id)}
                      />
                      <Button variant="outline" size="sm" onClick={() => deleteItem("campaign", campaign.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Formulário para nova campanha */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaignName">Nome da Campanha</Label>
                    <Input
                      id="campaignName"
                      placeholder="Ex: Promoção Verão 2024"
                      value={newCampaign.name || ""}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bonusRate">Taxa de Bônus (%)</Label>
                    <Input
                      id="bonusRate"
                      type="number"
                      step="0.1"
                      placeholder="0.5"
                      value={newCampaign.bonusRate || ""}
                      onChange={(e) => setNewCampaign({ ...newCampaign, bonusRate: Number.parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva os detalhes da campanha..."
                    value={newCampaign.description || ""}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newCampaign.startDate || ""}
                      onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Data de Fim</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newCampaign.endDate || ""}
                      onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetAudience">Público-Alvo</Label>
                    <Select
                      value={newCampaign.targetAudience}
                      onValueChange={(value: "investor" | "distributor" | "both") =>
                        setNewCampaign({ ...newCampaign, targetAudience: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Todos</SelectItem>
                        <SelectItem value="investor">Investidores</SelectItem>
                        <SelectItem value="distributor">Distribuidores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="minInvestment">Investimento Mínimo</Label>
                  <Input
                    id="minInvestment"
                    type="number"
                    placeholder="10000"
                    value={newCampaign.minInvestment || ""}
                    onChange={(e) => setNewCampaign({ ...newCampaign, minInvestment: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <Button onClick={handleSaveCampaign} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Campanha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metas de Performance */}
        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Metas de Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lista de metas existentes */}
              <div className="space-y-4">
                {performanceGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{goal.name}</h4>
                        <Badge variant={goal.isActive ? "default" : "outline"}>
                          {goal.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        <strong>Meta:</strong>{" "}
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          goal.targetAmount,
                        )}{" "}
                        |<strong> Bônus:</strong> +{goal.bonusRate}% por {goal.duration} meses |
                        <strong> Público:</strong>{" "}
                        {goal.targetType === "distributor" ? "Distribuidores" : "Escritórios"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={goal.isActive} onCheckedChange={() => toggleItemStatus("goal", goal.id)} />
                      <Button variant="outline" size="sm" onClick={() => deleteItem("goal", goal.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Formulário para nova meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="goalName">Nome da Meta</Label>
                  <Input
                    id="goalName"
                    placeholder="Ex: Meta R$ 2M"
                    value={newPerformanceGoal.name || ""}
                    onChange={(e) => setNewPerformanceGoal({ ...newPerformanceGoal, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="targetAmount">Valor da Meta</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    placeholder="500000"
                    value={newPerformanceGoal.targetAmount || ""}
                    onChange={(e) =>
                      setNewPerformanceGoal({ ...newPerformanceGoal, targetAmount: Number.parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="goalBonusRate">Taxa de Bônus (%)</Label>
                  <Input
                    id="goalBonusRate"
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={newPerformanceGoal.bonusRate || ""}
                    onChange={(e) =>
                      setNewPerformanceGoal({ ...newPerformanceGoal, bonusRate: Number.parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duração (meses)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="12"
                    value={newPerformanceGoal.duration || ""}
                    onChange={(e) =>
                      setNewPerformanceGoal({ ...newPerformanceGoal, duration: Number.parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="targetType">Público-Alvo</Label>
                <Select
                  value={newPerformanceGoal.targetType}
                  onValueChange={(value: "distributor" | "office") =>
                    setNewPerformanceGoal({ ...newPerformanceGoal, targetType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distributor">Distribuidores</SelectItem>
                    <SelectItem value="office">Escritórios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSavePerformanceGoal} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Meta de Performance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
