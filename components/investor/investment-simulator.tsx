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
  const [period, setPeriod] = useState("");
  const [commitmentPeriod, setCommitmentPeriod] = useState("");
  const [withRescue, setWithRescue] = useState("");
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

  const calculateReturns = () => {
    const investmentAmount = Number.parseFloat(amount);
    const months = Number.parseInt(period);
    const commitment = Number.parseInt(commitmentPeriod) || 0;
    const isWithRescue = withRescue === "sim";

    if (!investmentAmount || !months) return;

    // Para o simulador de investimento do cliente, sempre usar taxa de investidor (2%)
    // pois estamos simulando o retorno que o cliente receberá
    const baseMonthlyRate = 0.02; // 2% - taxa do investidor

    let monthlyReturn: number;
    let totalReturn: number;
    let finalAmount: number;

    if (isWithRescue) {
      // Juros simples - retorno mensal fixo sobre o valor inicial
      monthlyReturn = investmentAmount * baseMonthlyRate;
      totalReturn = monthlyReturn * months;
      finalAmount = investmentAmount + totalReturn;
    } else {
      // Juros compostos - retorno mensal sobre o valor acumulado
      monthlyReturn = investmentAmount * baseMonthlyRate;
      finalAmount = investmentAmount * Math.pow(1 + baseMonthlyRate, months);
      totalReturn = finalAmount - investmentAmount;
    }

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <Label htmlFor="period">Período (meses)</Label>
            <Input
              id="period"
              type="number"
              placeholder="12"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commitment">Compromisso (meses)</Label>
            <Select
              value={commitmentPeriod}
              onValueChange={setCommitmentPeriod}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem compromisso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 meses</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withRescue">Com Resgate</Label>
            <Select value={withRescue} onValueChange={setWithRescue}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-lg border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Retorno Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.monthlyReturn)}
                </p>
                {/* {results.totalBonusRate > 0 && (
                  <p className="text-xs text-primary">
                    <TrendingUp className="h-3 w-3 inline mr-1" />+
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(
                      results.monthlyReturn - Number.parseFloat(amount) * 0.02,
                    )}{" "}
                    bônus
                  </p>
                )} */}
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
              {/* <div className="text-center">
                <p className="text-sm text-muted-foreground">Bônus Total</p>
                <p className="text-2xl font-bold text-accent">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.bonusReturn)}
                </p>
              </div> */}
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
