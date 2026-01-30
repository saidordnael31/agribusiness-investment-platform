"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, TrendingUp, Settings, Target, Award, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

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

interface HierarchyStats {
  totalOffices: number
  totalAdvisors: number
  totalInvestors: number
  offices: Array<{
    id: string
    name: string
    cnpj: string
    status: string
    managers: Array<{
      name: string
      leaders_count: number
      advisors_count: number
    }>
    total_investors: number
  }>
}

export default function AkintecManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [commissionStructures, setCommissionStructures] = useState<CommissionStructure[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [hierarchyStats, setHierarchyStats] = useState<HierarchyStats>({
    totalOffices: 0,
    totalAdvisors: 0,
    totalInvestors: 0,
    offices: [],
  })
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [loading, setLoading] = useState(true)
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
    setLoading(true)
    try {
      await Promise.all([loadProducts(), loadCommissionStructures(), loadCampaigns(), loadHierarchyStats()])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados da plataforma")
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("akintec_products").select("*").order("min_investment")

    if (error) {
      console.error("Erro ao carregar produtos:", error)
      // Fallback para dados básicos se não houver produtos cadastrados
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
    } else {
      setProducts(data || [])
    }
  }

  const loadCommissionStructures = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("akintec_commission_structures")
      .select("*")
      .order("investment_range_min")

    if (error) {
      console.error("Erro ao carregar estruturas de comissão:", error)
      setCommissionStructures([])
    } else {
      setCommissionStructures(data || [])
    }
  }

  const loadCampaigns = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao carregar campanhas:", error)
      setCampaigns([])
    } else {
      setCampaigns(data || [])
    }
  }

  const loadHierarchyStats = async () => {
    const supabase = createClient()

    try {
      // Buscar estatísticas gerais
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_type, office_id, full_name, status")

      if (profilesError) {
        console.error("Erro ao carregar perfis:", profilesError)
        return
      }

      const offices = profiles?.filter((p) => p.user_type === "escritorio") || []
      const advisors = profiles?.filter((p) => p.user_type === "assessor") || []
      const investors = profiles?.filter((p) => p.user_type === "investidor") || []

      // Buscar investimentos para calcular totais por escritório
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("amount, user_id, profiles!inner(office_id, user_type)")

      if (investmentsError) {
        console.error("Erro ao carregar investimentos:", investmentsError)
      }

      // Construir estrutura hierárquica
      const officesData = offices.map((office) => {
        const officeAdvisors = advisors.filter((a) => a.office_id === office.office_id)
        const officeInvestors = investors.filter((i) => i.office_id === office.office_id)

        return {
          id: office.office_id || office.id,
          name: office.full_name || "Escritório",
          cnpj: "00.000.000/0001-00", // Placeholder - adicionar campo CNPJ na tabela se necessário
          status: office.status || "Ativo",
          managers: [
            {
              name: office.full_name || "Gestor",
              leaders_count: Math.floor(officeAdvisors.length / 3), // Estimativa
              advisors_count: officeAdvisors.length,
            },
          ],
          total_investors: officeInvestors.length,
        }
      })

      setHierarchyStats({
        totalOffices: offices.length,
        totalAdvisors: advisors.length,
        totalInvestors: investors.length,
        offices: officesData,
      })
    } catch (error) {
      console.error("Erro ao carregar estatísticas de hierarquia:", error)
      setHierarchyStats({
        totalOffices: 0,
        totalAdvisors: 0,
        totalInvestors: 0,
        offices: [],
      })
    }
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

    // Validar se é admin
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      toast.error("Usuário não autenticado");
      return;
    }

    const loggedUser = JSON.parse(userStr);
    const { validateAdminAccess } = await import("@/lib/client-permission-utils");
    const isAdmin = await validateAdminAccess(loggedUser.id);
    
    if (!isAdmin) {
      toast.error("Apenas administradores podem modificar estruturas de comissão");
      return;
    }

    const supabase = createClient()
    const { error } = await supabase.from("akintec_commission_structures").upsert({
      product_id: selectedProduct,
      ...customRates,
      total_rate: calculateTotalRate(customRates),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Erro ao salvar redistribuição:", error)
      toast.error("Erro ao salvar redistribuição de taxas")
    } else {
      toast.success("Redistribuição de taxas salva com sucesso!")
      await loadCommissionStructures()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados da plataforma...</span>
      </div>
    )
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
                    <div className="text-2xl font-bold text-primary">{hierarchyStats.totalOffices}</div>
                    <p className="text-sm text-muted-foreground">Ativos na plataforma</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Assessores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{hierarchyStats.totalAdvisors}</div>
                    <p className="text-sm text-muted-foreground">Total na rede</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Investidores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {hierarchyStats.totalInvestors.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Clientes ativos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Estrutura por Escritório</h4>
                {hierarchyStats.offices.length > 0 ? (
                  hierarchyStats.offices.map((office) => (
                    <div key={office.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {office.name} (CNPJ: {office.cnpj})
                        </span>
                        <Badge variant="outline">{office.status}</Badge>
                      </div>
                      <div className="ml-4 space-y-1 text-sm text-muted-foreground">
                        {office.managers.map((manager, index) => (
                          <div key={index}>
                            <div>
                              ├── Gestor: {manager.name} ({manager.leaders_count} líderes)
                            </div>
                            <div>├── Assessores: {manager.advisors_count} ativos</div>
                          </div>
                        ))}
                        <div>└── Total: {office.total_investors} investidores</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum escritório cadastrado ainda</p>
                    <p className="text-sm">Os escritórios aparecerão aqui quando forem cadastrados</p>
                  </div>
                )}
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
              {products.length > 0 ? (
                products.map((product) => (
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
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum produto cadastrado ainda</p>
                  <p className="text-sm">Os produtos aparecerão aqui quando forem configurados</p>
                </div>
              )}
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
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
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
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma campanha ativa</p>
                  <p className="text-sm">As campanhas aparecerão aqui quando forem criadas</p>
                </div>
              )}
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
                    <div className="text-2xl font-bold text-primary">R$ 0</div>
                    <p className="text-sm text-muted-foreground">Captado no mês</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Comissões Pagas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">R$ 0</div>
                    <p className="text-sm text-muted-foreground">Este mês</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Campanhas Ativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{campaigns.length}</div>
                    <p className="text-sm text-muted-foreground">Em andamento</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Taxa Retenção</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">0%</div>
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
