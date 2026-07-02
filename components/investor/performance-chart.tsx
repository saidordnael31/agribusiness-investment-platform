"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createBrowserClient } from "@supabase/ssr";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface InvestmentRow {
  id: string;
  amount: number;
  payment_date: string | null;
}

interface MonthlyReturnRow {
  investment_id: string;
  period_end: string;
  return_amount: number;
  return_rate: number | string;
}

interface InvestmentSeries {
  id: string;
  dataKey: string;
  label: string;
  amount: number;
  color: string;
}

type ChartRow = {
  month: string;
  [dataKey: string]: string | number;
};

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const SERIES_COLORS = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
  "#f87171",
];

function parsePeriodEnd(periodEnd: string) {
  const [year, month] = periodEnd.split("-").map(Number);
  return { year, month: month - 1 };
}

function monthKey(year: number, monthIndex: number) {
  return `${MONTH_LABELS[monthIndex]}/${year}`;
}

function formatInvestmentLabel(investment: InvestmentRow): string {
  const amountLabel = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
  }).format(investment.amount);

  if (!investment.payment_date) {
    return amountLabel;
  }

  const [year, month] = investment.payment_date.split("-").map(Number);
  const dateLabel = `${String(month).padStart(2, "0")}/${year}`;

  return `${amountLabel} · ${dateLabel}`;
}

function buildInvestmentSeries(investments: InvestmentRow[]): InvestmentSeries[] {
  return investments.map((investment, index) => ({
    id: investment.id,
    dataKey: `inv_${index}`,
    label: formatInvestmentLabel(investment),
    amount: investment.amount,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  }));
}

function formatReturnRate(rate: number | string): number {
  return Math.round(Number(rate) * 10000) / 100;
}

