"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText, AlertCircle, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

interface ChurnMetrics {
  captation: {
    total: number;
    monthly: number;
    yearly: number;
  };
  dividends: {
    total: number;
    monthly: number;
    yearly: number;
  };
  withdrawals: {
    total: number;
    monthly: number;
    yearly: number;
  };
  expirations: {
    expired: number;
    thisMonth: number;
    thisYear: number;
  };
  returns: {
    accumulated: number;
    projected: number;
    paid: number;
  };
  liabilities: {
    total: number;
    breakdown: {
      investments: number;
      returns: number;
      withdrawals: number;
    };
  };
  metrics: {
    activeInvestments: number;
    totalInvestors: number;
  };
}

export default function ChurnPage() {
  const [metrics, setMetrics] = useState<ChurnMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/churn-metrics");
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
      } else {
        setError(data.error || "Erro ao carregar métricas");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedTypes={["admin"]}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#003F28]" />
            <p className="text-[#003F28]">Carregando métricas...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedTypes={["admin"]}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro</h3>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  if (!metrics) {
    return null;
  }

  // Dados para gráficos
  const monthlyComparisonData = [
    {
      name: "Captação",
      value: metrics.captation.monthly,
    },
    {
      name: "Dividendos",
      value: metrics.dividends.monthly,
    },
    {
      name: "Resgates",
      value: metrics.withdrawals.monthly,
    },
  ];

  const yearlyTrendData = [
    {
      period: "Captação",
      value: metrics.captation.yearly,
    },
    {
      period: "Dividendos",
      value: metrics.dividends.yearly,
    },
    {
      period: "Resgates",
      value: metrics.withdrawals.yearly,
    },
  ];

  return (
    <ProtectedRoute allowedTypes={["admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#003F28] mb-2">Dashboard Gerencial - Churn</h1>
            <p className="text-muted-foreground">Visão geral das métricas financeiras da operação</p>
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Captação Total */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Captação Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.captation.total)}</div>
                <div className="flex items-center pt-2 space-x-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Mês:</span> {formatCurrency(metrics.captation.monthly)}
                  </div>
                  <div>
                    <span className="font-medium">Ano:</span> {formatCurrency(metrics.captation.yearly)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dividendos Pagos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dividendos Pagos</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.dividends.total)}</div>
                <div className="flex items-center pt-2 space-x-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Mês:</span> {formatCurrency(metrics.dividends.monthly)}
                  </div>
                  <div>
                    <span className="font-medium">Ano:</span> {formatCurrency(metrics.dividends.yearly)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resgates */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resgates</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.withdrawals.total)}</div>
                <div className="flex items-center pt-2 space-x-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Mês:</span> {formatCurrency(metrics.withdrawals.monthly)}
                  </div>
                  <div>
                    <span className="font-medium">Ano:</span> {formatCurrency(metrics.withdrawals.yearly)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vencimentos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencimentos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.expirations.expired)}</div>
                <div className="flex items-center pt-2 space-x-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Este Mês:</span> {formatCurrency(metrics.expirations.thisMonth)}
                  </div>
                  <div>
                    <span className="font-medium">Este Ano:</span> {formatCurrency(metrics.expirations.thisYear)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rendimento Acumulado */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rendimento Acumulado</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.returns.accumulated)}</div>
                <div className="flex items-center pt-2 space-x-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Projetado:</span> {formatCurrency(metrics.returns.projected)}
                  </div>
                  <div>
                    <span className="font-medium">Pago:</span> {formatCurrency(metrics.returns.paid)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dívida/Passivo */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dívida/Passivo da Operação</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.liabilities.total)}</div>
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Investimentos:</span>
                    <span className="font-medium">{formatCurrency(metrics.liabilities.breakdown.investments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retornos:</span>
                    <span className="font-medium">{formatCurrency(metrics.liabilities.breakdown.returns)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resgates:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(metrics.liabilities.breakdown.withdrawals)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métricas Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Investimentos Ativos:</span>
                    <span className="text-lg font-semibold">{metrics.metrics.activeInvestments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total de Investidores:</span>
                    <span className="text-lg font-semibold">{metrics.metrics.totalInvestors}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Saldo Líquido:</span>
                    <span className={`text-lg font-semibold ${
                      (metrics.captation.total + metrics.returns.accumulated - metrics.withdrawals.total) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(metrics.captation.total + metrics.returns.accumulated - metrics.withdrawals.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taxa de Resgate:</span>
                    <span className="text-lg font-semibold">
                      {metrics.captation.total > 0 
                        ? ((metrics.withdrawals.total / metrics.captation.total) * 100).toFixed(2)
                        : 0
                      }%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Comparação Mensal */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação Mensal</CardTitle>
                <CardDescription>Captação, Dividendos e Resgates do mês atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis
                        tickFormatter={(value) =>
                          new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            notation: "compact",
                          }).format(value)
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.98)",
                          border: "1px solid rgba(0, 0, 0, 0.1)",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#003F28" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Tendência Anual */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência Anual</CardTitle>
                <CardDescription>Comparação de valores acumulados no ano</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis
                        tickFormatter={(value) =>
                          new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            notation: "compact",
                          }).format(value)
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.98)",
                          border: "1px solid rgba(0, 0, 0, 0.1)",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#00BC6E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

