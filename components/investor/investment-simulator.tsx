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
  const [amount, setAmount] = useState("");
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

  // const getApplicableBonifications = (
  //   investmentAmount: number,
  //   commitment: number
  // ): Bonification[] => {
  //   return mockBonifications.filter((bonification) => {
  //     if (!bonification.isActive) return false;

  //     switch (bonification.type) {
  //       case "value":
  //         return bonification.minValue
  //           ? investmentAmount >= bonification.minValue
  //           : true;
  //       case "commitment":
  //         return bonification.minCommitment
  //           ? commitment >= bonification.minCommitment
  //           : true;
  //       case "promotion":
  //         return true;
  //       default:
  //         return false;
  //     }
  //   });
  // };

  // Função para obter a taxa baseada no prazo e liquidez
  const getRateByPeriodAndLiquidity = (period: number, liquidity: string): number => {
    const rates: { [key: string]: { [key: string]: number } } = {
      "3": {
        "mensal": 0.018, // 1.8%
      },
      "6": {
        "mensal": 0.019, // 1.9%
        "semestral": 0.02, // 2%
      },
      "12": {
        "mensal": 0.021, // 2.1%
        "semestral": 0.022, // 2.2%
        "anual": 0.025, // 2.5%
      },
      "24": {
        "mensal": 0.023, // 2.3%
        "semestral": 0.025, // 2.5%
        "anual": 0.027, // 2.7%
        "bienal": 0.03, // 3%
      },
      "36": {
        "mensal": 0.024, // 2.4%
        "semestral": 0.026, // 2.6%
        "anual": 0.03, // 3%
        "bienal": 0.035, // 3.5%
        "trienal": 0.035, // 3.5% (igual ao bienal)
      },
    };

    return rates[period.toString()]?.[liquidity] || 0;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {title || "Simulador de Investimentos"}
        </CardTitle>
        {!title && (
          <CardDescription>
            Simule os retornos do seu investimento no Clube de Investimentos
            Privado do Agronegócio
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Investimento</Label>
            <Input
              id="amount"
              type="number"
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="5000"
            />
            <p className="text-xs text-muted-foreground">Mínimo: R$ 5.000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commitment">Prazo</Label>
            <Select
              value={commitmentPeriod}
              onValueChange={(value) => {
                setCommitmentPeriod(value);
                setLiquidity(""); // Reset liquidez quando mudar o prazo
              }}
            >
              <SelectTrigger>
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
            <Label htmlFor="liquidity">Liquidez da Rentabilidade</Label>
            <Select 
              value={liquidity} 
              onValueChange={setLiquidity}
              disabled={!commitmentPeriod}
            >
              <SelectTrigger>
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

        <Button onClick={calculateReturns} className="w-full">
          Calcular Retornos
        </Button>

        {results && (
          <div className="space-y-6">
            {/* {results.baseBonifications.length > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-primary">Bonificações Aplicadas</h4>
                  <Badge variant="secondary">+{results.totalBonusRate.toFixed(1)}% a.m.</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {results.baseBonifications.map((bonus) => (
                    <div key={bonus.id} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div>
                        <p className="text-sm font-medium">{bonus.name}</p>
                        <p className="text-xs text-muted-foreground">{bonus.description}</p>
                      </div>
                      <Badge variant="outline">+{bonus.bonus}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-primary">Taxa Aplicada</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Prazo: {commitmentPeriod} meses | Liquidez: {liquidity.charAt(0).toUpperCase() + liquidity.slice(1)}
              </p>
              <p className="text-lg font-bold text-primary">
                {(getRateByPeriodAndLiquidity(Number.parseInt(commitmentPeriod), liquidity) * 100).toFixed(1)}% a.m.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-lg border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Retorno Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.monthlyReturn)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Retorno Total</p>
                <p className="text-2xl font-bold text-secondary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.totalReturn)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor Final</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.finalAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        <Disclaimers variant="compact" />
      </CardContent>
    </Card>
  );
}