function buildChartByInvestment(
  monthlyReturns: MonthlyReturnRow[],
  series: InvestmentSeries[],
): ChartRow[] {
  if (monthlyReturns.length === 0 || series.length === 0) {
    return [];
  }

  const seriesByInvestmentId = new Map(
    series.map((item) => [item.id, item.dataKey]),
  );

  const returnsBySeriesMonth = new Map<string, number>();
  const ratesBySeriesMonth = new Map<string, number>();
  const amountsBySeriesMonth = new Map<string, number>();

  for (const row of monthlyReturns) {
    const dataKey = seriesByInvestmentId.get(row.investment_id);
    if (!dataKey) continue;

    const { year, month } = parsePeriodEnd(row.period_end);
    const key = `${dataKey}|${monthKey(year, month)}`;
    const amount = Number(row.return_amount);

    returnsBySeriesMonth.set(
      key,
      (returnsBySeriesMonth.get(key) || 0) + amount,
    );
    amountsBySeriesMonth.set(key, amount);
    ratesBySeriesMonth.set(key, formatReturnRate(row.return_rate));
  }

  const monthKeys = [
    ...new Set(
      [...returnsBySeriesMonth.keys()].map((key) => key.split("|")[1]),
    ),
  ].sort((a, b) => {
    const [monthA, yearA] = a.split("/");
    const [monthB, yearB] = b.split("/");
    const dateA = new Date(Number(yearA), MONTH_LABELS.indexOf(monthA), 1);
    const dateB = new Date(Number(yearB), MONTH_LABELS.indexOf(monthB), 1);
    return dateA.getTime() - dateB.getTime();
  });

  return monthKeys.map((month) => {
    const row: ChartRow = { month };

    for (const item of series) {
      const mapKey = `${item.dataKey}|${month}`;
      const rate = ratesBySeriesMonth.get(mapKey);
      const amount = amountsBySeriesMonth.get(mapKey) || 0;

      if (rate != null) {
        row[item.dataKey] = rate;
        row[`${item.dataKey}_amount`] = Math.round(amount * 100) / 100;
      }
    }

    return row;
  });
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  chartRow,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
  series: InvestmentSeries[];
  chartRow?: ChartRow;
}) {
  if (!active || !payload?.length) return null;

  const seriesByKey = new Map(series.map((item) => [item.dataKey, item]));

  return (
    <div
      className="rounded-lg border border-white/20 bg-black/80 p-3 shadow-lg"
      style={{ color: "white" }}
    >
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="space-y-1">
        {payload
          .filter((entry) => Number(entry.value) > 0)
          .map((entry) => {
            const meta = seriesByKey.get(String(entry.dataKey));
            if (!meta) return null;

            const amount = chartRow?.[`${entry.dataKey}_amount`];

            return (
              <div key={entry.dataKey} className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{meta.label}</span>
                </div>
                <div className="pl-4 text-xs font-medium text-green-300">
                  {Number(entry.value).toFixed(2)}% a.m.
                </div>
                {amount != null && (
                  <div className="pl-4 text-xs text-white/70">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(amount))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function PerformanceChart() {
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [series, setSeries] = useState<InvestmentSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalReturns, setTotalReturns] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [hasMonthlyReturns, setHasMonthlyReturns] = useState(false);

  const monthCount = chartData.length;

  const fetchInvestmentData = async () => {
    try {
      setLoading(true);

      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setChartData([]);
        setSeries([]);
        return;
      }

      const user = JSON.parse(userStr);
      if (!user.id) {
        setChartData([]);
        setSeries([]);
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const [{ data: investments, error: investmentsError }, { data: monthlyReturns, error: returnsError }] =
        await Promise.all([
          supabase
            .from("investments")
            .select("id, amount, payment_date")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("payment_date", { ascending: true }),
          supabase
            .from("monthly_returns")
            .select("investment_id, period_end, return_amount, return_rate")
            .eq("investor_id", user.id)
            .order("period_end", { ascending: true })
            .order("current_return_period", { ascending: true }),
        ]);

      if (investmentsError || returnsError) {
        console.error(
          "Erro ao buscar dados de performance:",
          investmentsError || returnsError,
        );
        setChartData([]);
        setSeries([]);
        return;
      }

      const activeInvestments = (investments || []).map((inv) => ({
        id: inv.id,
        amount: Number(inv.amount),
        payment_date: inv.payment_date,
      }));

      const investedTotal = activeInvestments.reduce(
        (sum, inv) => sum + inv.amount,
        0,
      );

      setTotalInvested(investedTotal);

      if (activeInvestments.length === 0) {
        setChartData([]);
        setSeries([]);
        setTotalReturns(0);
        setGrowthRate(0);
        setHasMonthlyReturns(false);
        return;
      }

      const investmentIds = new Set(activeInvestments.map((inv) => inv.id));
      const returns = (monthlyReturns || []).filter((row) =>
        investmentIds.has(row.investment_id),
      );

      setHasMonthlyReturns(returns.length > 0);

      const investmentSeries = buildInvestmentSeries(activeInvestments);
      setSeries(investmentSeries);
      setChartData(buildChartByInvestment(returns, investmentSeries));

      const returnsTotal =
        returns.reduce((sum, row) => sum + Number(row.return_amount), 0) || 0;

      setTotalReturns(Math.round(returnsTotal * 100) / 100);
      setGrowthRate(
        investedTotal > 0 ? (returnsTotal / investedTotal) * 100 : 0,
      );
    } catch (error) {
      console.error("Erro ao carregar dados de performance:", error);
      setChartData([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentData();
  }, []);

  const tooltipContent = useMemo(
    () =>
      function TooltipContent(props: {
        active?: boolean;
        payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
        label?: string;
      }) {
        const chartRow = chartData.find((row) => row.month === props.label);
        return (
          <ChartTooltip {...props} series={series} chartRow={chartRow} />
        );
      },
    [series, chartData],
  );

  const getGrowthIcon = () => {
    if (growthRate > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (growthRate < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getGrowthColor = () => {
    if (growthRate > 0) return "text-green-500";
    if (growthRate < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
          <p className="text-sm text-white/80">Carregando performance...</p>
        </div>
      </div>
    );
  }

  if (totalInvested === 0) {
    return (
      <div className="h-[300px] w-full text-center">
        <div className="pt-16">
          <h3 className="text-xl font-semibold text-[#4A4D4C] leading-[35px] mb-2">
            Nenhum investimento ativo
          </h3>
          <p className="text-[#D9D9D9] font-ibm-plex-sans font-normal text-lg leading-[35px] text-center">
            Faça seu primeiro investimento para acompanhar a performance aqui
          </p>
        </div>
      </div>
    );
  }

  if (!hasMonthlyReturns) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-xs text-white/70">Total Investido</p>
            <p className="text-sm font-semibold text-white">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(totalInvested)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/70">Retornos</p>
            <p className="text-sm font-semibold text-green-300">+R$ 0</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/70">Crescimento</p>
            <div className="flex items-center justify-center gap-1">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">
                0.0%
              </p>
            </div>
          </div>
        </div>
        <div className="h-[200px] w-full flex items-center justify-center">
          <p className="text-[#D9D9D9] font-ibm-plex-sans text-base text-center px-4">
            Os rendimentos mensais aparecerão aqui após o primeiro fechamento
            (dia 20).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <p className="text-xs text-white/70">Total Investido</p>
          <p className="text-sm font-semibold text-white">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(totalInvested)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-white/70">Retornos</p>
          <p className="text-sm font-semibold text-green-300">
            +
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(totalReturns)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-white/70">Crescimento</p>
          <div className="flex items-center justify-center gap-1">
            {getGrowthIcon()}
            <p className={`text-sm font-semibold ${getGrowthColor()}`}>
              {growthRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-white/20" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.7)" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "rgba(255, 255, 255, 0.7)" }}
              tickFormatter={(value) => `${Number(value).toFixed(2)}%`}
            />
            <Tooltip content={tooltipContent} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}
            />
            {series.map((item) => (
              <Line
                key={item.id}
                type="monotone"
                dataKey={item.dataKey}
                name={item.label}
                stroke={item.color}
                strokeWidth={2}
                dot={{ fill: item.color, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-white/70 text-center">
        <p>
          Uma linha por investimento • rentabilidade efetiva do mês (%) •{" "}
          {monthCount} {monthCount === 1 ? "mês" : "meses"}
        </p>
      </div>
    </div>
  );
}
