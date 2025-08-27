"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, TrendingUp, Settings, Target, Award } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  type: string
  min_investment: number
  max_investment?: number
  base_rate: number
}

interface CommissionStructure {
  id: string
  product_id: string
  investment_range_min: number
  investment_range_max?: number
  lock_period: number
  escritorio_rate: number
  gestor_rate: number
  lider_rate: number
  assessor_rate: number
  investidor_rate: number
  indicacao_rate: number
  total_rate: number
}

interface Campaign {
  id: string
  name: string
  type: string
  target_role: string
  target_amount?: number
  target_period?: number
  bonus_rate: number
  bonus_duration: number
  start_date: string
  end_date: string
  is_active: boolean
  conditions: any
}

export default function AkintecManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [commissionStructures, setCommissionStructures] = useState<CommissionStructure[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [customRates, setCustomRates] = useState({
    escritorio_rate: 0,
    gestor_rate: 0,
    lider_rate: 0,
    assessor_rate: 0,
    investidor_rate: 0,
    indicacao_rate: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Simular carregamento de dados
    setProducts([
      {
        id: "1",
        name: "Safra Turbinada 5k-100k",
        type: "turbinada",
        min_investment: 5000,
        max_investment: 100000,
        base_rate: 0.029,
      },
      {
        id: "2",
        name: "Safra Turbinada 101k-500k",
        type: "turbinada",
        min_investment: 101000,
        max_investment: 500000,
        base_rate: 0.033,
      },
      { id: "3", name: "Safra Turbinada >500k", type: "turbinada", min_investment: 500001, base_rate: 0.037 },
    ])

    setCommissionStructures([
      {
        id: "1",
        product_id: "1",
        investment_range_min: 5000,
        investment_range_max: 100000,
        lock_period: 2,
        escritorio_rate: 0.003,
        gestor_rate: 0.001,
        lider_rate: 0.001,
        assessor_rate: 0.005,
        investidor_rate: 0.018,
        indicacao_rate: 0.001,
        total_rate: 0.029,
      },
    ])

    setCampaigns([
      {
        id: "1",
        name: "Fôlego Curto - 100k",
        type: "mensal",
        target_role: "assessor",
        target_amount: 100000,
        target_period: 30,
        bonus_rate: 0.0025,
        bonus_duration: 3,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        is_active: true,
        conditions: { description: "Meta Individual do Assessor - R$ 100 mil captados no mês" },
      },
    ])
  }

  const calculateTotalRate = (rates: typeof customRates) => {
    return Object.values(rates).reduce((sum, rate) => sum + rate, 0)
  }

  const validateRateRedistribution = (rates: typeof customRates, maxTotal: number) => {
    const total = calculateTotalRate(rates)
    return total <= maxTotal
  }

  const handleRateChange = (field: keyof typeof customRates, value: string) => {
    const numValue = Number.parseFloat(value) || 0
    const newRates = { ...customRates, [field]: numValue }

    const selectedProductData = products.find((p) => p.id === selectedProduct)
    if (selectedProductData && !validateRateRedistribution(newRates, selectedProductData.base_rate)) {
      toast.error(`Taxa total não pode exceder ${(selectedProductData.base_rate * 100).toFixed(2)}%`)
      return
    }

    setCustomRates(newRates)
  }

  const saveRateRedistribution = async () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto")
      return
    }

    const selectedProductData = products.find((p) => p.id === selectedProduct)
    if (!selectedProductData) return

    if (!validateRateRedistribution(customRates, selectedProductData.base_rate)) {
      toast.error(`Taxa total não pode exceder ${(selectedProductData.base_rate * 100).toFixed(2)}%`)
      return
    }

    // Simular salvamento
    toast.success("Redistribuição de taxas salva com sucesso!")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Gestão Akintec</h2>
      </div>

      <Tabs defaultValue="hierarchy" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="rates">Redistribuição</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Estrutura Hierárquica
              </CardTitle>
              <CardDescription>
                Gestão da hierarquia: Escritório → Gestor → Líder → Assessor → Investidor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Escritórios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">12</div>
                    <p className="text-sm text-muted-foreground">Ativos na plataforma</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Assessores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">156</div>
                    <p className="text-sm text-muted-foreground">Total na rede</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Investidores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">2,847</div>
                    <p className="text-sm text-muted-foreground">Clientes ativos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Estrutura por Escritório</h4>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Escritório Alpha (CNPJ: 12.345.678/0001-90)</span>
                    <Badge variant="outline">Ativo</Badge>
                  </div>
                  <div className="ml-4 space-y-1 text-sm text-muted-foreground">
                    <div>├── Gestor: João Silva (3 líderes)</div>
                    <div>├── Líder: Maria Santos (8 assessores)</div>
                    <div>├── Líder: Pedro Costa (12 assessores)</div>
                    <div>└── Total: 247 investidores</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Produtos Akintec
              </CardTitle>
              <CardDescription>Gestão de produtos e estrutura de comissões</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>
                      Investimento: R$ {product.min_investment.toLocaleString()}
                      {product.max_investment ? ` - R$ ${product.max_investment.toLocaleString()}` : "+"}| Taxa Base:{" "}
                      {(product.base_rate * 100).toFixed(2)}% a.m.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Escritório:</span>
                        <div className="text-primary">0,30%</div>
                      </div>
                      <div>
                        <span className="font-medium">Gestor:</span>
                        <div className="text-primary">0,10%</div>
                      </div>
                      <div>
                        <span className="font-medium">Líder:</span>
                        <div className="text-primary">0,10%</div>
                      </div>
                      <div>
                        <span className="font-medium">Assessor:</span>
                        <div className="text-primary">0,50%</div>
                      </div>
                      <div>
                        <span className="font-medium">Investidor:</span>
                        <div className="text-primary">1,80%</div>
                      </div>
                      <div>
                        <span className="font-medium">Indicação:</span>
                        <div className="text-primary">0,10%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Redistribuição de Taxas
              </CardTitle>
              <CardDescription>
                Escritórios podem redistribuir taxas sem ultrapassar o limite do produto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-select">Produto</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <div className="space-y-2">
                    <Label>Taxa Máxima</Label>
                    <div className="text-2xl font-bold text-primary">
                      {((products.find((p) => p.id === selectedProduct)?.base_rate || 0) * 100).toFixed(2)}% a.m.
                    </div>
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="escritorio-rate">Escritório (%)</Label>
                    <Input
                      id="escritorio-rate"
                      type="number"
                      step="0.01"
                      value={customRates.escritorio_rate}
                      onChange={(e) => handleRateChange("escritorio_rate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gestor-rate">Gestor (%)</Label>
                    <Input
                      id="gestor-rate"
                      type="number"
                      step="0.01"
                      value={customRates.gestor_rate}
                      onChange={(e) => handleRateChange("gestor_rate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lider-rate">Líder (%)</Label>
                    <Input
                      id="lider-rate"
                      type="number"
                      step="0.01"
                      value={customRates.lider_rate}
                      onChange={(e) => handleRateChange("lider_rate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessor-rate">Assessor (%)</Label>
                    <Input
                      id="assessor-rate"
                      type="number"
                      step="0.01"
                      value={customRates.assessor_rate}
                      onChange={(e) => handleRateChange("assessor_rate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investidor-rate">Investidor (%)</Label>
                    <Input
                      id="investidor-rate"
                      type="number"
                      step="0.01"
                      value={customRates.investidor_rate}
                      onChange={(e) => handleRateChange("investidor_rate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="indicacao-rate">Indicação (%)</Label>
                    <Input
                      id="indicacao-rate"
                      type="number"
                      step="0.01"
                      value={customRates.indicacao_rate}
                      onChange={(e) => handleRateChange("indicacao_rate", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {selectedProduct && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Total:</span>
                    <span className="text-lg font-bold">{(calculateTotalRate(customRates) * 100).toFixed(2)}%</span>
                    {!validateRateRedistribution(
                      customRates,
                      products.find((p) => p.id === selectedProduct)?.base_rate || 0,
                    ) && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>
                  <Button onClick={saveRateRedistribution}>Salvar Redistribuição</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Campanhas Promocionais
              </CardTitle>
              <CardDescription>Gestão de bônus mensais, trimestrais, semestrais e anuais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge variant={campaign.is_active ? "default" : "secondary"}>
                        {campaign.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <CardDescription>{campaign.conditions?.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Tipo:</span>
                        <div className="capitalize">{campaign.type}</div>
                      </div>
                      <div>
                        <span className="font-medium">Público:</span>
                        <div className="capitalize">{campaign.target_role}</div>
                      </div>
                      <div>
                        <span className="font-medium">Bônus:</span>
                        <div className="text-primary">+{(campaign.bonus_rate * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <span className="font-medium">Duração:</span>
                        <div>{campaign.bonus_duration} meses</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Analytics Akintec
              </CardTitle>
              <CardDescription>Métricas de performance e campanhas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Volume Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">R$ 45,2M</div>
                    <p className="text-sm text-muted-foreground">Captado no mês</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Comissões Pagas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">R$ 1,31M</div>
                    <p className="text-sm text-muted-foreground">Este mês</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Campanhas Ativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">7</div>
                    <p className="text-sm text-muted-foreground">Em andamento</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Taxa Retenção</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">94,2%</div>
                    <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
