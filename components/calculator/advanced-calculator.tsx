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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, Trophy, Gift, TrendingUp } from "lucide-react";

interface UserData {
  email: string;
}

interface PromotionalBonus {
  id: string;
  name: string;
  description: string;
  bonus: number;
  minValue?: number;
  isActive: boolean;
  expiresAt?: string;
}

const mockPromotionalBonuses: PromotionalBonus[] = [
  {
    id: "1",
    name: "Promoção Black Friday",
    description: "Bônus especial para captações em novembro",
    bonus: 0.5,
    minValue: 50000,
    isActive: true,
    expiresAt: "2024-11-30",
  },
  {
    id: "2",
    name: "Campanha Fim de Ano",
    description: "Incentivo para fechamento do ano",
    bonus: 0.8,
    minValue: 100000,
    isActive: true,
    expiresAt: "2024-12-31",
  },
  {
    id: "3",
    name: "Bônus Primeiro Trimestre",
    description: "Incentivo para início do ano",
    bonus: 0.3,
    isActive: true,
    expiresAt: "2024-03-31",
  },
];

export function AdvancedCalculator() {
  const [user, setUser] = useState<UserData | null>(null);
  const [capturedAmount, setCapturedAmount] = useState(100000);
  const [timeHorizon, setTimeHorizon] = useState([12]);
  const [poolParticipation, setPoolParticipation] = useState([5]);
  const [results, setResults] = useState<any>(null);
  const [activePromotions, setActivePromotions] = useState<PromotionalBonus[]>(
    []
  );

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    const currentPromotions = mockPromotionalBonuses.filter(
      (promo) =>
        promo.isActive && (!promo.minValue || capturedAmount >= promo.minValue)
    );
    setActivePromotions(currentPromotions);
  }, [capturedAmount]);

  const calculateCommissions = () => {
    const amount = capturedAmount;
    const months = timeHorizon[0];
    const poolShare = poolParticipation[0];

    // Base commission calculation
    const monthlyCommissionRate = 0.04;
    const monthlyCommission = amount * monthlyCommissionRate;
    const totalCommission = monthlyCommission * months;

    // Performance bonus calculation
    let performanceBonus = 0;
    let bonusDescription = "Nenhum bônus";

    if (amount >= 1000000) {
      performanceBonus = amount * 0.03 * months; // +3% additional (1% + 2%)
      bonusDescription = "Meta 2 atingida: +3% adicional";
    } else if (amount >= 500000) {
      performanceBonus = amount * 0.01 * months; // +1% additional
      bonusDescription = "Meta 1 atingida: +1% adicional";
    }

    const promotionalBonus = activePromotions.reduce((total, promo) => {
      return total + amount * (promo.bonus / 100) * months;
    }, 0);

    // Division calculation
    const advisorShare = totalCommission * 0.75;
    const officeShare = totalCommission * 0.25;

    // Pool calculation (annual)
    const annualPoolShare = (amount * 0.003 * 12 * poolShare) / 100; // 0.3% of annual commission * pool %

    const totalWithBonus =
      totalCommission + performanceBonus + promotionalBonus + annualPoolShare;

    setResults({
      monthlyCommission,
      totalCommission,
      performanceBonus,
      bonusDescription,
      promotionalBonus,
      advisorShare,
      officeShare,
      annualPoolShare,
      totalWithBonus,
      months,
      effectiveRate: ((totalWithBonus / amount / months) * 100).toFixed(2),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculadora Avançada
        </CardTitle>
        <CardDescription>
          Configure todos os parâmetros para uma simulação detalhada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* {activePromotions.length > 0 && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-primary">Promoções Ativas</h4>
              <Badge variant="secondary">
                +{activePromotions.reduce((sum, promo) => sum + promo.bonus, 0).toFixed(1)}%
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activePromotions.map((promo) => (
                <div key={promo.id} className="flex items-center justify-between p-2 bg-background rounded border">
                  <div>
                    <p className="text-sm font-medium">{promo.name}</p>
                    <p className="text-xs text-muted-foreground">{promo.description}</p>
                    {promo.expiresAt && (
                      <p className="text-xs text-orange-600">
                        Expira em: {new Date(promo.expiresAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">+{promo.bonus}%</Badge>
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* Input Controls */}
        <div className="grid md:grid-cols-1 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Total Captado (R$)</Label>
              <Input
                id="amount"
                type="number"
                value={capturedAmount}
                onChange={(e) =>
                  setCapturedAmount(Number.parseFloat(e.target.value) || 0)
                }
                min="0"
                step="10000"
              />
            </div>

            <div className="space-y-2">
              <Label>Horizonte de Tempo: {timeHorizon[0]} meses</Label>
              <Slider
                value={timeHorizon}
                onValueChange={setTimeHorizon}
                max={36}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 mês</span>
                <span>36 meses</span>
              </div>
            </div>

            {/* <div className="space-y-2">
              <Label>Participação no Pool Nacional: {poolParticipation[0]}%</Label>
              <Slider
                value={poolParticipation}
                onValueChange={setPoolParticipation}
                max={20}
                min={0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>20%</span>
              </div>
            </div> */}
          </div>

          <div className="space-y-4">
            {user && user.email === "felipe@aethosconsultoria.com.br" && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Status das Metas</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Meta 1 (R$ 3M):</span>
                    <Badge
                      variant={
                        capturedAmount >= 3000000 ? "default" : "secondary"
                      }
                    >
                      {capturedAmount >= 3000000 ? "Atingida" : "Não atingida"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Meta 2 (R$ 7M):</span>
                    <Badge
                      variant={
                        capturedAmount >= 7000000 ? "default" : "secondary"
                      }
                    >
                      {capturedAmount >= 7000000 ? "Atingida" : "Não atingida"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Meta 3 (R$ 15M):</span>
                    <Badge
                      variant={
                        capturedAmount >= 15000000 ? "default" : "secondary"
                      }
                    >
                      {capturedAmount >= 15000000 ? "Atingida" : "Não atingida"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Meta 4 (R$ 30M):</span>
                    <Badge
                      variant={
                        capturedAmount >= 30000000 ? "default" : "secondary"
                      }
                    >
                      {capturedAmount >= 30000000 ? "Atingida" : "Não atingida"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Meta 5 (R$ 50M):</span>
                    <Badge
                      variant={
                        capturedAmount >= 50000000 ? "default" : "secondary"
                      }
                    >
                      {capturedAmount >= 50000000 ? "Atingida" : "Não atingida"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button onClick={calculateCommissions} className="w-full" size="lg">
          <Calculator className="h-4 w-4 mr-2" />
          Calcular Comissões
        </Button>

        {/* Results */}
        {results && (
          <div className="space-y-6 pt-6 border-t">
            <h3 className="text-xl font-bold">Resultados da Simulação</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Comissão Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(results.monthlyCommission)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3% sobre base investida
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Comissão Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-secondary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(results.totalCommission)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {results.months} meses
                  </p>
                </CardContent>
              </Card>

              {/* <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Taxa Efetiva</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-accent">{results.effectiveRate}%</p>
                  <p className="text-xs text-muted-foreground">ao mês (com bônus)</p>
                </CardContent>
              </Card> */}
            </div>

            <div className="grid md:grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Divisão de Comissões
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                    <span className="font-medium">Assessor</span>
                    <span className="font-bold text-primary">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(results.advisorShare)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg">
                    <span className="font-medium">Escritório</span>
                    <span className="font-bold text-secondary">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(results.officeShare)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Bônus e Incentivos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-accent/5 rounded-lg">
                    <span className="text-sm text-muted-foreground">Bônus de Performance</span>
                    <p className="font-bold text-accent">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(results.performanceBonus)}
                    </p>
                    <p className="text-xs text-muted-foreground">{results.bonusDescription}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Pool Nacional</span>
                    <p className="font-bold">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(results.annualPoolShare)}
                    </p>
                    <p className="text-xs text-muted-foreground">{poolParticipation[0]}% do pool anual</p>
                  </div>
                </CardContent>
              </Card> */}
            </div>

            {/* <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-primary">Total com Todos os Bônus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.totalWithBonus)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Valor total considerando comissões base, bônus de performance
                  {results.promotionalBonus > 0 ? ", promoções ativas" : ""} e participação no pool nacional
                </p> */}
            {/* {results.promotionalBonus > 0 && (
                  <div className="mt-4 p-3 bg-accent/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-accent">Bônus Promocional</span>
                    </div>
                    <p className="text-2xl font-bold text-accent">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(results.promotionalBonus)}
                    </p>
                    <p className="text-xs text-muted-foreground">Promoções ativas aplicadas ao período</p>
                  </div>
                )} */}
            {/* </CardContent>
            </Card> */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
