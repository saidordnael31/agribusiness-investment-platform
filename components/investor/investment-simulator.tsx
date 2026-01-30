"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Gift, TrendingUp } from "lucide-react";
import { Disclaimers } from "@/components/compliance/disclaimers";
import { getRateByPeriodAndLiquidity as getRateFromDB, getRentabilityConfig, type RentabilityConfig } from "@/lib/rentability-utils";
import { useUserType } from "@/hooks/useUserType";
import { getUserTypeHierarchy, getUserTypeFromId } from "@/lib/user-type-utils";
import { createClient } from "@/lib/supabase/client";

interface Bonification {
  id: string;
  type: "value" | "commitment" | "promotion";
  name: string;
  description: string;
  bonus: number;
  minValue?: number;
  minCommitment?: number;
  isActive: boolean;
}

export function InvestmentSimulator({ title }: { title?: string }) {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState("5000");
  const [commitmentPeriod, setCommitmentPeriod] = useState("");
  const [liquidity, setLiquidity] = useState("");
  const [results, setResults] = useState<{
    monthlyReturn: number;
    totalReturn: number;
    finalAmount: number;
    baseBonifications: Bonification[];
    totalBonusRate: number;
    bonusReturn: number;
  } | null>(null);
  
  // Usar hook para obter user_type_id do usuário logado
  const { user_type_id: loggedUserTypeId } = useUserType(user?.id);
  
  // Buscar user_type_id do investidor através das relações
  const [investorUserTypeId, setInvestorUserTypeId] = useState<number | null>(null);
  
  // Cache de taxas
  const [rateCache, setRateCache] = useState<Record<string, number>>({});
  
  // Configuração de rentabilidade do investidor
  const [rentabilityConfig, setRentabilityConfig] = useState<RentabilityConfig | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Buscar user_type_id do investidor através das relações do user_type logado
  useEffect(() => {
    const findInvestorUserTypeId = async () => {
      if (!loggedUserTypeId) return;

      try {
        // Limpar cache quando o user_type_id mudar para evitar valores antigos
        setRateCache({});
        
        // Buscar hierarquia (filhos) do user_type logado
        const childUserTypeIds = await getUserTypeHierarchy(loggedUserTypeId);
        
        if (childUserTypeIds.length === 0) {
          console.warn("[InvestmentSimulator] Nenhum filho encontrado para user_type:", loggedUserTypeId);
          // Se não tiver filhos, pode ser que seja um investidor simulando para si mesmo
          // Nesse caso, usar o próprio user_type_id
          setInvestorUserTypeId(loggedUserTypeId);
          return;
        }

        // Buscar qual dos filhos é o investidor
        const supabase = createClient();
        const { data: childUserTypes } = await supabase
          .from("user_types")
          .select("id, user_type, name")
          .in("id", childUserTypeIds);

        if (!childUserTypes || childUserTypes.length === 0) {
          console.warn("[InvestmentSimulator] Não foi possível buscar tipos filhos");
          setInvestorUserTypeId(loggedUserTypeId);
          return;
        }

        // Procurar pelo tipo "investor" ou "investidor"
        const investorType = childUserTypes.find(
          (ut) => ut.user_type === "investor"
        );

        if (investorType) {
          console.log("[InvestmentSimulator] Investor user_type_id encontrado:", investorType.id);
          setInvestorUserTypeId(investorType.id);
        } else {
          // Se não encontrar investidor específico, usar o primeiro filho disponível
          console.warn("[InvestmentSimulator] Tipo investidor não encontrado, usando primeiro filho:", childUserTypes[0]);
          setInvestorUserTypeId(childUserTypes[0].id);
        }
      } catch (error) {
        console.error("[InvestmentSimulator] Erro ao buscar user_type_id do investidor:", error);
        // Fallback: usar o próprio user_type_id
        setInvestorUserTypeId(loggedUserTypeId);
      }
    };

    findInvestorUserTypeId();
  }, [loggedUserTypeId]);

  // Buscar configuração de rentabilidade quando investorUserTypeId mudar
  useEffect(() => {
    const fetchRentabilityConfig = async () => {
      if (!investorUserTypeId) {
        setRentabilityConfig(null);
        return;
      }

      try {
        // Buscar user_type para obter rentability_id
        const userType = await getUserTypeFromId(investorUserTypeId);
        if (!userType || !userType.rentability_id) {
          console.warn("[InvestmentSimulator] User type sem rentability_id");
          setRentabilityConfig(null);
          return;
        }

        // Buscar configuração de rentabilidade
        const config = await getRentabilityConfig(userType.rentability_id);
        setRentabilityConfig(config);
        console.log("[InvestmentSimulator] Configuração de rentabilidade carregada:", config);
      } catch (error) {
        console.error("[InvestmentSimulator] Erro ao buscar configuração de rentabilidade:", error);
        setRentabilityConfig(null);
      }
    };

    fetchRentabilityConfig();
  }, [investorUserTypeId]);

  // Pré-carregar taxa quando commitmentPeriod ou liquidity mudarem
  useEffect(() => {
    if (!investorUserTypeId || !commitmentPeriod || !liquidity) return;
    
    // Normalizar liquidez para garantir compatibilidade
    const normalizedLiquidity = liquidity.charAt(0).toUpperCase() + liquidity.slice(1).toLowerCase();
    const cacheKey = `${commitmentPeriod}-${normalizedLiquidity}`;
    if (rateCache[cacheKey] !== undefined) {
      // Se já está no cache, disparar cálculo automático
      const investmentAmount = Number.parseFloat(amount);
      if (investmentAmount && rateCache[cacheKey] > 0) {
        const period = Number.parseInt(commitmentPeriod);
        const finalAmount = investmentAmount * Math.pow(1 + rateCache[cacheKey], period);
        const totalReturn = finalAmount - investmentAmount;
        const monthlyReturn = investmentAmount * rateCache[cacheKey];
        setResults({
          monthlyReturn,
          totalReturn,
          finalAmount,
          baseBonifications: [],
          totalBonusRate: 0,
          bonusReturn: 0,
        });
      }
      return;
    }
    
    getRateByPeriodAndLiquidity(Number.parseInt(commitmentPeriod), liquidity).then((rate) => {
      if (rate > 0) {
        // Usar a chave normalizada no cache
        setRateCache((prev) => ({ ...prev, [cacheKey]: rate }));
        
        // Disparar cálculo automático após carregar a taxa
        const investmentAmount = Number.parseFloat(amount);
        if (investmentAmount) {
          const period = Number.parseInt(commitmentPeriod);
          const finalAmount = investmentAmount * Math.pow(1 + rate, period);
          const totalReturn = finalAmount - investmentAmount;
          const monthlyReturn = investmentAmount * rate;
          setResults({
            monthlyReturn,
            totalReturn,
            finalAmount,
            baseBonifications: [],
            totalBonusRate: 0,
            bonusReturn: 0,
          });
        }
      }
    }).catch((error) => {
      console.warn("[InvestmentSimulator] Erro ao pré-carregar taxa:", error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitmentPeriod, liquidity, investorUserTypeId, amount]);

  // Calcular retornos automaticamente quando a taxa estiver disponível
  useEffect(() => {
    const autoCalculate = async () => {
      const investmentAmount = Number.parseFloat(amount);
      const period = Number.parseInt(commitmentPeriod);
      const selectedLiquidity = liquidity;

      // Verificar se todos os campos necessários estão preenchidos
      if (!investmentAmount || !period || !selectedLiquidity || !investorUserTypeId) {
        setResults(null);
        return;
      }

      // Normalizar liquidez para verificar no cache
      const normalizedLiquidity = selectedLiquidity.charAt(0).toUpperCase() + selectedLiquidity.slice(1).toLowerCase();
      const cacheKey = `${period}-${normalizedLiquidity}`;
      
      // Verificar se a taxa está no cache
      const cachedRate = rateCache[cacheKey];
      if (cachedRate === undefined || cachedRate === 0) {
        // Se não estiver no cache, tentar buscar
        const rate = await getRateByPeriodAndLiquidity(period, selectedLiquidity);
        if (rate === 0) {
          setResults(null);
          return;
        }
        // A taxa será adicionada ao cache pela função getRateByPeriodAndLiquidity
        // Mas precisamos calcular agora
        const finalAmount = investmentAmount * Math.pow(1 + rate, period);
        const totalReturn = finalAmount - investmentAmount;
        const monthlyReturn = investmentAmount * rate;

        setResults({
          monthlyReturn,
          totalReturn,
          finalAmount,
          baseBonifications: [],
          totalBonusRate: 0,
          bonusReturn: 0,
        });
        return;
      }

      // Se a taxa estiver no cache, calcular diretamente
      const finalAmount = investmentAmount * Math.pow(1 + cachedRate, period);
      const totalReturn = finalAmount - investmentAmount;
      const monthlyReturn = investmentAmount * cachedRate;

      setResults({
        monthlyReturn,
        totalReturn,
        finalAmount,
        baseBonifications: [],
        totalBonusRate: 0,
        bonusReturn: 0,
      });
    };

    autoCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, commitmentPeriod, liquidity, investorUserTypeId]);

  // Função para obter rentabilidade usando user_type_id do INVESTIDOR (filho) -> rentability_id -> função get
  const getRateByPeriodAndLiquidity = async (period: number, liquidity: string): Promise<number> => {
    // Normalizar liquidez para garantir compatibilidade (primeira letra maiúscula)
    const normalizedLiquidity = liquidity.charAt(0).toUpperCase() + liquidity.slice(1).toLowerCase();
    const cacheKey = `${period}-${normalizedLiquidity}`;
    
    // Verificar cache primeiro
    if (rateCache[cacheKey] !== undefined) {
      const cachedRate = rateCache[cacheKey];
      console.log(`[InvestmentSimulator] Taxa do cache para ${period} meses, ${normalizedLiquidity}:`, cachedRate, `(${(cachedRate * 100).toFixed(2)}%)`);
      return cachedRate;
    }
    
    // Usar user_type_id do investidor (filho), não do usuário logado
    if (!investorUserTypeId) {
      console.error("[InvestmentSimulator] investorUserTypeId não disponível");
      return 0;
    }

    try {
      // Usar função centralizada que busca: investor_user_type_id -> user_types.rentability_id -> get_rentability_config
      // Isso garante que estamos usando a rentabilidade do investidor, não do assessor/escritório
      // A função getRateFromDB retorna em DECIMAL (ex: 0.0145 para 1.45%)
      const rate = await getRateFromDB(investorUserTypeId, period, normalizedLiquidity);
      console.log(`[InvestmentSimulator] Taxa obtida do banco para ${period} meses, ${normalizedLiquidity}:`, rate, `(${(rate * 100).toFixed(2)}%)`);
      
      // Garantir que a taxa está em formato decimal (não porcentagem)
      // Se a taxa for maior que 1, provavelmente está em porcentagem e precisa ser convertida
      const finalRate = rate > 1 ? rate / 100 : rate;
      
      if (finalRate > 0) {
        setRateCache((prev) => ({ ...prev, [cacheKey]: finalRate }));
        return finalRate;
      }
      
      console.warn("[InvestmentSimulator] Taxa não encontrada para período", period, "e liquidez", normalizedLiquidity);
      return 0;
    } catch (error) {
      console.error("[InvestmentSimulator] Erro ao buscar rentabilidade:", error);
      return 0;
    }
  };

  // Função para obter opções de liquidez disponíveis baseadas no prazo e na configuração de rentabilidade
  const getAvailableLiquidityOptions = (period: number): string[] => {
    // Se não tiver configuração de rentabilidade, retornar array vazio
    if (!rentabilityConfig || !rentabilityConfig.periods) {
      return [];
    }

    // Encontrar período correspondente
    const periodConfig = rentabilityConfig.periods.find((p) => p.months === period);
    if (!periodConfig || !periodConfig.rates) {
      return [];
    }

    // Mapear as chaves de rates disponíveis para nomes de liquidez
    const availableLiquidity: string[] = [];
    
    // Mapeamento reverso: rate key -> nome de liquidez
    if (periodConfig.rates.monthly !== undefined && periodConfig.rates.monthly !== null) {
      availableLiquidity.push("mensal");
    }
    if (periodConfig.rates.semiannual !== undefined && periodConfig.rates.semiannual !== null) {
      availableLiquidity.push("semestral");
    }
    if (periodConfig.rates.annual !== undefined && periodConfig.rates.annual !== null) {
      availableLiquidity.push("anual");
    }
    if (periodConfig.rates.biennial !== undefined && periodConfig.rates.biennial !== null) {
      availableLiquidity.push("bienal");
    }
    if (periodConfig.rates.triennial !== undefined && periodConfig.rates.triennial !== null) {
      availableLiquidity.push("trienal");
    }

    return availableLiquidity;
  };

  const calculateReturns = async () => {
    const investmentAmount = Number.parseFloat(amount);
    const period = Number.parseInt(commitmentPeriod);
    const selectedLiquidity = liquidity;

    if (!investmentAmount || !period || !selectedLiquidity) return;

    // Obter a taxa baseada no prazo e liquidez selecionados (assíncrono)
    // A função getRateByPeriodAndLiquidity já retorna em decimal (0.0155 para 1.55%)
    const monthlyRate = await getRateByPeriodAndLiquidity(period, selectedLiquidity);

    if (monthlyRate === 0) return;

    // Calcular juros compostos mensais
    const finalAmount = investmentAmount * Math.pow(1 + monthlyRate, period);
    const totalReturn = finalAmount - investmentAmount;
    const monthlyReturn = investmentAmount * monthlyRate;

    setResults({
      monthlyReturn,
      totalReturn,
      finalAmount,
      baseBonifications: [],
      totalBonusRate: 0,
      bonusReturn: 0,
    });
  };

  // Se tiver título, é para distribuidor/assessor - usar novo layout
  // Se não tiver título, é para investidor - manter layout original
  const isDistributorVersion = !!title;

  if (isDistributorVersion) {
    return (
      <Card className="bg-gradient-to-b from-[#D9D9D9] via-[#596D7E] to-[#01223F] border-gray-200 rounded-lg relative overflow-hidden h-full">
        {/* Calculator Icon Background */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center overflow-hidden pointer-events-none z-0">
          <Calculator className="h-[90%] w-auto text-white" style={{ transform: 'translateX(20%)' }} />
        </div>
        
        <CardHeader className="pb-4 relative z-10">
          <CardTitle className="text-[#003F28] text-xl font-bold mb-2">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm mt-1">
            Simule os retornos do investimento no Clube de Investimento Privado do Agronegócio
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white">
                Valor do Investimento
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="5000"
                className="bg-[#D9D9D9]/45 border-gray-300 text-[#003F28]"
              />
              <p className="text-xs text-white/70">
                Mínimo: R$ 5.000,00
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commitment" className="text-white">
                  Prazo
                </Label>
                <Select
                  value={commitmentPeriod}
                  onValueChange={(value) => {
                    setCommitmentPeriod(value);
                    // Reset liquidez quando mudar o prazo
                    setLiquidity("");
                    // Limpar resultados quando mudar o prazo
                    setResults(null);
                  }}
                >
                  <SelectTrigger className="bg-[#D9D9D9]/45 border-gray-300 text-[#003F28]">
                    <SelectValue placeholder="Selecione o prazo" />
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
                <Label htmlFor="liquidity" className="text-white">
                  Liquidez da Rentabilidade
                </Label>
                <Select 
                  value={liquidity} 
                  onValueChange={setLiquidity}
                  disabled={!commitmentPeriod}
                >
                  <SelectTrigger className="bg-[#D9D9D9]/45 border-gray-300 text-[#003F28]">
                    <SelectValue placeholder="Selecione a liquidez" />
                  </SelectTrigger>
                  <SelectContent>
                    {commitmentPeriod ? (
                      (() => {
                        const availableOptions = getAvailableLiquidityOptions(Number.parseInt(commitmentPeriod));
                        if (availableOptions.length > 0) {
                          return availableOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                          ));
                        } else {
                          // Se não houver opções, não renderizar nenhum item
                          return null;
                        }
                      })()
                    ) : null}
                  </SelectContent>
                </Select>
            </div>
          </div>

          {results && (
            <div className="space-y-4">
              <div className="p-4 bg-[#D9D9D9]/45 rounded-lg border border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-[#003F28]" />
                  <h4 className="font-semibold text-[#003F28]">Taxa Aplicada</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Prazo: {commitmentPeriod} meses | Liquidez: {liquidity.charAt(0).toUpperCase() + liquidity.slice(1)}
                </p>
                <p className="text-lg font-bold text-[#00BC6E]">
                  {(() => {
                    const normalizedLiquidity = liquidity.charAt(0).toUpperCase() + liquidity.slice(1).toLowerCase();
                    const cachedRate = rateCache[`${commitmentPeriod}-${normalizedLiquidity}`] || 0;
                    // A taxa já está em decimal, multiplicar por 100 para exibir como porcentagem
                    return (cachedRate * 100).toFixed(2);
                  })()}% a.m.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#D9D9D9]/45 rounded-lg border border-gray-300">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Retorno Mensal</p>
                  <p className="text-2xl font-bold text-[#00BC6E]">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(results.monthlyReturn)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Retorno Total</p>
                  <p className="text-2xl font-bold text-[#003F28]">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(results.totalReturn)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Valor Final</p>
                  <p className="text-2xl font-bold text-[#003F28]">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(results.finalAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Layout original para investidor
  return (
    <Card className="border-0 p-6 relative overflow-hidden" style={{ borderRadius: '15px', background: 'linear-gradient(to bottom, #003F28, #00A568)' }}>
      {/* Calculator Icon Background */}
      <div className="absolute right-0 top-0 bottom-0 opacity-20 flex items-center justify-center overflow-hidden pointer-events-none z-0">
        <Calculator className="h-[90%] w-auto text-white" style={{ transform: 'translateX(20%)' }} />
      </div>
      
      <CardHeader className="text-center pb-4 relative z-10">
        <CardTitle className="text-white font-urbanist font-extrabold text-[35px] leading-[28px] mb-2">
          SIMULADOR DE INVESTIMENTOS
        </CardTitle>
        <CardDescription className="text-white font-ibm-plex-sans font-normal text-lg leading-[35px] text-center">
          Simule os retornos do seu investimento no Clube de Investimento Privado do Agronegócio
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 relative z-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white font-ibm-plex-sans font-normal text-lg">
              Valor do Investimento
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="5000"
              className="bg-[#D9D9D9] border-[#D9D9D9] text-[#003F28] font-ibm-plex-sans font-normal text-lg"
              style={{ width: '214px' }}
            />
            <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm">
              Mínimo: R$ 5.000,00
            </p>
          </div>

          <div className="flex justify-between" style={{ width: '511px' }}>
            <div className="space-y-2">
              <Label htmlFor="commitment" className="text-white font-ibm-plex-sans font-normal text-lg">
                Prazo
              </Label>
              <Select
                value={commitmentPeriod}
                onValueChange={(value) => {
                  setCommitmentPeriod(value);
                  setLiquidity(""); // Reset liquidez quando mudar o prazo
                }}
              >
                <SelectTrigger className="bg-[#D9D9D9] border-[#D9D9D9] text-[#003F28] font-ibm-plex-sans font-normal text-lg" style={{ width: '214px' }}>
                  <SelectValue placeholder="Selecione o prazo" />
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
              <Label htmlFor="liquidity" className="text-white font-ibm-plex-sans font-normal text-lg">
                Liquidez da Rentabilidade
              </Label>
              <Select 
                value={liquidity} 
                onValueChange={setLiquidity}
                disabled={!commitmentPeriod}
              >
                <SelectTrigger className="bg-[#D9D9D9] border-[#D9D9D9] text-[#003F28] font-ibm-plex-sans font-normal text-lg" style={{ width: '214px' }}>
                  <SelectValue placeholder="Selecione a liquidez" />
                </SelectTrigger>
                <SelectContent>
                  {commitmentPeriod ? (
                    (() => {
                      const availableOptions = getAvailableLiquidityOptions(Number.parseInt(commitmentPeriod));
                      if (availableOptions.length > 0) {
                        return availableOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                        ));
                      } else {
                        // Se não houver opções, não renderizar nenhum item
                        return null;
                      }
                    })()
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {results && (
          <div className="space-y-6">
            <div className="p-4 bg-white/10 rounded-lg border border-white/20 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-white" />
                <h4 className="font-semibold text-white">Taxa Aplicada</h4>
              </div>
              <p className="text-sm text-white/80">
                Prazo: {commitmentPeriod} meses | Liquidez: {liquidity.charAt(0).toUpperCase() + liquidity.slice(1)}
              </p>
              <p className="text-lg font-bold text-[#00FF88]">
                {(() => {
                  const normalizedLiquidity = liquidity.charAt(0).toUpperCase() + liquidity.slice(1).toLowerCase();
                  const cachedRate = rateCache[`${commitmentPeriod}-${normalizedLiquidity}`] || 0;
                  // A taxa já está em decimal, multiplicar por 100 para exibir como porcentagem
                  return (cachedRate * 100).toFixed(1);
                })()}% a.m.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg border border-white/20">
              <div className="text-center">
                <p className="text-sm text-white/70">Retorno Mensal</p>
                <p className="text-2xl font-bold text-[#00FF88]">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.monthlyReturn)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-white/70">Retorno Total</p>
                <p className="text-2xl font-bold text-white">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.totalReturn)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-white/70">Valor Final</p>
                <p className="text-2xl font-bold text-white">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.finalAmount)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}