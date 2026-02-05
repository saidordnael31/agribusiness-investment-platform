import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * API para buscar métricas de churn para o dashboard gerencial
 * Apenas para administradores
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se é admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.user_type !== "admin") {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      );
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // 1. Captação Total (TODOS os investimentos, não apenas ativos)
    // Para churn geral, precisamos considerar todos os investimentos já criados
    const { data: allInvestments, error: investmentsError } = await supabase
      .from("investments")
      .select("amount, status, created_at, payment_date, user_id");

    if (investmentsError) {
      throw investmentsError;
    }

    // Captação total (todos os tempos - TODOS os investimentos)
    const totalCaptation = allInvestments?.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) || 0;
    
    // Captação apenas de investimentos ativos (para métricas específicas como passivo)
    const activeInvestments = allInvestments?.filter(inv => inv.status === "active") || [];
    const totalActiveCaptation = activeInvestments.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    // Captação do mês atual (todos os investimentos criados no mês)
    const monthlyCaptation = allInvestments?.filter(inv => {
      const createdDate = new Date(inv.created_at);
      return createdDate >= startOfMonth;
    }).reduce((sum, inv) => sum + Number(inv.amount || 0), 0) || 0;

    // Captação do ano atual (todos os investimentos criados no ano)
    const yearlyCaptation = allInvestments?.filter(inv => {
      const createdDate = new Date(inv.created_at);
      return createdDate >= startOfYear;
    }).reduce((sum, inv) => sum + Number(inv.amount || 0), 0) || 0;

    // 2. Dividendos Pagos
    // Calcular baseado nas comissões já pagas aos investidores
    // Para TODOS os investimentos (não apenas ativos), calcular quantas comissões mensais já foram pagas
    
    // Buscar TODOS os investimentos com dados necessários (para churn geral)
    const { data: investmentsForDividends, error: investmentsDividendsError } = await supabase
      .from("investments")
      .select("id, amount, payment_date, created_at, monthly_return_rate, profitability_liquidity, commitment_period, status");

    if (investmentsDividendsError) {
      throw investmentsDividendsError;
    }

    // Importar função para calcular taxa mensal do investidor
    const { getInvestorMonthlyRate } = await import("@/lib/commission-calculator");

    let totalDividendsPaid = 0;
    let monthlyDividendsPaid = 0;
    let yearlyDividendsPaid = 0;

    investmentsForDividends?.forEach(inv => {
      const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at);
      const amount = Number(inv.amount || 0);
      const commitmentPeriod = inv.commitment_period || 12;
      const liquidity = (inv.profitability_liquidity || "mensal").toLowerCase() as "mensal" | "semestral" | "anual" | "bienal" | "trienal";
      
      // Obter taxa mensal do investidor
      const monthlyRate = getInvestorMonthlyRate(commitmentPeriod, liquidity) || Number(inv.monthly_return_rate) || 0.02;
      
      // Calcular D+60 (investidores só começam a receber após 60 dias)
      const d60Date = new Date(paymentDate);
      d60Date.setDate(d60Date.getDate() + 60);
      
      // Se ainda não passou D+60, não há dividendos pagos
      if (d60Date > today) {
        return;
      }
      
      // Para investimentos inativos/cancelados, calcular até a data de cancelamento
      // Para ativos, calcular até hoje
      let endDate = today;
      if (inv.status !== "active" && inv.status !== "pending") {
        // Se o investimento foi cancelado/resgatado, usar a data de atualização como fim
        // Mas como não temos essa data, vamos usar até hoje mesmo
        // (em uma versão futura, podemos adicionar uma coluna de data de cancelamento)
      }
      
      // Calcular quantos meses completos já passaram desde D+60 até a data final
      const monthsSinceD60 = Math.floor(
        (endDate.getTime() - d60Date.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      if (monthsSinceD60 <= 0) {
        return;
      }
      
      // Calcular comissão mensal do investidor
      const monthlyCommission = amount * monthlyRate;
      
      // Total de dividendos pagos = comissão mensal × meses completos desde D+60
      const totalPaidForInvestment = monthlyCommission * monthsSinceD60;
      totalDividendsPaid += totalPaidForInvestment;
      
      // Calcular dividendos pagos no mês atual
      // Verificar se D+60 caiu antes do início do mês atual
      if (d60Date < startOfMonth) {
        // Se D+60 foi antes do mês atual, considerar 1 mês de comissão para o mês atual
        monthlyDividendsPaid += monthlyCommission;
      } else {
        // Se D+60 foi durante o mês atual, calcular proporcional
        const daysInMonth = (today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24);
        const proportionalCommission = monthlyCommission * (daysInMonth / 30);
        monthlyDividendsPaid += proportionalCommission;
      }
      
      // Calcular dividendos pagos no ano atual
      if (d60Date < startOfYear) {
        // Se D+60 foi antes do ano atual, calcular meses completos no ano
        const monthsInYear = Math.floor(
          (today.getTime() - Math.max(startOfYear.getTime(), d60Date.getTime())) / (1000 * 60 * 60 * 24 * 30)
        );
        yearlyDividendsPaid += monthlyCommission * Math.max(0, monthsInYear);
      } else if (d60Date >= startOfYear && d60Date <= today) {
        // Se D+60 foi durante o ano atual, calcular proporcional
        const daysInYear = (today.getTime() - d60Date.getTime()) / (1000 * 60 * 60 * 24);
        const proportionalCommission = monthlyCommission * (daysInYear / 30);
        yearlyDividendsPaid += proportionalCommission;
      }
    });

    // 3. Resgates (transações do tipo "withdrawal")
    // Como não temos como identificar resgates de dividendos sem metadata/withdrawal_type,
    // vamos considerar todas as transações de withdrawal como resgates de capital
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from("transactions")
      .select("amount, created_at")
      .eq("type", "withdrawal")
      .eq("status", "completed");

    if (withdrawalsError) {
      throw withdrawalsError;
    }

    const capitalWithdrawals = withdrawals || [];

    // Resgates totais (apenas capital, não dividendos)
    const totalWithdrawals = capitalWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

    // Resgates do mês atual
    const monthlyWithdrawals = capitalWithdrawals.filter(w => {
      const createdDate = new Date(w.created_at);
      return createdDate >= startOfMonth;
    }).reduce((sum, w) => sum + Number(w.amount || 0), 0);

    // Resgates do ano atual
    const yearlyWithdrawals = capitalWithdrawals.filter(w => {
      const createdDate = new Date(w.created_at);
      return createdDate >= startOfYear;
    }).reduce((sum, w) => sum + Number(w.amount || 0), 0);

    // 4. Vencimentos (investimentos que venceram ou vão vencer)
    // Buscar TODOS os investimentos para calcular vencimentos gerais
    const { data: investmentsForExpiry, error: expiryError } = await supabase
      .from("investments")
      .select("id, amount, commitment_period, payment_date, created_at, status, monthly_return_rate, profitability_liquidity");

    if (expiryError) {
      throw expiryError;
    }

    // Calcular vencimentos
    let totalExpired = 0;
    let totalExpiringThisMonth = 0;
    let totalExpiringThisYear = 0;
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfYear = new Date(today.getFullYear(), 11, 31);

    investmentsForExpiry?.forEach(inv => {
      const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at);
      const commitmentPeriod = inv.commitment_period || 12;
      const expiryDate = new Date(paymentDate);
      expiryDate.setMonth(expiryDate.getMonth() + commitmentPeriod);

      const amount = Number(inv.amount || 0);

      // Já vencidos
      if (expiryDate < today) {
        totalExpired += amount;
      }
      // Vencendo este mês
      if (expiryDate >= startOfMonth && expiryDate <= endOfMonth) {
        totalExpiringThisMonth += amount;
      }
      // Vencendo este ano
      if (expiryDate >= startOfYear && expiryDate <= endOfYear) {
        totalExpiringThisYear += amount;
      }
    });

    // 5. Rendimento Acumulado (retornos calculados - dividendos pagos)
    // Calcular retorno projetado de TODOS os investimentos (geral, não apenas ativos)
    let totalProjectedReturns = 0;
    
    // Os investimentos já foram buscados acima, então usamos investmentsForExpiry
    // Considerar TODOS os investimentos para cálculo geral de rendimento
    investmentsForExpiry?.forEach(inv => {
      const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at);
      const monthsElapsed = Math.max(0, Math.floor(
        (today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ));
      
      if (monthsElapsed > 0) {
        // Usar dados já disponíveis do investimento
        const monthlyRate = Number(inv.monthly_return_rate || 0);
        const amount = Number(inv.amount || 0);
        const liquidity = inv.profitability_liquidity || "Mensal";

        // Calcular retorno acumulado
        if (liquidity === "Mensal") {
          // Juros simples: retorno mensal fixo × meses
          totalProjectedReturns += amount * monthlyRate * monthsElapsed;
        } else {
          // Juros compostos
          const compoundValue = amount * Math.pow(1 + monthlyRate, monthsElapsed);
          totalProjectedReturns += compoundValue - amount;
        }
      }
    });

    // Rendimento acumulado = retornos projetados - dividendos já pagos
    const accumulatedReturns = totalProjectedReturns - totalDividendsPaid;

    // 6. Dívida/Passivo da Operação
    // Passivo = Total de investimentos ATIVOS + Retornos acumulados - Resgates
    // Usar totalActiveCaptation para o passivo (apenas investimentos ativos)
    const totalLiabilities = totalActiveCaptation + accumulatedReturns - totalWithdrawals;

    // 7. Métricas adicionais
    const activeInvestmentsCount = investmentsForExpiry?.filter(inv => inv.status === "active").length || 0;
    const totalInvestors = new Set(allInvestments?.map(inv => inv.user_id) || []).size;

    return NextResponse.json({
      success: true,
      data: {
        // Captação
        captation: {
          total: totalCaptation,
          monthly: monthlyCaptation,
          yearly: yearlyCaptation,
        },
        // Dividendos
        dividends: {
          total: totalDividendsPaid,
          monthly: monthlyDividendsPaid,
          yearly: yearlyDividendsPaid,
        },
        // Resgates
        withdrawals: {
          total: totalWithdrawals,
          monthly: monthlyWithdrawals,
          yearly: yearlyWithdrawals,
        },
        // Vencimentos
        expirations: {
          expired: totalExpired,
          thisMonth: totalExpiringThisMonth,
          thisYear: totalExpiringThisYear,
        },
        // Rendimento
        returns: {
          accumulated: accumulatedReturns,
          projected: totalProjectedReturns,
          paid: totalDividendsPaid,
        },
        // Passivo
        liabilities: {
          total: totalLiabilities,
          breakdown: {
            investments: totalActiveCaptation, // Apenas investimentos ativos
            returns: accumulatedReturns,
            withdrawals: totalWithdrawals,
          },
        },
        // Métricas gerais
        metrics: {
          activeInvestments: activeInvestmentsCount,
          totalInvestors: totalInvestors,
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar métricas de churn:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar métricas" },
      { status: 500 }
    );
  }
}

