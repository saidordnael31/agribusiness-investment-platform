"use client";

import { useEffect, useState, useMemo } from "react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Investment {
  id: string;
  quota_type: "senior" | "subordinada";
  amount: number;
  monthly_return_rate: number;
  commitment_period: number; // em meses
  profitability_liquidity: "Mensal" | "Semestral" | "Anual" | "Bienal" | "Trienal";
  created_at: string;
  status: string;
}

interface UserInvestmentSummary {
  totalInvested: number;
  totalMonthlyReturn: number;
  totalDividendsByPeriod: number;
  totalValue: number;
  investments: (Investment & { withdrawals?: any[] })[];
}

export function WithdrawFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<"summary" | "confirmation" | "success">(
    "summary"
  );
  const [withdrawType, setWithdrawType] = useState<"partial" | "total" | "dividends_by_period" | "monthly_return">(
    "dividends_by_period"
  );
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userSummary, setUserSummary] = useState<UserInvestmentSummary>({
    totalInvested: 0,
    totalMonthlyReturn: 0,
    totalDividendsByPeriod: 0,
    totalValue: 0,
    investments: []
  });

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setUser(JSON.parse(user));
    }
  }, []);
  const calculateDividendsByPeriod = (investment: Investment) => {
    try {
      // Verifica se os dados necessários existem
      if (!investment.created_at || !investment.amount || !investment.monthly_return_rate || !investment.profitability_liquidity) {
        console.warn('Dados incompletos do investimento:', {
          created_at: investment.created_at,
          amount: investment.amount,
          monthly_return_rate: investment.monthly_return_rate,
          profitability_liquidity: investment.profitability_liquidity
        });
        return 0;
      }

      const createdDate = new Date(investment.created_at);
      const currentDate = new Date();
      
      // Verifica se as datas são válidas
      if (isNaN(createdDate.getTime()) || isNaN(currentDate.getTime())) {
        console.warn('Data inválida:', { created_at: investment.created_at });
        return 0;
      }
      
      const amount = Number(investment.amount);
      const rate = Number(investment.monthly_return_rate);
      
      if (isNaN(amount) || isNaN(rate)) {
        console.warn('Valores inválidos:', { amount: investment.amount, rate: investment.monthly_return_rate });
        return 0;
      }

      // Calcula o período em meses baseado no tipo de dividendo
      let periodInMonths = 1;
      switch (investment.profitability_liquidity) {
        case "Mensal":
          periodInMonths = 1;
          break;
        case "Semestral":
          periodInMonths = 6;
          break;
        case "Anual":
          periodInMonths = 12;
          break;
        case "Bienal":
          periodInMonths = 24;
          break;
        case "Trienal":
          periodInMonths = 36;
          break;
      }
      
      // Calcula quantos períodos completos se passaram desde a criação
      const monthsElapsed = (currentDate.getFullYear() - createdDate.getFullYear()) * 12 + 
                           (currentDate.getMonth() - createdDate.getMonth());
      
      const periodsCompleted = Math.floor(monthsElapsed / periodInMonths);
      
      // Se ainda não completou um período, retorna 0
      if (periodsCompleted < 1) {
        return 0;
      }
      
      // Calcula os dividendos acumulados baseado nos períodos completos
      const monthlyReturn = amount * rate;
      const dividendsByPeriod = monthlyReturn * periodInMonths * periodsCompleted;
      
      return dividendsByPeriod;
    } catch (error) {
      console.error('Erro ao calcular dividendos por período:', error, investment);
      return 0;
    }
  };

  const calculateCurrentMonthlyReturn = (investment: Investment) => {
    try {
      // Verifica se os dados necessários existem
      if (!investment.amount || !investment.monthly_return_rate) {
        console.warn('Dados incompletos do investimento:', investment);
        return 0;
      }

      const amount = Number(investment.amount);
      const rate = Number(investment.monthly_return_rate);
      
      if (isNaN(amount) || isNaN(rate)) {
        console.warn('Valores inválidos:', { amount: investment.amount, rate: investment.monthly_return_rate });
        return 0;
      }
      
      // Retorna apenas o retorno mensal atual (não acumulado)
      const monthlyReturn = amount * rate;
      
      return monthlyReturn;
    } catch (error) {
      console.error('Erro ao calcular retorno mensal atual:', error, investment);
      return 0;
    }
  };


  // Verifica se o usuário pode resgatar dividendos por período (após data final de resgate)
  const canWithdrawDividendsByPeriod = (investment: Investment) => {
    if (!investment) return false;

    const createdDate = new Date(investment.created_at);
    const currentDate = new Date();
    const daysElapsed = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcula o período de liquidez em dias baseado no profitability_liquidity
    let liquidityPeriodDays = 0;
    switch (investment.profitability_liquidity) {
      case "Mensal":
        liquidityPeriodDays = 30;
        break;
      case "Semestral":
        liquidityPeriodDays = 180;
        break;
      case "Anual":
        liquidityPeriodDays = 365;
        break;
      case "Bienal":
        liquidityPeriodDays = 730;
        break;
      case "Trienal":
        liquidityPeriodDays = 1095; // 36 meses = 1095 dias
        break;
      default:
        liquidityPeriodDays = 30; // padrão mensal
    }
    
    // Verifica se passou do período de liquidez
    return daysElapsed >= liquidityPeriodDays;
  };

  // Verifica se o usuário pode resgatar retorno mensal (após data final do período de liquidez da rentabilidade)
  const canWithdrawMonthlyReturn = (investment: Investment) => {
    if (!investment) return false;

    const createdDate = new Date(investment.created_at);
    const currentDate = new Date();
    
    // Calcula o período de liquidez da rentabilidade em dias baseado no profitability_liquidity
    let profitabilityLiquidityDays = 0;
    switch (investment.profitability_liquidity) {
      case "Mensal":
        profitabilityLiquidityDays = 30;
        break;
      case "Semestral":
        profitabilityLiquidityDays = 180;
        break;
      case "Anual":
        profitabilityLiquidityDays = 365;
        break;
      case "Bienal":
        profitabilityLiquidityDays = 730;
        break;
      case "Trienal":
        profitabilityLiquidityDays = 1095; // 36 meses = 1095 dias
        break;
      default:
        profitabilityLiquidityDays = 30; // padrão mensal
    }
    
    const daysElapsed = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Verifica se passou do período de liquidez da rentabilidade
    return daysElapsed >= profitabilityLiquidityDays;
  };

  // Calcula quando o usuário poderá fazer resgate do retorno mensal
  const getMonthlyReturnAvailableDate = (investment: Investment) => {
    if (!investment) return null;

    const createdDate = new Date(investment.created_at);
    
    // Calcula o período de liquidez da rentabilidade em dias baseado no profitability_liquidity
    let profitabilityLiquidityDays = 0;
    switch (investment.profitability_liquidity) {
      case "Mensal":
        profitabilityLiquidityDays = 30;
        break;
      case "Semestral":
        profitabilityLiquidityDays = 180;
        break;
      case "Anual":
        profitabilityLiquidityDays = 365;
        break;
      case "Bienal":
        profitabilityLiquidityDays = 730;
        break;
      case "Trienal":
        profitabilityLiquidityDays = 1095; // 36 meses = 1095 dias
        break;
      default:
        profitabilityLiquidityDays = 30; // padrão mensal
    }
    
    // Calcula a data de disponibilidade
    const availableDate = new Date(createdDate);
    availableDate.setDate(availableDate.getDate() + profitabilityLiquidityDays);
    
    return availableDate;
  };

  // Verifica se há dividendos por período disponíveis para resgate
  const hasDividendsByPeriod = (investment: Investment) => {
    if (!investment) return false;
    return calculateDividendsByPeriod(investment) > 0;
  };

  // Calcula quando o usuário poderá fazer resgate dos dividendos por período
  const getDividendsAvailableDate = (investment: Investment) => {
    if (!investment) return null;

    const createdDate = new Date(investment.created_at);
    
    // Calcula o período de liquidez em dias baseado no profitability_liquidity
    let liquidityPeriodDays = 0;
    switch (investment.profitability_liquidity) {
      case "Mensal":
        liquidityPeriodDays = 30;
        break;
      case "Semestral":
        liquidityPeriodDays = 180;
        break;
      case "Anual":
        liquidityPeriodDays = 365;
        break;
      case "Bienal":
        liquidityPeriodDays = 730;
        break;
      case "Trienal":
        liquidityPeriodDays = 1095; // 36 meses = 1095 dias
        break;
      default:
        liquidityPeriodDays = 30; // padrão mensal
    }
    
    // Calcula a data de disponibilidade baseada no período de liquidez
    const availableDate = new Date(createdDate);
    availableDate.setDate(availableDate.getDate() + liquidityPeriodDays);
    
    return availableDate;
  };

  // Verifica se há retorno mensal atual disponível para resgate
  const hasCurrentMonthlyReturn = (investment: Investment) => {
    if (!investment) return false;
    return calculateCurrentMonthlyReturn(investment) > 0;
  };

  // Valida se o valor de resgate parcial é válido
  const isValidPartialWithdrawal = (amount: string, investment: Investment) => {
    if (!investment) return false;
    const numAmount = Number(amount);
    const investmentAmount = Number(investment.amount) || 0;
    
    // Buscar resgates específicos deste investimento
    const investmentData = userSummary.investments.find(inv => inv.id === investment.id);
    const investmentWithdrawals = investmentData?.withdrawals || [];
    const totalWithdrawn = investmentWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    const availableAmount = Math.max(0, investmentAmount - totalWithdrawn);
    
    return !isNaN(numAmount) && numAmount >= 1000 && numAmount <= availableAmount;
  };

  // Verifica se o usuário pode fazer resgate parcial (sempre disponível)
  const canWithdrawPartial = (investment: Investment) => {
    if (!investment) return false;
    
    // Resgate parcial sempre disponível (com multa de 10%)
    return true;
  };

  // Calcula quando o usuário poderá fazer resgate parcial/total
  const getPartialWithdrawAvailableDate = (investment: Investment) => {
    if (!investment) return null;

    // Resgate parcial e total estão sempre disponíveis (com multa)
    return null;
  };

  const fetchUserInvestments = async () => {
    try {
      setIsLoading(true);
      
      // Verificar se o usuário está carregado
      if (!user?.id) {
        console.log("Usuário não carregado ainda, aguardando...");
        setIsLoading(false);
        return;
      }
      
      const supabase = createClient();
      
      // Buscar investimentos ativos do usuário atual
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");
      
      if (error) {
        console.error("Erro ao buscar investimentos:", error);
        return;
      }

      // Buscar resgates aprovados do usuário atual
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("transactions")
        .select("investment_id, amount, created_at")
        .eq("user_id", user.id)
        .eq("type", "withdrawal")
        .eq("status", "completed");

      if (withdrawalsError) {
        console.error("Erro ao buscar resgates:", withdrawalsError);
        return;
      }

      if (!data || data.length === 0) {
        console.log("Nenhum investimento encontrado");
        setUserSummary({
          totalInvested: 0,
          totalMonthlyReturn: 0,
          totalDividendsByPeriod: 0,
          totalValue: 0,
          investments: []
        });
        return;
      }

      console.log("Dados dos investimentos:", data);
      console.log("Resgates encontrados:", withdrawals);

      // Calcular valores considerando resgates
      let totalInvested = 0;
      let totalMonthlyReturn = 0;
      let totalDividendsByPeriod = 0;
      let totalValue = 0;

      // Adicionar resgates a cada investimento
      const investmentsWithWithdrawals = data.map((inv) => {
        const investmentWithdrawals = withdrawals?.filter(w => w.investment_id === inv.id) || [];
        return {
          ...inv,
          withdrawals: investmentWithdrawals
        };
      });

      investmentsWithWithdrawals.forEach((inv) => {
        const amount = Number(inv.amount) || 0;
        const rate = Number(inv.monthly_return_rate) || 0;
        
        // Calcular resgates específicos deste investimento
        const totalWithdrawn = inv.withdrawals?.reduce((sum: number, w: any) => sum + Number(w.amount), 0) || 0;
        
        // Valor disponível = valor original - resgates
        const availableAmount = Math.max(0, amount - totalWithdrawn);
        
        console.log(`Investimento ${inv.id}:`, {
          originalAmount: amount,
          withdrawals: inv.withdrawals,
          totalWithdrawn,
          availableAmount
        });
        
        totalInvested += availableAmount;
        totalMonthlyReturn += availableAmount * rate;
        
        // Calcular dividendos baseado no valor disponível
        const dividends = calculateDividendsByPeriod({ ...inv, amount: availableAmount });
        totalDividendsByPeriod += dividends;
      });

      totalValue = totalInvested + totalDividendsByPeriod;

      console.log("Cálculos (considerando resgates):", {
        totalInvested,
        totalMonthlyReturn,
        totalDividendsByPeriod,
        totalValue,
        withdrawalsCount: withdrawals?.length || 0,
        withdrawalsTotal: withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0
      });

      setUserSummary({
        totalInvested,
        totalMonthlyReturn,
        totalDividendsByPeriod,
        totalValue,
        investments: investmentsWithWithdrawals
      });
    } catch (error) {
      console.error("Erro ao buscar investimentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserInvestments();
    }
  }, [user?.id]);

  const isInvestmentMatured = (investment: Investment) => {
    const createdDate = new Date(investment.created_at);
    const currentDate = new Date();
    const monthsDiff = (currentDate.getFullYear() - createdDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - createdDate.getMonth());
    return monthsDiff >= investment.commitment_period;
  };

  const calculatePenalty = (amount: number, withdrawType: string) => {
    if (withdrawType === "dividends_by_period" || withdrawType === "monthly_return") {
      return 0; // Sem multa para dividendos e retorno mensal
    }
    
    if (withdrawType === "partial") {
      return amount * 0.10; // 10% de multa para resgate parcial
    }
    
    if (withdrawType === "total") {
      return amount * 0.20; // 20% de multa para resgate total
    }
    
    return 0;
  };

  const calculateWithdrawAmount = (investment: Investment) => {
    try {
      if (!investment) return 0;
      
      if (withdrawType === "dividends_by_period") {
        return calculateDividendsByPeriod(investment);
      }
      if (withdrawType === "monthly_return") {
        return calculateCurrentMonthlyReturn(investment);
      }
      if (withdrawType === "total") {
        // Para resgate total, calcular valor disponível considerando resgates anteriores
        const amount = Number(investment.amount) || 0;
        
        // Buscar resgates específicos deste investimento
        const investmentData = userSummary.investments.find(inv => inv.id === investment.id);
        const investmentWithdrawals = investmentData?.withdrawals || [];
        
        const totalWithdrawn = investmentWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
        const availableAmount = Math.max(0, amount - totalWithdrawn);
        
        console.log(`Resgate total - Investimento ${investment.id}:`, {
          originalAmount: amount,
          withdrawals: investmentWithdrawals,
          totalWithdrawn,
          availableAmount
        });
        
        return availableAmount;
      }
      const amount = Number(withdrawAmount);
      return isNaN(amount) ? 0 : amount;
    } catch (error) {
      console.error('Erro ao calcular valor de resgate:', error);
      return 0;
    }
  };

  const calculatePenaltyAmount = (investment: Investment) => {
    try {
      if (!investment) return 0;
      
      const amount = calculateWithdrawAmount(investment);
      if (isNaN(amount) || amount <= 0) return 0;
      
      return calculatePenalty(amount, withdrawType);
    } catch (error) {
      console.error('Erro ao calcular multa:', error);
      return 0;
    }
  };

  const handleWithdrawConfirm = async () => {
    if (!selectedInvestment) {
      toast({
        title: "Erro",
        description: "Selecione um investimento para resgatar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const supabase = createClient();
      const withdrawAmount = calculateWithdrawAmount(selectedInvestment);
      const penaltyAmount = calculatePenaltyAmount(selectedInvestment);
      const finalAmount = withdrawAmount - penaltyAmount;

      // Validação adicional de saldo
      if (withdrawType === "partial" || withdrawType === "total") {
        const investmentAmount = Number(selectedInvestment.amount) || 0;
        
        // Buscar resgates específicos deste investimento
        const investmentData = userSummary.investments.find(inv => inv.id === selectedInvestment.id);
        const investmentWithdrawals = investmentData?.withdrawals || [];
        const totalWithdrawn = investmentWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
        const availableAmount = Math.max(0, investmentAmount - totalWithdrawn);
        
        if (withdrawAmount > availableAmount) {
          toast({
            title: "Saldo insuficiente",
            description: `O valor solicitado (R$ ${withdrawAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) excede o valor disponível para resgate (R$ ${availableAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}).`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      // Log da operação
      console.log("Iniciando resgate:", {
        userId: user?.id,
        investmentId: selectedInvestment.id,
        withdrawType,
        withdrawAmount,
        penaltyAmount,
        finalAmount,
        timestamp: new Date().toISOString()
      });

      // Usar a API de resgates em vez de inserir diretamente
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          investmentId: selectedInvestment.id,
          amount: finalAmount,
          withdrawalType: withdrawType,
          originalAmount: withdrawAmount,
          penaltyAmount: penaltyAmount,
          metadata: {
            withdraw_type: withdrawType,
            original_amount: withdrawAmount,
            penalty_amount: penaltyAmount,
            penalty_percentage: withdrawType === "partial" ? 10 : withdrawType === "total" ? 20 : 0
          }
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar resgate');
      }

      const investmentData = result.data;

      // Log de sucesso
      console.log("Resgate criado com sucesso:", {
        transactionId: investmentData?.id,
        userId: user?.id,
        amount: finalAmount,
        timestamp: new Date().toISOString()
      });

      setIsProcessing(false);
      setStep("success");

      toast({
        title: "Resgate solicitado com sucesso!",
        description: "Seu resgate será processado em até 2 dias úteis",
      });
    } catch (error) {
      console.error("Erro inesperado no resgate:", error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
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

  const calculateRemainingReturn = (withdrawAmount: number, investment: Investment) => {
    try {
      if (!investment) return 0;
      
      if (withdrawType === "total") return 0;
      if (withdrawType === "dividends_by_period") return calculateDividendsByPeriod(investment);
      if (withdrawType === "monthly_return") return calculateCurrentMonthlyReturn(investment);

      const investmentAmount = Number(investment.amount) || 0;
      const amount = withdrawAmount || 0;
      
      if (isNaN(investmentAmount) || isNaN(amount)) return 0;
      
      const remainingValue = investmentAmount - amount;
      if (remainingValue <= 0) return 0;
      
      const rate = Number(investment.monthly_return_rate) || 0;
      return remainingValue * rate;
    } catch (error) {
      console.error('Erro ao calcular retorno remanescente:', error);
      return 0;
    }
  };

  const [cdiMonthlyRate, setCdiMonthlyRate] = useState<number>(0.008); // Fallback: 0.8% ao mês
  const [cdiLoading, setCdiLoading] = useState(false);

  // Buscar CDI atualizado da API
  useEffect(() => {
    const fetchCDI = async () => {
      try {
        setCdiLoading(true);
        const response = await fetch('/api/cdi');
        const data = await response.json();
        
        if (data.success && data.cdiMonthly) {
          setCdiMonthlyRate(data.cdiMonthly);
        }
      } catch (error) {
        console.error('Erro ao buscar CDI:', error);
        // Manter o valor padrão em caso de erro
      } finally {
        setCdiLoading(false);
      }
    };

    fetchCDI();
  }, []);

  // Gera dados do gráfico de comparação Investimento vs CDI
  const generateCDIComparisonChart = (investment: Investment) => {
    try {
      if (!investment) return [];

      // Valor que está sendo resgatado
      const withdrawAmount = calculateWithdrawAmount(investment);
      if (withdrawAmount <= 0) {
        return [];
      }

      const monthlyRate = Number(investment.monthly_return_rate) || 0;
      const commitmentPeriod = investment.commitment_period || 12;
      
      // Calcular data de vencimento
      const createdDate = new Date(investment.created_at);
      const expiryDate = new Date(createdDate);
      expiryDate.setMonth(expiryDate.getMonth() + commitmentPeriod);
      
      const today = new Date();
      const monthsRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      
      if (monthsRemaining <= 0) {
        return [];
      }

      // Gerar dados mês a mês
      const chartData = [];
      for (let month = 0; month <= monthsRemaining; month++) {
        // Valor do investimento no mês
        const investmentValue = withdrawAmount * Math.pow(1 + monthlyRate, month);
        
        // Valor no CDI no mês
        const cdiValue = withdrawAmount * Math.pow(1 + cdiMonthlyRate, month);
        
        // Retorno acumulado
        const investmentReturn = investmentValue - withdrawAmount;
        const cdiReturn = cdiValue - withdrawAmount;
        
        // Data do mês
        const monthDate = new Date(today);
        monthDate.setMonth(monthDate.getMonth() + month);
        
        chartData.push({
          month: month,
          monthLabel: month === 0 ? 'Hoje' : month === monthsRemaining ? 'Vencimento' : `Mês ${month}`,
          investmentValue: investmentValue,
          cdiValue: cdiValue,
          investmentReturn: investmentReturn,
          cdiReturn: cdiReturn,
          difference: investmentReturn - cdiReturn,
          date: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        });
      }

      return chartData;
    } catch (error) {
      console.error('Erro ao gerar gráfico CDI:', error);
      return [];
    }
  };

  // Calcula o impacto negativo em relação ao CDI (para exibição de resumo)
  const calculateCDIImpact = (investment: Investment) => {
    try {
      if (!investment) return { loss: 0, projectedReturn: 0, cdiReturn: 0, monthsRemaining: 0 };

      // Valor que está sendo resgatado
      const withdrawAmount = calculateWithdrawAmount(investment);
      if (withdrawAmount <= 0) {
        return { loss: 0, projectedReturn: 0, cdiReturn: 0, monthsRemaining: 0 };
      }

      const monthlyRate = Number(investment.monthly_return_rate) || 0;
      const commitmentPeriod = investment.commitment_period || 12;
      
      // Calcular data de vencimento
      const createdDate = new Date(investment.created_at);
      const expiryDate = new Date(createdDate);
      expiryDate.setMonth(expiryDate.getMonth() + commitmentPeriod);
      
      const today = new Date();
      const monthsRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      
      if (monthsRemaining <= 0) {
        return { loss: 0, projectedReturn: 0, cdiReturn: 0, monthsRemaining: 0 };
      }

      // Calcular retorno projetado se mantiver o valor resgatado até o vencimento (juros compostos)
      const investmentProjectedValue = withdrawAmount * Math.pow(1 + monthlyRate, monthsRemaining);
      const investmentProjectedReturn = investmentProjectedValue - withdrawAmount;

      // Calcular retorno se investisse o valor resgatado no CDI pelo mesmo período
      const cdiProjectedValue = withdrawAmount * Math.pow(1 + cdiMonthlyRate, monthsRemaining);
      const cdiProjectedReturn = cdiProjectedValue - withdrawAmount;

      // Impacto negativo = diferença entre o que ganharia no investimento vs CDI
      const loss = investmentProjectedReturn - cdiProjectedReturn;

      return {
        loss: loss,
        projectedReturn: investmentProjectedReturn,
        cdiReturn: cdiProjectedReturn,
        monthsRemaining
      };
    } catch (error) {
      console.error('Erro ao calcular impacto CDI:', error);
      return { loss: 0, projectedReturn: 0, cdiReturn: 0, monthsRemaining: 0 };
    }
  };

  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003562] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-[#00A568] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">
              Resgate Solicitado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#D9D9D9] p-6 rounded-lg">
              <h3 className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px] mb-4">
                Detalhes do Resgate
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Protocolo:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] font-mono">RES-{Date.now()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Tipo de Resgate:</span>
                  <Badge
                    variant={
                      withdrawType === "total" ? "destructive" : 
                      withdrawType === "dividends_by_period" ? "default" :
                      withdrawType === "monthly_return" ? "default" : "secondary"
                    }
                  >
                    {withdrawType === "total" ? "Total" : 
                     withdrawType === "dividends_by_period" ? "Dividendos por Período" :
                     withdrawType === "monthly_return" ? "Retorno Mensal" : "Parcial"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor do Resgate:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                    {formatCurrency(selectedInvestment ? calculateWithdrawAmount(selectedInvestment) : 0)}
                  </span>
                </div>
                {selectedInvestment && calculatePenaltyAmount(selectedInvestment) > 0 && (
                  <div className="flex justify-between text-[#00BC6E]">
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Multa (20%):</span>
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                      -{formatCurrency(calculatePenaltyAmount(selectedInvestment))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor Líquido:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-green-600">
                    {formatCurrency(selectedInvestment ? calculateWithdrawAmount(selectedInvestment) - calculatePenaltyAmount(selectedInvestment) : 0)}
                  </span>
                </div>
                {withdrawType === "partial" && selectedInvestment && (
                  <div className="flex justify-between">
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Novo Retorno Mensal:</span>
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-blue-600">
                      {formatCurrency(
                        calculateRemainingReturn(calculateWithdrawAmount(selectedInvestment), selectedInvestment)
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de comparação Investimento vs CDI - Tela de Sucesso */}
            {selectedInvestment && (withdrawType === "partial" || withdrawType === "total") && (() => {
              const chartData = generateCDIComparisonChart(selectedInvestment);
              const cdiImpact = calculateCDIImpact(selectedInvestment);
              
              if (chartData.length === 0 || cdiImpact.monthsRemaining <= 0) {
                return (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      Investimento próximo do vencimento ou sem dados para comparação.
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                  <div className="flex items-start space-x-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-[#003F28] font-ibm-plex-sans font-bold text-[20px] leading-[28px] text-amber-800">
                          Comparação: Investimento vs CDI
                        </h3>
                        {cdiLoading && (
                          <span className="text-xs text-amber-600">(Carregando CDI...)</span>
                        )}
                        {!cdiLoading && (
                          <span className="text-xs text-amber-600">
                            (CDI: {(cdiMonthlyRate * 100).toFixed(2)}% a.m.)
                          </span>
                        )}
                      </div>
                      
                      {/* Gráfico de linha */}
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-amber-200" />
                            <XAxis 
                              dataKey="monthLabel"
                              className="text-xs text-amber-800"
                              tick={{ fontSize: 11 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis
                              className="text-xs text-amber-800"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) =>
                                new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                  notation: "compact",
                                }).format(value)
                              }
                            />
                            <Tooltip
                              formatter={(value: number, name: string) => {
                                // O 'name' recebido é o 'name' prop do componente Line
                                // Já vem como "Retorno do Investimento" ou "Retorno no CDI"
                                // Mas vamos garantir que está correto
                                let label = name;
                                
                                // Se por algum motivo vier o dataKey, converter
                                if (name === "investmentReturn") {
                                  label = "Retorno do Investimento";
                                } else if (name === "cdiReturn") {
                                  label = "Retorno no CDI";
                                }
                                
                                return [
                                  new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(value),
                                  label
                                ];
                              }}
                              labelFormatter={(label) => `${label}`}
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.98)",
                                border: "1px solid rgba(251, 191, 36, 0.3)",
                                borderRadius: "8px",
                                color: "#003F28",
                              }}
                            />
                            <Legend 
                              formatter={(value) => {
                                if (value === "Retorno do Investimento") return "Retorno do Investimento";
                                if (value === "Retorno no CDI") return "Retorno no CDI";
                                return value;
                              }}
                              wrapperStyle={{ paddingTop: "20px" }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="investmentReturn" 
                              stroke="#00BC6E" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Retorno do Investimento"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="cdiReturn" 
                              stroke="#F59E0B" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Retorno no CDI"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Resumo */}
                      <div className="mt-4 pt-4 border-t border-amber-300">
                        <div className="flex justify-between items-center">
                          <span className="text-[#003F28] font-ibm-plex-sans font-bold text-[18px] leading-[28px] text-amber-800">
                            Diferença no Vencimento:
                          </span>
                          <span className={`text-[#003F28] font-ibm-plex-sans font-bold text-[18px] leading-[28px] ${
                            cdiImpact.loss > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {cdiImpact.loss > 0 ? '+' : ''}{formatCurrency(cdiImpact.loss)}
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-2">
                          {cdiImpact.loss > 0 
                            ? `Ao manter até o vencimento, você ganharia ${formatCurrency(cdiImpact.loss)} a mais que no CDI`
                            : `Ao manter até o vencimento, você ganharia ${formatCurrency(Math.abs(cdiImpact.loss))} a menos que no CDI`
                          } ({cdiImpact.monthsRemaining} {cdiImpact.monthsRemaining === 1 ? 'mês' : 'meses'} restantes)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* <div className="bg-amber-50 p-4 rounded-lg">
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
            </div> */}

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
                  setWithdrawType("dividends_by_period");
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
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">
            Confirmar Resgate
          </h1>
        </div>

        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003F28] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">
              <Minus className="w-5 h-5" />
              <span>Confirmação de Resgate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#D9D9D9] p-6 rounded-lg">
              <h3 className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px] mb-4">Resumo do Resgate</h3>
              <div className="space-y-3">
                {selectedInvestment && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Investimento Selecionado:</span>
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">ID: {selectedInvestment.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor Investido:</span>
                      <span>{formatCurrency(Number(selectedInvestment.amount) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Dividendos por Período:</span>
                      <span>{formatCurrency(calculateDividendsByPeriod(selectedInvestment))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Retorno Mensal:</span>
                      <span>{formatCurrency(calculateCurrentMonthlyReturn(selectedInvestment))}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Tipo de Resgate:</span>
                  <Badge
                    variant={
                      withdrawType === "total" ? "destructive" : 
                      withdrawType === "dividends_by_period" ? "default" :
                      withdrawType === "monthly_return" ? "default" : "secondary"
                    }
                  >
                    {withdrawType === "total" ? "Total" : 
                     withdrawType === "dividends_by_period" ? "Dividendos por Período" :
                     withdrawType === "monthly_return" ? "Retorno Mensal" : "Parcial"}
                  </Badge>
                </div>
                {withdrawType !== "dividends_by_period" && withdrawType !== "monthly_return" && (
                  <p className="mt-1 text-sm text-red-600">
                    Resgates parciais: <strong>10% de desconto</strong> + perda da rentabilidade do período. 
                    Resgates totais: <strong>20% de desconto</strong> + perda da rentabilidade do período.
                  </p>
                )}
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor do Resgate:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                    {formatCurrency(selectedInvestment ? calculateWithdrawAmount(selectedInvestment) : 0)}
                  </span>
                </div>
                {selectedInvestment && calculatePenaltyAmount(selectedInvestment) > 0 && (
                  <div className="flex justify-between text-[#00BC6E]">
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Multa (20%):</span>
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                      -{formatCurrency(calculatePenaltyAmount(selectedInvestment))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor Líquido:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-green-600">
                    {formatCurrency(selectedInvestment ? calculateWithdrawAmount(selectedInvestment) - calculatePenaltyAmount(selectedInvestment) : 0)}
                  </span>
                </div>
                {withdrawType === "partial" && selectedInvestment && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor Remanescente:</span>
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-blue-600">
                        {formatCurrency(
                          (Number(selectedInvestment.amount) || 0) - calculateWithdrawAmount(selectedInvestment)
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {withdrawType === "partial" && selectedInvestment && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-blue-800 mb-4">
                  Novo Retorno Projetado
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Dividendos por Período Atual:</span>
                    <span>
                      {formatCurrency(calculateDividendsByPeriod(selectedInvestment))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Novo Retorno Mensal:</span>
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-blue-600">
                      {formatCurrency(
                        calculateRemainingReturn(calculateWithdrawAmount(selectedInvestment), selectedInvestment)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Redução Mensal:</span>
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-red-600">
                      -
                      {formatCurrency(
                        calculateCurrentMonthlyReturn(selectedInvestment) -
                          calculateRemainingReturn(calculateWithdrawAmount(selectedInvestment), selectedInvestment)
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

            {/* Gráfico de comparação Investimento vs CDI - Tela de Confirmação */}
            {selectedInvestment && (withdrawType === "partial" || withdrawType === "total") && (() => {
              const chartData = generateCDIComparisonChart(selectedInvestment);
              const cdiImpact = calculateCDIImpact(selectedInvestment);
              
              if (chartData.length === 0 || cdiImpact.monthsRemaining <= 0) {
                return (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      Investimento próximo do vencimento ou sem dados para comparação.
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                  <div className="flex items-start space-x-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-[#003F28] font-ibm-plex-sans font-bold text-[20px] leading-[28px] text-amber-800">
                          Comparação: Investimento vs CDI
                        </h3>
                        {cdiLoading && (
                          <span className="text-xs text-amber-600">(Carregando CDI...)</span>
                        )}
                        {!cdiLoading && (
                          <span className="text-xs text-amber-600">
                            (CDI: {(cdiMonthlyRate * 100).toFixed(2)}% a.m.)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-amber-700 mb-4">
                        Ao resgatar agora, você perderá a oportunidade de ganhos futuros. 
                        Veja a comparação com o CDI:
                      </p>
                      
                      {/* Gráfico de linha */}
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-amber-200" />
                            <XAxis 
                              dataKey="monthLabel"
                              className="text-xs text-amber-800"
                              tick={{ fontSize: 11 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis
                              className="text-xs text-amber-800"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) =>
                                new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                  notation: "compact",
                                }).format(value)
                              }
                            />
                            <Tooltip
                              formatter={(value: number, name: string) => {
                                // O 'name' recebido é o 'name' prop do componente Line
                                // Já vem como "Retorno do Investimento" ou "Retorno no CDI"
                                // Mas vamos garantir que está correto
                                let label = name;
                                
                                // Se por algum motivo vier o dataKey, converter
                                if (name === "investmentReturn") {
                                  label = "Retorno do Investimento";
                                } else if (name === "cdiReturn") {
                                  label = "Retorno no CDI";
                                }
                                
                                return [
                                  new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(value),
                                  label
                                ];
                              }}
                              labelFormatter={(label) => `${label}`}
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.98)",
                                border: "1px solid rgba(251, 191, 36, 0.3)",
                                borderRadius: "8px",
                                color: "#003F28",
                              }}
                            />
                            <Legend 
                              formatter={(value) => {
                                if (value === "Retorno do Investimento") return "Retorno do Investimento";
                                if (value === "Retorno no CDI") return "Retorno no CDI";
                                return value;
                              }}
                              wrapperStyle={{ paddingTop: "20px" }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="investmentReturn" 
                              stroke="#00BC6E" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Retorno do Investimento"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="cdiReturn" 
                              stroke="#F59E0B" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Retorno no CDI"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Resumo */}
                      <div className="mt-4 pt-4 border-t border-amber-300">
                        <div className="flex justify-between items-center">
                          <span className="text-[#003F28] font-ibm-plex-sans font-bold text-[18px] leading-[28px] text-amber-800">
                            Diferença no Vencimento:
                          </span>
                          <span className={`text-[#003F28] font-ibm-plex-sans font-bold text-[18px] leading-[28px] ${
                            cdiImpact.loss > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {cdiImpact.loss > 0 ? '+' : ''}{formatCurrency(cdiImpact.loss)}
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-2">
                          {cdiImpact.loss > 0 
                            ? `Ao manter até o vencimento, você ganharia ${formatCurrency(cdiImpact.loss)} a mais que no CDI`
                            : `Ao manter até o vencimento, você ganharia ${formatCurrency(Math.abs(cdiImpact.loss))} a menos que no CDI`
                          } ({cdiImpact.monthsRemaining} {cdiImpact.monthsRemaining === 1 ? 'mês' : 'meses'} restantes)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* <div className="bg-amber-50 p-4 rounded-lg">
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
            </div> */}

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
                    withdrawType === "dividends_by_period" ? "Dividendos por Período" :
                    withdrawType === "monthly_return" ? "Retorno Mensal" : "Parcial"
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
            <p className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Carregando investimentos...</p>
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
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <h1 className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">
          Resgate de Investimento
        </h1>
      </div>

      <div className="grid gap-6">
        {/* Resumo dos Investimentos */}
        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003F28] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">
              <Minus className="w-5 h-5" />
              <span>Resumo dos Investimentos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#D9D9D9] p-6 rounded-lg">
                <h3 className="text-[#003F28] font-ibm-plex-sans font-normal text-lg mb-2">
                  Valor Total Investido
                </h3>
                <p className="text-[#003F28] font-ibm-plex-sans font-bold text-2xl">
                  {formatCurrency(userSummary.totalInvested)}
                </p>
              </div>
              <div className="bg-[#D9D9D9] p-6 rounded-lg">
                <h3 className="text-[#003F28] font-ibm-plex-sans font-normal text-lg mb-2">
                  Dividendos por Período
                </h3>
                <p className="text-[#003F28] font-ibm-plex-sans font-bold text-2xl">
                  {formatCurrency(userSummary.totalDividendsByPeriod)}
                </p>
                <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm mt-1">
                  Baseado no período contratado (mensal, semestral, anual, bienal ou trienal)
                </p>
              </div>
              <div className="bg-[#D9D9D9] p-6 rounded-lg">
                <h3 className="text-[#003F28] font-ibm-plex-sans font-normal text-lg mb-2">
                  Valor Total Acumulado
                </h3>
                <p className="text-[#003F28] font-ibm-plex-sans font-bold text-2xl">
                  {formatCurrency(userSummary.totalValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seleção de Investimento */}
        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003F28] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader>
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">Selecionar Investimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-lg">
                Escolha o investimento que você deseja resgatar:
              </p>
              <div className="grid gap-3">
                {userSummary.investments.map((investment) => (
                  <div
                    key={investment.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedInvestment?.id === investment.id
                        ? 'border-[#00BC6E] bg-[#00BC6E]/20'
                        : 'border-white/20 hover:border-[#00BC6E]/50 bg-white/5'
                    }`}
                    onClick={() => {
                      setSelectedInvestment(investment);
                      setWithdrawAmount(""); // Reset amount when changing investment
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">
                            Investimento {investment.id.slice(0, 8)}...
                          </h3>
                          <Badge variant={investment.quota_type === "senior" ? "default" : "secondary"}>
                            {investment.quota_type === "senior" ? "Senior" : "Subordinada"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                          <div>
                            <span className="font-medium">Valor Investido:</span>
                            <p className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-gray-900">
                              {formatCurrency(Number(investment.amount) || 0)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Valor Disponível:</span>
                            <p className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-green-600">
                              {formatCurrency(Math.max(0, (Number(investment.amount) || 0) - (investment.withdrawals?.reduce((sum: number, w: any) => sum + Number(w.amount), 0) || 0)))}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Taxa Mensal:</span>
                            <p className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-gray-900">
                              {((Number(investment.monthly_return_rate) || 0) * 100).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Período de Liquidez:</span>
                            <p className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-gray-900">
                              {investment.profitability_liquidity}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Dividendos Disponíveis:</span>
                            <p className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-green-600">
                              {formatCurrency(calculateDividendsByPeriod({ 
                                ...investment, 
                                amount: Math.max(0, (Number(investment.amount) || 0) - (investment.withdrawals?.reduce((sum: number, w: any) => sum + Number(w.amount), 0) || 0))
                              }))}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedInvestment?.id === investment.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`} style={{ borderRadius: '15px' }}>
                          {selectedInvestment?.id === investment.id && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {userSummary.investments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum investimento ativo encontrado.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tipo de Resgate */}
        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003F28] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader>
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">Tipo de Resgate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={withdrawType}
              onValueChange={(value: "partial" | "total" | "dividends_by_period" | "monthly_return") =>
                setWithdrawType(value)
              }
            >
              <div className={`flex items-center space-x-2 p-4 border rounded-lg ${
                !selectedInvestment || !canWithdrawDividendsByPeriod(selectedInvestment) || !hasDividendsByPeriod(selectedInvestment) 
                  ? 'opacity-50 cursor-not-allowed bg-[#D9D9D9]' 
                  : 'hover:bg-[#D9D9D9]/80 bg-[#D9D9D9]'
              }`} style={{ borderRadius: '15px' }}>
                <RadioGroupItem 
                  value="dividends_by_period" 
                  id="dividends_by_period" 
                  disabled={!selectedInvestment || !canWithdrawDividendsByPeriod(selectedInvestment) || !hasDividendsByPeriod(selectedInvestment)}
                />
                <Label htmlFor="dividends_by_period" className="flex-1 cursor-pointer">
                  <div>
                    <p className="text-[#003F28] font-ibm-plex-sans font-normal text-lg flex items-center">
                      Resgate dos Dividendos por Período
                      {(!selectedInvestment || !canWithdrawDividendsByPeriod(selectedInvestment) || !hasDividendsByPeriod(selectedInvestment)) && (
                        <Badge variant="secondary" className="ml-2 text-xs bg-[#D9D9D9] text-[#003F28]">
                          Indisponível
                        </Badge>
                      )}
                    </p>
                    <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-lg">
                      Resgatar apenas os dividendos acumulados do período contratado (sem multa)
                    </p>
                    {!selectedInvestment && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Selecione um investimento primeiro
                      </p>
                    )}
                    {selectedInvestment && !canWithdrawDividendsByPeriod(selectedInvestment) && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Você precisa aguardar o período de liquidez para resgatar dividendos.
                        {getDividendsAvailableDate(selectedInvestment) && (
                          <span className="block mt-1">
                            Disponível a partir de: {getDividendsAvailableDate(selectedInvestment)?.toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    )}
                    {selectedInvestment && canWithdrawDividendsByPeriod(selectedInvestment) && !hasDividendsByPeriod(selectedInvestment) && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Não há dividendos disponíveis para resgate
                      </p>
                    )}
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-2 p-4 border rounded-lg ${
                !selectedInvestment || !canWithdrawMonthlyReturn(selectedInvestment) || !hasCurrentMonthlyReturn(selectedInvestment) 
                  ? 'opacity-50 cursor-not-allowed bg-[#D9D9D9]' 
                  : 'hover:bg-[#D9D9D9]/80 bg-[#D9D9D9]'
              }`} style={{ borderRadius: '15px' }}>
                <RadioGroupItem 
                  value="monthly_return" 
                  id="monthly_return" 
                  disabled={!selectedInvestment || !canWithdrawMonthlyReturn(selectedInvestment) || !hasCurrentMonthlyReturn(selectedInvestment)}
                />
                <Label htmlFor="monthly_return" className="flex-1 cursor-pointer">
                  <div>
                    <p className="text-[#003F28] font-ibm-plex-sans font-normal text-lg flex items-center">
                      Resgate do Retorno Mensal
                      {(!selectedInvestment || !canWithdrawMonthlyReturn(selectedInvestment) || !hasCurrentMonthlyReturn(selectedInvestment)) && (
                        <Badge variant="secondary" className="ml-2 text-xs bg-[#D9D9D9] text-[#003F28]">
                          Indisponível
                        </Badge>
                      )}
                    </p>
                    <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-lg">
                      Resgatar apenas o retorno mensal atual (sem multa)
                    </p>
                    {!selectedInvestment && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Selecione um investimento primeiro
                      </p>
                    )}
                    {selectedInvestment && !canWithdrawMonthlyReturn(selectedInvestment) && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Você precisa aguardar o período de liquidez da rentabilidade. 
                        {getMonthlyReturnAvailableDate(selectedInvestment) && (
                          <span className="block mt-1">
                            Disponível a partir de: {getMonthlyReturnAvailableDate(selectedInvestment)?.toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    )}
                    {selectedInvestment && canWithdrawMonthlyReturn(selectedInvestment) && !hasCurrentMonthlyReturn(selectedInvestment) && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Não há retorno mensal disponível para resgate
                      </p>
                    )}
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-2 p-4 border rounded-lg ${
                !selectedInvestment || !canWithdrawPartial(selectedInvestment) 
                  ? 'opacity-50 cursor-not-allowed bg-[#D9D9D9]' 
                  : 'hover:bg-[#D9D9D9]/80 bg-[#D9D9D9]'
              }`} style={{ borderRadius: '15px' }}>
                <RadioGroupItem 
                  value="partial" 
                  id="partial" 
                  disabled={!selectedInvestment || !canWithdrawPartial(selectedInvestment)}
                />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <div>
                    <p className="text-[#003F28] font-ibm-plex-sans font-normal text-lg flex items-center">
                      Resgate Parcial
                      {(!selectedInvestment || !canWithdrawPartial(selectedInvestment)) && (
                        <Badge variant="secondary" className="ml-2 text-xs bg-[#D9D9D9] text-[#003F28]">
                          Indisponível
                        </Badge>
                      )}
                    </p>
                    <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-lg">
                      Resgatar apenas parte do valor investido (mínimo R$ 1.000,00) - Perda da rentabilidade do período + 10% de desconto
                    </p>
                    {!selectedInvestment && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Selecione um investimento primeiro
                      </p>
                    )}
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-2 p-4 border rounded-lg ${
                !selectedInvestment || !canWithdrawPartial(selectedInvestment) 
                  ? 'opacity-50 cursor-not-allowed bg-[#D9D9D9]' 
                  : 'hover:bg-[#D9D9D9]/80 bg-[#D9D9D9]'
              }`} style={{ borderRadius: '15px' }}>
                <RadioGroupItem 
                  value="total" 
                  id="total" 
                  disabled={!selectedInvestment || !canWithdrawPartial(selectedInvestment)}
                />
                <Label htmlFor="total" className="flex-1 cursor-pointer">
                  <div>
                    <p className="text-[#003F28] font-ibm-plex-sans font-normal text-lg flex items-center">
                      Resgate Total
                      {(!selectedInvestment || !canWithdrawPartial(selectedInvestment)) && (
                        <Badge variant="secondary" className="ml-2 text-xs bg-[#D9D9D9] text-[#003F28]">
                          Indisponível
                        </Badge>
                      )}
                    </p>
                    <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-lg">
                      Resgatar todo o valor investido e encerrar - Perda da rentabilidade do período + 20% de desconto
                    </p>
                    {!selectedInvestment && (
                      <p className="text-[#00BC6E] font-ibm-plex-sans font-normal text-sm mt-1">
                        Selecione um investimento primeiro
                      </p>
                    )}
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {withdrawType === "partial" && selectedInvestment && canWithdrawPartial(selectedInvestment) && (
              <div>
                <Label htmlFor="withdraw-amount">Valor a Resgatar</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Ex: 5000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1000"
                  max={Number(selectedInvestment.amount) || 0}
                  step="1000"
                  className={withdrawAmount && !isValidPartialWithdrawal(withdrawAmount, selectedInvestment) ? 'border-red-500' : ''}
                />
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                    Valor mínimo: R$ 1.000,00 | Máximo disponível:{" "}
                    {formatCurrency(Number(selectedInvestment.amount) || 0)}
                  </p>
                  {withdrawAmount && !isValidPartialWithdrawal(withdrawAmount, selectedInvestment) && (
                    <p className="text-sm text-red-600">
                      {Number(withdrawAmount) < 1000 
                        ? "Valor mínimo para resgate parcial é R$ 1.000,00"
                        : Number(withdrawAmount) > (Number(selectedInvestment.amount) || 0)
                        ? `Valor máximo disponível é ${formatCurrency(Number(selectedInvestment.amount) || 0)}`
                        : "Valor inválido"
                      }
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Aviso sobre multas */}
            {withdrawType !== "dividends_by_period" && withdrawType !== "monthly_return" && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Aviso Importante
                    </p>
                    <p className="text-sm text-red-600">
                      Resgates parciais <strong>antes do vencimento</strong> estão sujeitos a <strong>10% de desconto</strong> do valor investido e perda da rentabilidade do período. 
                      Resgates totais <strong>antes do vencimento</strong> estão sujeitos a <strong>20% de desconto</strong> do valor investido e perda da rentabilidade do período.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo do Resgate */}
            {selectedInvestment && ((withdrawType === "dividends_by_period" && canWithdrawDividendsByPeriod(selectedInvestment) && hasDividendsByPeriod(selectedInvestment)) || 
              (withdrawType === "monthly_return" && canWithdrawMonthlyReturn(selectedInvestment) && hasCurrentMonthlyReturn(selectedInvestment)) ||
              (withdrawType === "total") || 
              (withdrawType === "partial" && withdrawAmount && isValidPartialWithdrawal(withdrawAmount, selectedInvestment))) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-blue-800 mb-2">
                  Resumo do Resgate
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Valor do Resgate:</span>
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                      {formatCurrency(calculateWithdrawAmount(selectedInvestment))}
                    </span>
                  </div>
                  {calculatePenaltyAmount(selectedInvestment) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Multa (20%):</span>
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                        -{formatCurrency(calculatePenaltyAmount(selectedInvestment))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Valor Líquido:</span>
                    <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-green-600">
                      {formatCurrency(calculateWithdrawAmount(selectedInvestment) - calculatePenaltyAmount(selectedInvestment))}
                    </span>
                  </div>
                  {withdrawType === "partial" && (
                    <>
                      <div className="flex justify-between">
                        <span>Valor Remanescente:</span>
                        <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-blue-600">
                          {formatCurrency(
                            (Number(selectedInvestment.amount) || 0) - calculateWithdrawAmount(selectedInvestment)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Novo Retorno Mensal:</span>
                        <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-blue-600">
                          {formatCurrency(
                            calculateRemainingReturn(calculateWithdrawAmount(selectedInvestment), selectedInvestment)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Gráfico de comparação Investimento vs CDI */}
            {selectedInvestment && (withdrawType === "partial" || withdrawType === "total") && (() => {
              const chartData = generateCDIComparisonChart(selectedInvestment);
              const cdiImpact = calculateCDIImpact(selectedInvestment);
              
              if (chartData.length === 0 || cdiImpact.monthsRemaining <= 0) {
                return (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      Investimento próximo do vencimento ou sem dados para comparação.
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                  <div className="flex items-start space-x-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-[#003F28] font-ibm-plex-sans font-bold text-[20px] leading-[28px] text-amber-800">
                          Comparação: Investimento vs CDI
                        </h4>
                        {cdiLoading && (
                          <span className="text-xs text-amber-600">(Carregando CDI...)</span>
                        )}
                        {!cdiLoading && (
                          <span className="text-xs text-amber-600">
                            (CDI: {(cdiMonthlyRate * 100).toFixed(2)}% a.m.)
                          </span>
                        )}
                      </div>
                      
                      {/* Gráfico de linha */}
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-amber-200" />
                            <XAxis 
                              dataKey="monthLabel"
                              className="text-xs text-amber-800"
                              tick={{ fontSize: 11 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis
                              className="text-xs text-amber-800"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) =>
                                new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                  notation: "compact",
                                }).format(value)
                              }
                            />
                            <Tooltip
                              formatter={(value: number, name: string) => {
                                // O 'name' recebido é o 'name' prop do componente Line
                                // Já vem como "Retorno do Investimento" ou "Retorno no CDI"
                                // Mas vamos garantir que está correto
                                let label = name;
                                
                                // Se por algum motivo vier o dataKey, converter
                                if (name === "investmentReturn") {
                                  label = "Retorno do Investimento";
                                } else if (name === "cdiReturn") {
                                  label = "Retorno no CDI";
                                }
                                
                                return [
                                  new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(value),
                                  label
                                ];
                              }}
                              labelFormatter={(label) => `${label}`}
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.98)",
                                border: "1px solid rgba(251, 191, 36, 0.3)",
                                borderRadius: "8px",
                                color: "#003F28",
                              }}
                            />
                            <Legend 
                              formatter={(value) => {
                                if (value === "Retorno do Investimento") return "Retorno do Investimento";
                                if (value === "Retorno no CDI") return "Retorno no CDI";
                                return value;
                              }}
                              wrapperStyle={{ paddingTop: "20px" }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="investmentReturn" 
                              stroke="#00BC6E" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Retorno do Investimento"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="cdiReturn" 
                              stroke="#F59E0B" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Retorno no CDI"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Resumo */}
                      <div className="mt-4 pt-4 border-t border-amber-300">
                        <div className="flex justify-between items-center">
                          <span className="text-[#003F28] font-ibm-plex-sans font-bold text-[18px] leading-[28px] text-amber-800">
                            Diferença no Vencimento:
                          </span>
                          <span className={`text-[#003F28] font-ibm-plex-sans font-bold text-[18px] leading-[28px] ${
                            cdiImpact.loss > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {cdiImpact.loss > 0 ? '+' : ''}{formatCurrency(cdiImpact.loss)}
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-2">
                          {cdiImpact.loss > 0 
                            ? `Ao manter até o vencimento, você ganhará ${formatCurrency(cdiImpact.loss)} a mais que no CDI`
                            : `Ao manter até o vencimento, você ganhará ${formatCurrency(Math.abs(cdiImpact.loss))} a menos que no CDI`
                          } ({cdiImpact.monthsRemaining} {cdiImpact.monthsRemaining === 1 ? 'mês' : 'meses'} restantes)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <Button
              onClick={() => setStep("confirmation")}
              disabled={
                !selectedInvestment ||
                (withdrawType === "partial" && (!withdrawAmount || !isValidPartialWithdrawal(withdrawAmount, selectedInvestment))) ||
                (withdrawType === "dividends_by_period" && (!canWithdrawDividendsByPeriod(selectedInvestment) || !hasDividendsByPeriod(selectedInvestment))) ||
                (withdrawType === "monthly_return" && (!canWithdrawMonthlyReturn(selectedInvestment) || !hasCurrentMonthlyReturn(selectedInvestment)))
              }
              className="w-full text-white font-ibm-plex-sans font-bold text-lg"
              size="lg"
              style={{ 
                backgroundColor: withdrawType === "total" ? '#dc2626' : '#012544',
                borderRadius: '11px'
              }}
            >
              {!selectedInvestment && "Selecione um Investimento"}
              {selectedInvestment && withdrawType === "dividends_by_period" && (!canWithdrawDividendsByPeriod(selectedInvestment) || !hasDividendsByPeriod(selectedInvestment)) && "Dividendos Indisponíveis"}
              {selectedInvestment && withdrawType === "monthly_return" && (!canWithdrawMonthlyReturn(selectedInvestment) || !hasCurrentMonthlyReturn(selectedInvestment)) && "Retorno Mensal Indisponível"}
              {selectedInvestment && withdrawType === "partial" && (!withdrawAmount || !isValidPartialWithdrawal(withdrawAmount, selectedInvestment)) && "Valor Inválido"}
              {selectedInvestment && !(
                (withdrawType === "partial" && (!withdrawAmount || !isValidPartialWithdrawal(withdrawAmount, selectedInvestment))) ||
                (withdrawType === "dividends_by_period" && (!canWithdrawDividendsByPeriod(selectedInvestment) || !hasDividendsByPeriod(selectedInvestment))) ||
                (withdrawType === "monthly_return" && (!canWithdrawMonthlyReturn(selectedInvestment) || !hasCurrentMonthlyReturn(selectedInvestment)))
              ) && "Continuar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
