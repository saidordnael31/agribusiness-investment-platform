"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Minus,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface Investment {
  id: string;
  quota_type: "senior" | "subordinada";
  amount: number;
  monthly_return_rate: number;
  commitment_period: number;
  created_at: string;
  status: string;
}

interface UserInvestmentSummary {
  totalInvested: number;
  totalMonthlyReturn: number;
  totalAccumulatedReturn: number;
  totalValue: number;
  investments: Investment[];
}

export function WithdrawFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<"summary" | "confirmation" | "success">(
    "summary"
  );
  const [withdrawType, setWithdrawType] = useState<"partial" | "total" | "monthly_return">(
    "monthly_return"
  );
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userSummary, setUserSummary] = useState<UserInvestmentSummary>({
    totalInvested: 0,
    totalMonthlyReturn: 0,
    totalAccumulatedReturn: 0,
    totalValue: 0,
    investments: []
  });

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setUser(JSON.parse(user));
    }
  }, []);
  const calculateAccumulatedReturn = (investment: Investment) => {
    try {
      // Verifica se os dados necessários existem
      if (!investment.created_at || !investment.amount || !investment.monthly_return_rate) {
        console.warn('Dados incompletos do investimento:', investment);
        return 0;
      }

      const createdDate = new Date(investment.created_at);
      const currentDate = new Date();
      
      // Verifica se as datas são válidas
      if (isNaN(createdDate.getTime()) || isNaN(currentDate.getTime())) {
        console.warn('Data inválida:', { created_at: investment.created_at });
        return 0;
      }
      
      // Calcula quantos meses completos se passaram desde a criação
      const monthsElapsed = (currentDate.getFullYear() - createdDate.getFullYear()) * 12 + 
                           (currentDate.getMonth() - createdDate.getMonth());
      
      // Se ainda não completou 1 mês, retorna 0
      if (monthsElapsed < 1) return 0;
      
      // Calcula o retorno acumulado baseado nos meses completos
      const amount = Number(investment.amount);
      const rate = Number(investment.monthly_return_rate);
      
      if (isNaN(amount) || isNaN(rate)) {
        console.warn('Valores inválidos:', { amount: investment.amount, rate: investment.monthly_return_rate });
        return 0;
      }
      
      const monthlyReturn = amount * rate;
      const accumulatedReturn = monthlyReturn * monthsElapsed;
      
      return accumulatedReturn;
    } catch (error) {
      console.error('Erro ao calcular retorno acumulado:', error, investment);
      return 0;
    }
  };

  const fetchUserInvestments = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("status", "active");
      
      if (error) {
        console.error("Erro ao buscar investimentos:", error);
        return;
      }

      if (!data || data.length === 0) {
        console.log("Nenhum investimento encontrado");
        setUserSummary({
          totalInvested: 0,
          totalMonthlyReturn: 0,
          totalAccumulatedReturn: 0,
          totalValue: 0,
          investments: []
        });
        return;
      }

      console.log("Dados dos investimentos:", data);

      const totalInvested = data.reduce((sum, inv) => {
        const amount = Number(inv.amount) || 0;
        return sum + amount;
      }, 0);

      const totalMonthlyReturn = data.reduce((sum, inv) => {
        const amount = Number(inv.amount) || 0;
        const rate = Number(inv.monthly_return_rate) || 0;
        return sum + (amount * rate);
      }, 0);

      const totalAccumulatedReturn = data.reduce((sum, inv) => {
        const accumulated = calculateAccumulatedReturn(inv);
        return sum + accumulated;
      }, 0);

      const totalValue = totalInvested + totalAccumulatedReturn;

      console.log("Cálculos:", {
        totalInvested,
        totalMonthlyReturn,
        totalAccumulatedReturn,
        totalValue
      });

      setUserSummary({
        totalInvested,
        totalMonthlyReturn,
        totalAccumulatedReturn,
        totalValue,
        investments: data
      });
    } catch (error) {
      console.error("Erro ao buscar investimentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInvestments();
  }, []);

  const isInvestmentMatured = (investment: Investment) => {
    const createdDate = new Date(investment.created_at);
    const currentDate = new Date();
    const monthsDiff = (currentDate.getFullYear() - createdDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - createdDate.getMonth());
    return monthsDiff >= investment.commitment_period;
  };

  const calculatePenalty = (amount: number, isMatured: boolean) => {
    if (isMatured) return 0;
    return amount * 0.20; // 20% de multa
  };

  const calculateWithdrawAmount = () => {
    try {
      if (withdrawType === "monthly_return") {
        return userSummary.totalAccumulatedReturn || 0;
      }
      if (withdrawType === "total") {
        return userSummary.totalInvested || 0;
      }
      const amount = Number(withdrawAmount);
      return isNaN(amount) ? 0 : amount;
    } catch (error) {
      console.error('Erro ao calcular valor de resgate:', error);
      return 0;
    }
  };

  const calculatePenaltyAmount = () => {
    try {
      if (withdrawType === "monthly_return") {
        return 0; // Sem multa para retorno mensal
      }
      
      const amount = calculateWithdrawAmount();
      if (isNaN(amount) || amount <= 0) return 0;
      
      const isMatured = userSummary.investments.every(inv => isInvestmentMatured(inv));
      return calculatePenalty(amount, isMatured);
    } catch (error) {
      console.error('Erro ao calcular multa:', error);
      return 0;
    }
  };

  const handleWithdrawConfirm = async () => {
    setIsProcessing(true);

    const supabase = createClient();
    const withdrawAmount = calculateWithdrawAmount();
    const penaltyAmount = calculatePenaltyAmount();
    const finalAmount = withdrawAmount - penaltyAmount;

    const { data: investmentData, error: investmentError } = await supabase
      .from("transactions")
      .insert({
        user_id: user?.id,
        amount: finalAmount,
        type: "withdrawal",
        status: "pending",
        requires_approval: true,
      });

    if (investmentError) {
      console.error("Erro ao criar transação:", investmentError);
      toast({
        title: "Erro ao criar transação",
        description: investmentError.message,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(false);
    setStep("success");

    toast({
      title: "Resgate solicitado com sucesso!",
      description: "Seu resgate será processado em até 2 dias úteis",
    });
  };

  const formatCurrency = (value: number) => {
    try {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        console.warn('Valor inválido para formatação:', value);
        return "R$ 0,00";
      }
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(numValue);
    } catch (error) {
      console.error('Erro ao formatar moeda:', error, value);
      return "R$ 0,00";
    }
  };

  const calculateRemainingReturn = (withdrawAmount: number) => {
    try {
      if (withdrawType === "total") return 0;
      if (withdrawType === "monthly_return") return userSummary.totalAccumulatedReturn || 0;

      const totalInvested = userSummary.totalInvested || 0;
      const amount = withdrawAmount || 0;
      
      if (isNaN(totalInvested) || isNaN(amount)) return 0;
      
      const remainingValue = totalInvested - amount;
      if (remainingValue <= 0) return 0;
      
      return remainingValue * 0.03; // Taxa média de 3%
    } catch (error) {
      console.error('Erro ao calcular retorno remanescente:', error);
      return 0;
    }
  };

  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-blue-200">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-blue-800">
              Resgate Solicitado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-4">
                Detalhes do Resgate
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Protocolo:</span>
                  <span className="font-mono text-sm">RES-{Date.now()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de Resgate:</span>
                  <Badge
                    variant={
                      withdrawType === "total" ? "destructive" : "secondary"
                    }
                  >
                    {withdrawType === "total" ? "Total" : "Parcial"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-red-600">
                  Resgates antes do prazo terão multa de <strong>20%</strong> +
                  perda da rentabilidade.
                </p>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Resgate:</span>
                  <span className="font-semibold">
                    {formatCurrency(calculateWithdrawAmount())}
                  </span>
                </div>
                {calculatePenaltyAmount() > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span className="text-gray-600">Multa (20%):</span>
                    <span className="font-semibold">
                      -{formatCurrency(calculatePenaltyAmount())}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Líquido:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(calculateWithdrawAmount() - calculatePenaltyAmount())}
                  </span>
                </div>
                {withdrawType === "partial" && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Novo Retorno Mensal:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(
                        calculateRemainingReturn(calculateWithdrawAmount())
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Prazo de Liquidação
                  </p>
                  <p className="text-sm text-amber-600">
                    O resgate será processado em até 2 dias úteis (D+2) conforme
                    termos contratuais do clube.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => router.push("/investor")}
                className="flex-1"
              >
                Voltar ao Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("summary");
                  setWithdrawAmount("");
                  setWithdrawType("monthly_return");
                }}
                className="flex-1"
              >
                Novo Resgate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirmation") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("summary")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Confirmar Resgate
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Minus className="w-5 h-5" />
              <span>Confirmação de Resgate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Resumo do Resgate</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Total Investido:</span>
                  <span>{formatCurrency(userSummary.totalInvested)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retorno Acumulado:</span>
                  <span>{formatCurrency(userSummary.totalAccumulatedReturn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de Resgate:</span>
                  <Badge
                    variant={
                      withdrawType === "total" ? "destructive" : 
                      withdrawType === "monthly_return" ? "default" : "secondary"
                    }
                  >
                    {withdrawType === "total" ? "Total" : 
                     withdrawType === "monthly_return" ? "Retorno Acumulado" : "Parcial"}
                  </Badge>
                </div>
                {withdrawType !== "monthly_return" && (
                  <p className="mt-1 text-sm text-red-600">
                    Resgates antes do prazo terão multa de <strong>20%</strong> +
                    perda da rentabilidade.
                  </p>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Resgate:</span>
                  <span className="font-semibold">
                    {formatCurrency(calculateWithdrawAmount())}
                  </span>
                </div>
                {calculatePenaltyAmount() > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span className="text-gray-600">Multa (20%):</span>
                    <span className="font-semibold">
                      -{formatCurrency(calculatePenaltyAmount())}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Líquido:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(calculateWithdrawAmount() - calculatePenaltyAmount())}
                  </span>
                </div>
                {withdrawType === "partial" && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Valor Remanescente:</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(
                          userSummary.totalInvested - calculateWithdrawAmount()
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {withdrawType === "partial" && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-4">
                  Novo Retorno Projetado
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retorno Acumulado Atual:</span>
                    <span>
                      {formatCurrency(userSummary.totalAccumulatedReturn)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Novo Retorno Mensal:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(
                        calculateRemainingReturn(calculateWithdrawAmount())
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Redução Mensal:</span>
                    <span className="font-semibold text-red-600">
                      -
                      {formatCurrency(
                        userSummary.totalMonthlyReturn -
                          calculateRemainingReturn(calculateWithdrawAmount())
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {withdrawType === "total" && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Resgate Total
                    </p>
                    <p className="text-sm text-red-600">
                      Ao confirmar o resgate total, seu investimento será
                      encerrado e você não receberá mais rendimentos mensais.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Prazo de Liquidação
                  </p>
                  <p className="text-sm text-amber-600">
                    O resgate será processado em até 2 dias úteis (D+2) conforme
                    termos contratuais do clube.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleWithdrawConfirm}
              disabled={isProcessing}
              className="w-full"
              size="lg"
              variant={withdrawType === "total" ? "destructive" : "default"}
            >
              {isProcessing
                ? "Processando..."
                : `Confirmar Resgate ${
                    withdrawType === "total" ? "Total" : 
                    withdrawType === "monthly_return" ? "Retorno Acumulado" : "Parcial"
                  }`}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/investor")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Resgate de Investimento
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando investimentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/investor")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          Resgate de Investimento
        </h1>
      </div>

      <div className="grid gap-6">
        {/* Resumo dos Investimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Minus className="w-5 h-5" />
              <span>Resumo dos Investimentos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Valor Total Investido
                </h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(userSummary.totalInvested)}
                </p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  Retorno Acumulado
                </h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(userSummary.totalAccumulatedReturn)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Baseado nos meses completos desde o investimento
                </p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800 mb-2">
                  Valor Total Acumulado
                </h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(userSummary.totalValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipo de Resgate */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Resgate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={withdrawType}
              onValueChange={(value: "partial" | "total" | "monthly_return") =>
                setWithdrawType(value)
              }
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="monthly_return" id="monthly_return" />
                <Label htmlFor="monthly_return" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Resgate do Retorno Acumulado</p>
                    <p className="text-sm text-gray-600">
                      Resgatar apenas o retorno acumulado dos meses completos (sem multa)
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Resgate Parcial</p>
                    <p className="text-sm text-gray-600">
                      Resgatar apenas parte do valor investido
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="total" id="total" />
                <Label htmlFor="total" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Resgate Total</p>
                    <p className="text-sm text-gray-600">
                      Resgatar todo o valor investido e encerrar
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {withdrawType === "partial" && (
              <div>
                <Label htmlFor="withdraw-amount">Valor a Resgatar</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Ex: 5000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1000"
                  max={userSummary.totalInvested}
                  step="1000"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Valor mínimo: R$ 1.000,00 | Máximo disponível:{" "}
                  {formatCurrency(userSummary.totalInvested)}
                </p>
              </div>
            )}

            {/* Aviso sobre multas */}
            {withdrawType !== "monthly_return" && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Aviso Importante
                    </p>
                    <p className="text-sm text-red-600">
                      Resgates antes do prazo de vencimento estão sujeitos a multa de <strong>20%</strong> do valor investido e perda de todo o valor de retorno mensal.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo do Resgate */}
            {(withdrawType === "monthly_return" || 
              withdrawType === "total" || 
              (withdrawType === "partial" && withdrawAmount && Number(withdrawAmount) >= 1000)) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Resumo do Resgate
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Valor do Resgate:</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateWithdrawAmount())}
                    </span>
                  </div>
                  {calculatePenaltyAmount() > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Multa (20%):</span>
                      <span className="font-semibold">
                        -{formatCurrency(calculatePenaltyAmount())}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Valor Líquido:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(calculateWithdrawAmount() - calculatePenaltyAmount())}
                    </span>
                  </div>
                  {withdrawType === "partial" && (
                    <>
                      <div className="flex justify-between">
                        <span>Valor Remanescente:</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(
                            userSummary.totalInvested - calculateWithdrawAmount()
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Novo Retorno Mensal:</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(
                            calculateRemainingReturn(calculateWithdrawAmount())
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep("confirmation")}
              disabled={
                withdrawType === "partial" &&
                (!withdrawAmount || Number(withdrawAmount) < 1000)
              }
              className="w-full"
              size="lg"
              variant={withdrawType === "total" ? "destructive" : "default"}
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
