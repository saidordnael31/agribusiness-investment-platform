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
  const [user, setUser] = useState<null>(null);
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

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Função para obter a taxa baseada no prazo e liquidez
  const getRateByPeriodAndLiquidity = (period: number, liquidity: string): number => {
    // Tabela padrão (investidores em geral)
    const defaultRates: { [key: string]: { [key: string]: number } } = {
      "3": {
        mensal: 0.018, // 1,8%
      },
      "6": {
        mensal: 0.019, // 1,9%
        semestral: 0.02, // 2,0%
      },
      "12": {
        mensal: 0.021, // 2,1%
        semestral: 0.022, // 2,2%
        anual: 0.025, // 2,5%
      },
      "24": {
        mensal: 0.023, // 2,3%
        semestral: 0.025, // 2,5%
        anual: 0.027, // 2,7%
        bienal: 0.03, // 3,0%
      },
      "36": {
        mensal: 0.024, // 2,4%
        semestral: 0.026, // 2,6%
        anual: 0.03, // 3,0%
        bienal: 0.032, // 3,2%
        trienal: 0.035, // 3,5%
      },
    };

    // Tabela especial para investidores de assessores externos
    // Mapeando D+90/180/360/720/1080 para 3/6/12/24/36 meses
    const externalAdvisorRates: { [key: string]: { [key: string]: number } } = {
      "3": {
        mensal: 0.0135, // 1,35%
      },
      "6": {
        mensal: 0.014,  // 1,40%
        semestral: 0.0145, // 1,45%
      },
      "12": {
        mensal: 0.015,  // 1,50%
        semestral: 0.0155, // 1,55%
        anual: 0.016, // 1,60%
      },
      "24": {
        mensal: 0.0165, // 1,65%
        semestral: 0.017, // 1,70%
        anual: 0.0175, // 1,75%
        bienal: 0.018, // 1,80%
      },
      "36": {
        mensal: 0.0185, // 1,85%
        semestral: 0.019, // 1,90%
        bienal: 0.0195, // 1,95%
        trienal: 0.02, // 2,00%
      },
    };

    const currentUser: any = user;
    const isExternalAdvisor =
      currentUser && (currentUser.role === "assessor_externo" || currentUser.user_type === "assessor_externo");

    const table = isExternalAdvisor ? externalAdvisorRates : defaultRates;
    return table[period.toString()]?.[liquidity] || 0;
  };

  // Função para obter opções de liquidez disponíveis baseadas no prazo
  const getAvailableLiquidityOptions = (period: number): string[] => {
    const options: { [key: string]: string[] } = {
      "3": ["mensal"],
      "6": ["mensal", "semestral"],
      "12": ["mensal", "semestral", "anual"],
      "24": ["mensal", "semestral", "anual", "bienal"],
      "36": ["mensal", "semestral", "anual", "bienal", "trienal"],
    };

    return options[period.toString()] || [];
  };

  const calculateReturns = () => {
    const investmentAmount = Number.parseFloat(amount);
    const period = Number.parseInt(commitmentPeriod);
    const selectedLiquidity = liquidity;

    if (!investmentAmount || !period || !selectedLiquidity) return;

    // Obter a taxa baseada no prazo e liquidez selecionados
    const monthlyRate = getRateByPeriodAndLiquidity(period, selectedLiquidity);

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
      <Card className="bg-gradient-to-b from-[#D9D9D9] via-[#596D7E] to-[#01223F] border-gray-200 rounded-lg relative overflow-hidden">
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
          <div className="space-y-6">
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
                    setLiquidity(""); // Reset liquidez quando mudar o prazo
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
                    {getAvailableLiquidityOptions(Number.parseInt(commitmentPeriod)).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button 
            onClick={calculateReturns} 
            className="w-full bg-[#01223F] hover:bg-[#01223F]/80 text-white"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Retornos
          </Button>

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
                  {(getRateByPeriodAndLiquidity(Number.parseInt(commitmentPeriod), liquidity) * 100).toFixed(1)}% a.m.
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
                  {getAvailableLiquidityOptions(Number.parseInt(commitmentPeriod)).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button 
          onClick={calculateReturns} 
          className="bg-[#003562] hover:bg-[#003562]/80 text-white font-ibm-plex-sans font-bold text-lg py-3"
          style={{ width: '511px' }}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Calcular Retornos
        </Button>

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
                {(getRateByPeriodAndLiquidity(Number.parseInt(commitmentPeriod), liquidity) * 100).toFixed(1)}% a.m.
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