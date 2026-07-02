"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Loader2,
  MinusCircle,
  Pencil,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  AdminShell,
  AdminFintechNavbar,
  AdminHero,
  AdminSectionCard,
  AdminFilterBar,
  AdminSegmentTabs,
  AdminSegmentPanel,
  AdminPillTabs,
  AdminPillTabPanel,
  AdminSecondaryButton,
  AdminPrimaryButton,
  AdminStatusBadge,
  AdminDataTable,
  AdminTable,
  AdminTableHeader,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableEmpty,
  AdminInvestorCell,
  AdminMoney,
  FintechMetricCard,
  FintechMetricGrid,
  AdminAreaChartPanel,
  AdminDonutChart,
  AdminWorkspace,
  AdminRowActions,
  type AdminRowAction,
  adminTokens,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";

interface CommissionRecord {
  id: string;
  investor_id: string;
  investment_id: string;
  investment_amount: number;
  commission_amount: number;
  commission_type: string;
  status: string;
  period_start: string;
  period_end: string;
  to_be_pay_at: string | null;
  paid_at: string | null;
  month_rate: number;
}

interface MonthlyReturnRecord {
  id: string;
  investor_id: string;
  investment_id: string;
  investment_amount: number;
  investment_rate: number;
  return_amount: number;
  return_rate: number;
  commission_type: string;
  current_return_period: number;
  period_start: string;
  period_end: string;
  to_be_pay_at: string | null;
  paid_at: string | null;
}

interface ProfileRecord {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface InvestmentRecord {
  id: string;
  user_id?: string;
  payment_date: string | null;
  profitability_liquidity: string | null;
  amount?: number;
  monthly_return_rate?: number;
  commitment_period?: number;
  quota_type?: string;
  status?: string;
  created_at?: string;
}

interface ActiveInvestorSummary {
  id: string;
  fullName: string;
  email: string;
  investmentCount: number;
  totalInvested: number;
  totalGenerated: number;
  availableDividends: number;
}

type StatusFilter = "all" | "pending" | "paid" | "late";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateOnly(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  const [datePart] = dateStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function formatRate(rate: number) {
  return `${(Number(rate) * 100).toFixed(2)}%`;
}

function parseDateOnlyValue(dateStr: string): Date {
  const [datePart] = dateStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function isCommissionOverdue(row: {
  status: string;
  paid_at: string | null;
  to_be_pay_at: string | null;
}) {
  if (row.status === "paid" || row.paid_at) return false;
  if (!row.to_be_pay_at) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDateOnlyValue(row.to_be_pay_at) < today;
}

function hasNoYield(amount: number) {
  return Number(amount) === 0;
}

function NoYieldBadge() {
  return <AdminStatusBadge tone="muted">Sem rendimento</AdminStatusBadge>;
}

function FullReturnBadge() {
  return <AdminStatusBadge tone="success">Rendimento total</AdminStatusBadge>;
}

function getMaxReturnAmount(row: MonthlyReturnRecord) {
  const amount = Number(row.investment_amount);
  const rate = Number(row.investment_rate);
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0;
  return Math.round(amount * rate * 100) / 100;
}

function isFullReturn(row: MonthlyReturnRecord) {
  const maxAmount = getMaxReturnAmount(row);
  return maxAmount > 0 && Math.abs(Number(row.return_amount) - maxAmount) < 0.005;
}

function isCommissionPaid(row: CommissionRecord) {
  return row.status === "paid" || !!row.paid_at;
}

function CommissionStatusBadges({ row }: { row: CommissionRecord }) {
  if (isCommissionPaid(row)) {
    return (
      <div className="flex flex-col gap-1">
        <AdminStatusBadge tone="success">Pago</AdminStatusBadge>
        {row.paid_at && (
          <span className="text-xs text-slate-500">
            em {formatDateOnly(row.paid_at)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <AdminStatusBadge tone="warning">Pendente</AdminStatusBadge>
      {isCommissionOverdue(row) && (
        <AdminStatusBadge tone="danger">Atrasado</AdminStatusBadge>
      )}
    </div>
  );
}

function ReturnAmountCell({
  amount,
  monthlyReturn,
}: {
  amount: number;
  monthlyReturn?: MonthlyReturnRecord;
}) {
  const value = Number(amount);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminMoney value={formatCurrency(value)} emphasis />
      {hasNoYield(value) && <NoYieldBadge />}
      {monthlyReturn && isFullReturn(monthlyReturn) && <FullReturnBadge />}
    </div>
  );
}

function canMarkCommissionAsPaid(row: CommissionRecord) {
  return !isCommissionPaid(row);
}

function isCommissionAvailable(row: {
  status: string;
  paid_at: string | null;
  to_be_pay_at: string | null;
}) {
  if (row.status === "paid" || row.paid_at) return false;
  if (!row.to_be_pay_at) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDateOnlyValue(row.to_be_pay_at) <= today;
}

function getInvestmentStats(
  investmentId: string,
  commissionRows: CommissionRecord[],
  returnRows: MonthlyReturnRecord[],
) {
  const investmentReturns = returnRows.filter(
    (row) => row.investment_id === investmentId,
  );
  const investmentCommissions = commissionRows.filter(
    (row) => row.investment_id === investmentId,
  );

  const totalGenerated = investmentReturns.reduce(
    (sum, row) => sum + Number(row.return_amount),
    0,
  );
  const availableDividends = investmentCommissions
    .filter(isCommissionAvailable)
    .reduce((sum, row) => sum + Number(row.commission_amount), 0);
  const pending = investmentCommissions
    .filter((row) => row.status !== "paid" && !row.paid_at)
    .reduce((sum, row) => sum + Number(row.commission_amount), 0);
  const paid = investmentCommissions
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + Number(row.commission_amount), 0);

  return { totalGenerated, availableDividends, pending, paid };
}

export function RentabilidadesManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [monthlyReturns, setMonthlyReturns] = useState<MonthlyReturnRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  const [investments, setInvestments] = useState<Record<string, InvestmentRecord>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState("investors");
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [activeInvestments, setActiveInvestments] = useState<InvestmentRecord[]>([]);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [commissionToPay, setCommissionToPay] = useState<CommissionRecord | null>(null);
  const [paidAtDate, setPaidAtDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [isPaying, setIsPaying] = useState(false);
  const [editReturnDialogOpen, setEditReturnDialogOpen] = useState(false);
  const [returnToEdit, setReturnToEdit] = useState<MonthlyReturnRecord | null>(null);
  const [editReturnAmount, setEditReturnAmount] = useState("");
  const [isSavingReturn, setIsSavingReturn] = useState(false);
  const [isUnpayingId, setIsUnpayingId] = useState<string | null>(null);
  const [isMarkingNoYieldId, setIsMarkingNoYieldId] = useState<string | null>(null);
  const [isMarkingFullReturnId, setIsMarkingFullReturnId] = useState<string | null>(
    null,
  );
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.name) setAdminName(parsed.name);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    const [
      { data: commissionsData, error: commissionsError },
      { data: returnsData, error: returnsError },
      { data: activeInvestmentsData, error: activeInvestmentsError },
    ] = await Promise.all([
      supabase
        .from("commissions")
        .select(
          "id, investor_id, investment_id, investment_amount, commission_amount, commission_type, status, period_start, period_end, to_be_pay_at, paid_at, month_rate",
        )
        .order("period_end", { ascending: false }),
      supabase
        .from("monthly_returns")
        .select(
          "id, investor_id, investment_id, investment_amount, investment_rate, return_amount, return_rate, commission_type, current_return_period, period_start, period_end, to_be_pay_at, paid_at",
        )
        .order("period_end", { ascending: false }),
      supabase
        .from("investments")
        .select(
          "id, user_id, amount, monthly_return_rate, commitment_period, profitability_liquidity, quota_type, payment_date, status, created_at",
        )
        .eq("status", "active")
        .order("payment_date", { ascending: false }),
    ]);

    if (commissionsError) {
      console.error("Erro ao buscar comissões:", commissionsError);
    }
    if (returnsError) {
      console.error("Erro ao buscar monthly_returns:", returnsError);
    }
    if (activeInvestmentsError) {
      console.error("Erro ao buscar investimentos ativos:", activeInvestmentsError);
    }

    const commissionRows = (commissionsData || []) as CommissionRecord[];
    const returnRows = (returnsData || []) as MonthlyReturnRecord[];
    const activeRows = (activeInvestmentsData || []) as InvestmentRecord[];

    const investorIds = [
      ...new Set([
        ...commissionRows.map((row) => row.investor_id),
        ...returnRows.map((row) => row.investor_id),
        ...activeRows.map((row) => row.user_id).filter(Boolean) as string[],
      ]),
    ];
    const investmentIds = [
      ...new Set([
        ...commissionRows.map((row) => row.investment_id),
        ...returnRows.map((row) => row.investment_id),
        ...activeRows.map((row) => row.id),
      ]),
    ];

    const [{ data: profilesData }, { data: investmentsData }] = await Promise.all([
      investorIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", investorIds)
        : Promise.resolve({ data: [] as ProfileRecord[] }),
      investmentIds.length > 0
        ? supabase
            .from("investments")
            .select(
              "id, user_id, amount, monthly_return_rate, commitment_period, profitability_liquidity, quota_type, payment_date, status, created_at",
            )
            .in("id", investmentIds)
        : Promise.resolve({ data: [] as InvestmentRecord[] }),
    ]);

    setProfiles(
      Object.fromEntries(
        ((profilesData || []) as ProfileRecord[]).map((profile) => [
          profile.id,
          profile,
        ]),
      ),
    );
    setInvestments(
      Object.fromEntries(
        ((investmentsData || []) as InvestmentRecord[]).map((investment) => [
          investment.id,
          investment,
        ]),
      ),
    );
    setCommissions(commissionRows);
    setMonthlyReturns(returnRows);
    setActiveInvestments(activeRows);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const totalGenerated = monthlyReturns.reduce(
      (sum, row) => sum + Number(row.return_amount),
      0,
    );
    const totalCommissions = commissions.reduce(
      (sum, row) => sum + Number(row.commission_amount),
      0,
    );
    const pending = commissions
      .filter((row) => row.status !== "paid" && !row.paid_at)
      .reduce((sum, row) => sum + Number(row.commission_amount), 0);
    const paid = commissions
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + Number(row.commission_amount), 0);

    const available = commissions
      .filter(isCommissionAvailable)
      .reduce((sum, row) => sum + Number(row.commission_amount), 0);

    return {
      totalGenerated,
      totalCommissions,
      pending,
      paid,
      available,
      periodsCount: monthlyReturns.length,
      pendingBlocksCount: commissions.filter(
        (row) => row.status !== "paid" && !row.paid_at,
      ).length,
    };
  }, [commissions, monthlyReturns]);

  const filteredCommissions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return commissions.filter((row) => {
      if (statusFilter === "pending" && (row.status === "paid" || row.paid_at)) {
        return false;
      }
      if (statusFilter === "paid" && row.status !== "paid" && !row.paid_at) {
        return false;
      }
      if (
        statusFilter === "late" &&
        !isCommissionOverdue(row) &&
        row.status !== "late"
      ) {
        return false;
      }

      if (!term) return true;

      const profile = profiles[row.investor_id];
      const investment = investments[row.investment_id];
      const haystack = [
        profile?.full_name,
        profile?.email,
        row.investment_id,
        row.commission_type,
        investment?.profitability_liquidity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [commissions, investments, profiles, search, statusFilter]);

  const filteredReturns = useMemo(() => {
    const term = search.trim().toLowerCase();

    return monthlyReturns.filter((row) => {
      if (!term) return true;

      const profile = profiles[row.investor_id];
      const haystack = [
        profile?.full_name,
        profile?.email,
        row.investment_id,
        row.commission_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [monthlyReturns, profiles, search]);

  const activeInvestors = useMemo(() => {
    const investorsMap = new Map<string, ActiveInvestorSummary>();

    for (const investment of activeInvestments) {
      if (!investment.user_id) continue;

      const profile = profiles[investment.user_id];
      const existing = investorsMap.get(investment.user_id) || {
        id: investment.user_id,
        fullName: profile?.full_name || "Investidor",
        email: profile?.email || "—",
        investmentCount: 0,
        totalInvested: 0,
        totalGenerated: 0,
        availableDividends: 0,
      };

      existing.investmentCount += 1;
      existing.totalInvested += Number(investment.amount) || 0;

      const stats = getInvestmentStats(
        investment.id,
        commissions,
        monthlyReturns,
      );
      existing.totalGenerated += stats.totalGenerated;
      existing.availableDividends += stats.availableDividends;

      investorsMap.set(investment.user_id, existing);
    }

    return Array.from(investorsMap.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "pt-BR"),
    );
  }, [activeInvestments, commissions, monthlyReturns, profiles]);

  const filteredActiveInvestors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeInvestors;

    return activeInvestors.filter((investor) => {
      const haystack = [investor.fullName, investor.email, investor.id]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [activeInvestors, search]);

  const selectedInvestor = selectedInvestorId
    ? activeInvestors.find((investor) => investor.id === selectedInvestorId)
    : null;

  const selectedInvestorInvestments = useMemo(() => {
    if (!selectedInvestorId) return [];

    return activeInvestments
      .filter((investment) => investment.user_id === selectedInvestorId)
      .map((investment) => ({
        ...investment,
        stats: getInvestmentStats(investment.id, commissions, monthlyReturns),
      }))
      .sort((a, b) => {
        const dateA = a.payment_date || a.created_at || "";
        const dateB = b.payment_date || b.created_at || "";
        return dateB.localeCompare(dateA);
      });
  }, [
    activeInvestments,
    commissions,
    monthlyReturns,
    selectedInvestorId,
  ]);

  const selectedInvestment = useMemo(() => {
    if (!selectedInvestmentId) return null;

    const fromInvestorList = selectedInvestorInvestments.find(
      (investment) => investment.id === selectedInvestmentId,
    );
    if (fromInvestorList) return fromInvestorList;

    const fromActive = activeInvestments.find(
      (investment) => investment.id === selectedInvestmentId,
    );
    if (fromActive) {
      return {
        ...fromActive,
        stats: getInvestmentStats(
          fromActive.id,
          commissions,
          monthlyReturns,
        ),
      };
    }

    const fromMap = investments[selectedInvestmentId];
    if (!fromMap) return null;

    return {
      ...fromMap,
      stats: getInvestmentStats(
        fromMap.id,
        commissions,
        monthlyReturns,
      ),
    };
  }, [
    activeInvestments,
    commissions,
    investments,
    monthlyReturns,
    selectedInvestmentId,
    selectedInvestorInvestments,
  ]);

  const selectedInvestmentCommissions = useMemo(() => {
    if (!selectedInvestmentId) return [];
    return commissions.filter(
      (row) => row.investment_id === selectedInvestmentId,
    );
  }, [commissions, selectedInvestmentId]);

  const selectedInvestmentReturns = useMemo(() => {
    if (!selectedInvestmentId) return [];
    return monthlyReturns.filter(
      (row) => row.investment_id === selectedInvestmentId,
    );
  }, [monthlyReturns, selectedInvestmentId]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value !== "investors") {
      setSelectedInvestorId(null);
      setSelectedInvestmentId(null);
    }
  };

  const handleSelectInvestor = (investorId: string) => {
    setSelectedInvestorId(investorId);
    setSelectedInvestmentId(null);
  };

  const handleBackToInvestors = () => {
    setSelectedInvestorId(null);
    setSelectedInvestmentId(null);
  };

  const handleBackToInvestments = () => {
    setSelectedInvestmentId(null);
  };

  const openPayDialog = (commission: CommissionRecord) => {
    setCommissionToPay(commission);
    const defaultDate =
      commission.to_be_pay_at?.split("T")[0] ||
      new Date().toISOString().split("T")[0];
    setPaidAtDate(defaultDate);
    setPayDialogOpen(true);
  };

  const handleMarkAsPaid = async () => {
    if (!commissionToPay) return;

    setIsPaying(true);
    try {
      const response = await fetch(
        `/api/admin/commissions/${commissionToPay.id}/pay`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paid_at: paidAtDate }),
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao marcar comissão como paga");
      }

      toast({
        title: "Pagamento registrado",
        description: `Comissão marcada como paga em ${formatDateOnly(paidAtDate)}.`,
      });

      setPayDialogOpen(false);
      setCommissionToPay(null);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  const handleUnpayCommission = async (row: CommissionRecord) => {
    if (
      !window.confirm(
        "Deseja retirar o pagamento desta comissão? Os rendimentos do período voltarão a pendente.",
      )
    ) {
      return;
    }

    setIsUnpayingId(row.id);
    try {
      const response = await fetch(`/api/admin/commissions/${row.id}/unpay`, {
        method: "PATCH",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao retirar pagamento");
      }

      toast({
        title: "Pagamento retirado",
        description: "A comissão voltou ao status pendente.",
      });

      await loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível retirar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsUnpayingId(null);
    }
  };

  const renderCommissionActions = (row: CommissionRecord) => {
    const actions: AdminRowAction[] = [];

    if (isCommissionPaid(row)) {
      actions.push({
        id: "unpay",
        label: "Retirar pagamento",
        icon: RotateCcw,
        tone: "warning",
        loading: isUnpayingId === row.id,
        disabled: isUnpayingId === row.id,
        onClick: () => handleUnpayCommission(row),
      });
    } else if (canMarkCommissionAsPaid(row)) {
      actions.push({
        id: "pay",
        label: "Marcar pago",
        icon: CheckCircle,
        tone: "success",
        onClick: () => openPayDialog(row),
      });
    }

    return <AdminRowActions actions={actions} />;
  };

  const openEditReturnDialog = (row: MonthlyReturnRecord) => {
    setReturnToEdit(row);
    setEditReturnAmount(String(Number(row.return_amount)));
    setEditReturnDialogOpen(true);
  };

  const previewEditReturnRate = useMemo(() => {
    if (!returnToEdit) return 0;
    const amount = Number(editReturnAmount);
    const investmentAmount = Number(returnToEdit.investment_amount);
    if (!Number.isFinite(amount) || investmentAmount <= 0) return 0;
    return amount / investmentAmount;
  }, [editReturnAmount, returnToEdit]);

  const updateReturnAmount = async (
    row: MonthlyReturnRecord,
    amount: number,
  ) => {
    const response = await fetch(`/api/admin/monthly-returns/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ return_amount: amount }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Erro ao atualizar rendimento mensal");
    }

    return result;
  };

  const handleSaveReturnAmount = async () => {
    if (!returnToEdit) return;

    const amount = Number(editReturnAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de retorno válido (zero ou maior).",
        variant: "destructive",
      });
      return;
    }

    setIsSavingReturn(true);
    try {
      const result = await updateReturnAmount(returnToEdit, amount);

      toast({
        title: "Rendimento atualizado",
        description: result.data?.commission
          ? "O valor mensal e a comissão vinculada foram recalculados."
          : "O valor mensal foi atualizado.",
      });

      setEditReturnDialogOpen(false);
      setReturnToEdit(null);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o rendimento.",
        variant: "destructive",
      });
    } finally {
      setIsSavingReturn(false);
    }
  };

  const handleMarkNoYield = async (row: MonthlyReturnRecord) => {
    if (hasNoYield(row.return_amount)) return;

    if (
      !window.confirm(
        "Marcar este período como sem rendimento (R$ 0,00)? A comissão vinculada será recalculada.",
      )
    ) {
      return;
    }

    setIsMarkingNoYieldId(row.id);
    try {
      const result = await updateReturnAmount(row, 0);

      toast({
        title: "Sem rendimento",
        description: result.data?.commission
          ? "Período zerado e comissão vinculada recalculada."
          : "Período marcado como sem rendimento.",
      });

      await loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível marcar como sem rendimento.",
        variant: "destructive",
      });
    } finally {
      setIsMarkingNoYieldId(null);
    }
  };

  const handleMarkFullReturn = async (row: MonthlyReturnRecord) => {
    const maxAmount = getMaxReturnAmount(row);
    if (maxAmount <= 0) {
      toast({
        title: "Taxa indisponível",
        description: "Não foi possível calcular o teto de rendimento deste período.",
        variant: "destructive",
      });
      return;
    }

    if (isFullReturn(row)) return;

    if (
      !window.confirm(
        `Aplicar rendimento total de ${formatCurrency(maxAmount)} (teto máximo do período)? A comissão vinculada será recalculada.`,
      )
    ) {
      return;
    }

    setIsMarkingFullReturnId(row.id);
    try {
      const result = await updateReturnAmount(row, maxAmount);

      toast({
        title: "Rendimento total aplicado",
        description: result.data?.commission
          ? "Teto máximo definido e comissão vinculada recalculada."
          : "Teto máximo de rendimento definido para o período.",
      });

      await loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível aplicar o rendimento total.",
        variant: "destructive",
      });
    } finally {
      setIsMarkingFullReturnId(null);
    }
  };

  const renderEditReturnAction = (row: MonthlyReturnRecord) => {
    const actions: AdminRowAction[] = [
      {
        id: "edit",
        label: "Editar rendimento",
        icon: Pencil,
        onClick: () => openEditReturnDialog(row),
      },
    ];

    if (!hasNoYield(row.return_amount)) {
      actions.push({
        id: "no-yield",
        label: "Sem rendimento",
        icon: MinusCircle,
        tone: "warning",
        loading: isMarkingNoYieldId === row.id,
        disabled: isMarkingNoYieldId === row.id,
        onClick: () => handleMarkNoYield(row),
      });
    }

    if (!isFullReturn(row) && getMaxReturnAmount(row) > 0) {
      actions.push({
        id: "full-return",
        label: "Rendimento total",
        icon: TrendingUp,
        tone: "success",
        loading: isMarkingFullReturnId === row.id,
        disabled: isMarkingFullReturnId === row.id,
        onClick: () => handleMarkFullReturn(row),
      });
    }

    return <AdminRowActions actions={actions} />;
  };

  const returnsChartData = useMemo(() => {
    const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const now = new Date();
    const points: { month: string; volume: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const key = `${MONTHS[m]}/${String(y).slice(2)}`;

      const vol = monthlyReturns
        .filter((row) => {
          const pe = row.period_end?.split("T")[0];
          if (!pe) return false;
          const [yr, mo] = pe.split("-").map(Number);
          return yr === y && mo === m + 1;
        })
        .reduce((s, row) => s + Number(row.return_amount), 0);

      points.push({ month: key, volume: vol });
    }
    return points;
  }, [monthlyReturns]);

  const paymentDonut = useMemo(
    () =>
      [
        { name: "Pago", value: summary.paid, color: "#10B981" },
        { name: "Pendente", value: summary.pending, color: "#F59E0B" },
        { name: "Disponível", value: summary.available, color: "#22C55E" },
      ].filter((s) => s.value > 0),
    [summary.paid, summary.pending, summary.available],
  );

  const returnsSparkline = useMemo(
    () => returnsChartData.map((p) => ({ value: p.volume })),
    [returnsChartData],
  );

  if (loading) {
    return (
      <AdminShell nav={<AdminFintechNavbar userName={adminName} />}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-600" />
        </div>
      </AdminShell>
    );
  }

  const statusOptions = [
    { value: "all", label: "Todos os status" },
    { value: "pending", label: "Pendente" },
    { value: "paid", label: "Pago" },
    { value: "late", label: "Atrasado" },
  ];

  const rentabilidadeTabs = [
    { value: "investors", label: "Investidores Ativos" },
    { value: "commissions", label: "Pagamentos ao Investidor" },
    { value: "monthly", label: "Rendimentos Mensais" },
  ];

  return (
    <AdminShell nav={<AdminFintechNavbar userName={adminName} />}>
      <AdminHero
        userName={adminName}
        title="Rentabilidades"
        description="Rendimentos mensais, pagamentos ao investidor e liquidez por bloco."
        backHref="/admin"
        backLabel="Painel"
        actions={
          <AdminSecondaryButton onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </AdminSecondaryButton>
        }
        sideContent={
          <div className="grid grid-cols-2 gap-2">
            <FintechMetricCard
              label="Gerado"
              value={formatCurrency(summary.totalGenerated)}
              icon={TrendingUp}
              tone="forest"
              surface="featured"
              sparkline={returnsSparkline}
              className="p-3!"
            />
            <FintechMetricCard
              label="Disponível"
              value={formatCurrency(summary.available)}
              icon={Wallet}
              tone="emerald"
              surface="soft"
              className="p-3!"
            />
          </div>
        }
      />

      <AdminWorkspace>
      <FintechMetricGrid className="mb-4">
        <FintechMetricCard
          label="Rendimento gerado"
          value={formatCurrency(summary.totalGenerated)}
          sublabel={`${summary.periodsCount} períodos`}
          icon={TrendingUp}
          tone="forest"
          featured
          sparkline={returnsSparkline}
        />
        <FintechMetricCard
          label="Disponível p/ resgate"
          value={formatCurrency(summary.available)}
          sublabel="Data de pagamento atingida"
          icon={Wallet}
          tone="emerald"
          surface="soft"
        />
        <FintechMetricCard
          label="Pendente"
          value={formatCurrency(summary.pending)}
          sublabel={`${summary.pendingBlocksCount} blocos`}
          icon={Clock}
          tone="amber"
          surface="card"
          badge={summary.pendingBlocksCount > 0 ? "Aberto" : undefined}
        />
        <FintechMetricCard
          label="Pago"
          value={formatCurrency(summary.paid)}
          sublabel={`Total: ${formatCurrency(summary.totalCommissions)}`}
          icon={CircleDollarSign}
          tone="slate"
          surface="soft"
        />
      </FintechMetricGrid>

      <div className="mb-4 grid gap-3 lg:grid-cols-12">
        <AdminSectionCard
          title="Rendimentos mensais"
          description="Volume gerado por período"
          className="lg:col-span-8"
          variant="card"
        >
          <AdminAreaChartPanel
            data={returnsChartData}
            dataKey="volume"
            xKey="month"
            formatValue={(v) => formatCurrency(v)}
            height={200}
          />
        </AdminSectionCard>
        <AdminSectionCard
          title="Status de pagamentos"
          description="Distribuição por situação"
          className="lg:col-span-4"
          variant="accent"
        >
          <AdminDonutChart data={paymentDonut} height={180} innerRadius={44} outerRadius={64} />
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Filtros"
        description="Busque por investidor, e-mail ou ID"
        variant="muted"
        className="mb-4"
      >
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar investidor ou investimento..."
          selectValue={statusFilter}
          onSelectChange={(value) => setStatusFilter(value as StatusFilter)}
          selectDisabled={activeTab !== "commissions"}
          selectPlaceholder="Status"
          selectOptions={statusOptions}
        />
      </AdminSectionCard>

      <AdminSegmentTabs
        value={activeTab}
        onValueChange={handleTabChange}
        tabs={rentabilidadeTabs}
      >
        <AdminSegmentPanel value="investors">
          {selectedInvestor ? (
            <div className="space-y-4">
              {selectedInvestment ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-0 text-[#A5B3AC] hover:bg-transparent hover:text-[#F3F5F4]"
                    onClick={handleBackToInvestments}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para investimentos de {selectedInvestor.fullName}
                  </Button>

                  <Card className={cn(adminTokens.card, "text-[#F3F5F4]")}>
                    <CardHeader>
                      <CardTitle>
                        Investimento de {formatCurrency(Number(selectedInvestment.amount) || 0)}
                      </CardTitle>
                      <CardDescription>
                        {formatDateOnly(selectedInvestment.payment_date)} ·{" "}
                        {selectedInvestment.profitability_liquidity || "—"} ·{" "}
                        {selectedInvestment.quota_type || "—"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-sm text-[#6B7C74]">Taxa mensal</p>
                          <p className="text-xl font-semibold tabular-nums text-[#F3F5F4]">
                            {selectedInvestment.monthly_return_rate
                              ? formatRate(Number(selectedInvestment.monthly_return_rate))
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B7C74]">Prazo</p>
                          <p className="text-xl font-semibold tabular-nums text-[#F3F5F4]">
                            {selectedInvestment.commitment_period
                              ? `${selectedInvestment.commitment_period} meses`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B7C74]">Rendimento gerado</p>
                          <p className="text-xl font-semibold text-[#22C55E]">
                            {formatCurrency(selectedInvestment.stats?.totalGenerated ?? 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B7C74]">Disponível p/ resgate</p>
                          <p className="text-xl font-semibold text-[#10B981]">
                            {formatCurrency(selectedInvestment.stats?.availableDividends ?? 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <AdminPillTabs
                    defaultValue="investment-commissions"
                    tabs={[
                      {
                        value: "investment-commissions",
                        label: "Comissões",
                        count: selectedInvestmentCommissions.length,
                      },
                      {
                        value: "investment-returns",
                        label: "Rendimentos Mensais",
                        count: selectedInvestmentReturns.length,
                      },
                    ]}
                  >
                    <AdminPillTabPanel value="investment-commissions">
                      <Card className={cn(adminTokens.card, "text-[#F3F5F4]")}>
                        <CardHeader>
                          <CardTitle>Comissões do investimento</CardTitle>
                          <CardDescription>
                            Pagamentos ao investidor agrupados por liquidez
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={cn("overflow-x-auto", adminTokens.drillTable)}>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Liquidez</TableHead>
                                  <TableHead>Período</TableHead>
                                  <TableHead>Taxa</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Pagamento</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedInvestmentCommissions.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={7}
                                      className="text-center text-[#6B7C74]"
                                    >
                                      Nenhuma comissão encontrada para este investimento
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  selectedInvestmentCommissions.map((row) => (
                                    <TableRow key={row.id}>
                                      <TableCell>{row.commission_type}</TableCell>
                                      <TableCell>
                                        {formatDateOnly(row.period_start)} —{" "}
                                        {formatDateOnly(row.period_end)}
                                      </TableCell>
                                      <TableCell>{formatRate(row.month_rate)}</TableCell>
                                      <TableCell>
                                        <ReturnAmountCell
                                          amount={Number(row.commission_amount)}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {formatDateOnly(row.to_be_pay_at)}
                                      </TableCell>
                                      <TableCell>
                                        <CommissionStatusBadges row={row} />
                                      </TableCell>
                                      <TableCell>{renderCommissionActions(row)}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </AdminPillTabPanel>

                    <AdminPillTabPanel value="investment-returns">
                      <Card className={cn(adminTokens.card, "text-[#F3F5F4]")}>
                        <CardHeader>
                          <CardTitle>Rendimentos mensais do investimento</CardTitle>
                          <CardDescription>
                            Detalhamento período a período deste investimento
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={cn("overflow-x-auto", adminTokens.drillTable)}>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Período</TableHead>
                                  <TableHead>#</TableHead>
                                  <TableHead>Taxa</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Pagamento</TableHead>
                                  <TableHead>Pago em</TableHead>
                                  <TableHead>Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedInvestmentReturns.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={7}
                                      className="text-center text-[#6B7C74]"
                                    >
                                      Nenhum rendimento mensal encontrado para este investimento
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  selectedInvestmentReturns.map((row) => (
                                    <TableRow key={row.id}>
                                      <TableCell>
                                        {formatDateOnly(row.period_start)} —{" "}
                                        {formatDateOnly(row.period_end)}
                                      </TableCell>
                                      <TableCell>{row.current_return_period}</TableCell>
                                      <TableCell>{formatRate(row.return_rate)}</TableCell>
                                      <TableCell>
                                        <ReturnAmountCell
                                          amount={Number(row.return_amount)}
                                          monthlyReturn={row}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {formatDateOnly(row.to_be_pay_at)}
                                      </TableCell>
                                      <TableCell>
                                        {row.paid_at ? formatDateOnly(row.paid_at) : "—"}
                                      </TableCell>
                                      <TableCell>{renderEditReturnAction(row)}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </AdminPillTabPanel>
                  </AdminPillTabs>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-0 text-[#A5B3AC] hover:bg-transparent hover:text-[#F3F5F4]"
                    onClick={handleBackToInvestors}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para investidores
                  </Button>

                  <Card className={cn(adminTokens.card, "text-[#F3F5F4]")}>
                    <CardHeader>
                      <CardTitle>{selectedInvestor.fullName}</CardTitle>
                      <CardDescription>{selectedInvestor.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-sm text-[#6B7C74]">Investimentos ativos</p>
                          <p className="text-xl font-semibold tabular-nums text-[#F3F5F4]">
                            {selectedInvestor.investmentCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B7C74]">Total investido</p>
                          <p className="text-xl font-semibold tabular-nums text-[#F3F5F4]">
                            {formatCurrency(selectedInvestor.totalInvested)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B7C74]">Rendimento gerado</p>
                          <p className="text-xl font-semibold text-[#22C55E]">
                            {formatCurrency(selectedInvestor.totalGenerated)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B7C74]">Disponível p/ resgate</p>
                          <p className="text-xl font-semibold text-[#10B981]">
                            {formatCurrency(selectedInvestor.availableDividends)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cn(adminTokens.card, "text-[#F3F5F4]")}>
                    <CardHeader>
                      <CardTitle>Investimentos do investidor</CardTitle>
                      <CardDescription>
                        Clique em um investimento para ver comissões e rendimentos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={cn("overflow-x-auto", adminTokens.drillTable)}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Valor</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Liquidez</TableHead>
                              <TableHead>Taxa</TableHead>
                              <TableHead>Prazo</TableHead>
                              <TableHead>Gerado</TableHead>
                              <TableHead>Disponível</TableHead>
                              <TableHead>Pendente</TableHead>
                              <TableHead>Pago</TableHead>
                              <TableHead className="w-10" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedInvestorInvestments.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={11}
                                  className="text-center text-[#6B7C74]"
                                >
                                  Nenhum investimento ativo encontrado
                                </TableCell>
                              </TableRow>
                            ) : (
                              selectedInvestorInvestments.map((investment) => (
                                <TableRow
                                  key={investment.id}
                                  className="cursor-pointer hover:bg-[#202C26]"
                                  onClick={() => setSelectedInvestmentId(investment.id)}
                                >
                                  <TableCell className="font-medium">
                                    {formatCurrency(Number(investment.amount) || 0)}
                                  </TableCell>
                                  <TableCell>
                                    {formatDateOnly(investment.payment_date)}
                                  </TableCell>
                                  <TableCell className="capitalize">
                                    {investment.quota_type || "—"}
                                  </TableCell>
                                  <TableCell>
                                    {investment.profitability_liquidity || "—"}
                                  </TableCell>
                                  <TableCell>
                                    {investment.monthly_return_rate
                                      ? formatRate(Number(investment.monthly_return_rate))
                                      : "—"}
                                  </TableCell>
                                  <TableCell>
                                    {investment.commitment_period
                                      ? `${investment.commitment_period} meses`
                                      : "—"}
                                  </TableCell>
                                  <TableCell>
                                    {formatCurrency(investment.stats.totalGenerated)}
                                  </TableCell>
                                  <TableCell className="text-[#10B981]">
                                    {formatCurrency(investment.stats.availableDividends)}
                                  </TableCell>
                                  <TableCell className="text-amber-400">
                                    {formatCurrency(investment.stats.pending)}
                                  </TableCell>
                                  <TableCell>
                                    {formatCurrency(investment.stats.paid)}
                                  </TableCell>
                                  <TableCell>
                                    <ChevronRight className="h-4 w-4 text-[#6B7C74]" />
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          ) : (
            <AdminSectionCard
              title="Investidores Ativos"
              description="Clique em um investidor para ver apenas os investimentos dele"
              variant="card"
              noPadding
            >
              <AdminDataTable embedded>
                <AdminTable>
                  <AdminTableHeader>
                    <TableRow className="hover:bg-transparent">
                      <AdminTableHead>Investidor</AdminTableHead>
                      <AdminTableHead align="right">Investimentos</AdminTableHead>
                      <AdminTableHead align="right">Total investido</AdminTableHead>
                      <AdminTableHead align="right">Rendimento gerado</AdminTableHead>
                      <AdminTableHead align="right">Disponível p/ resgate</AdminTableHead>
                      <AdminTableHead className="w-10" />
                    </TableRow>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {filteredActiveInvestors.length === 0 ? (
                      <AdminTableEmpty
                        colSpan={6}
                        message="Nenhum investidor ativo encontrado"
                      />
                    ) : (
                      filteredActiveInvestors.map((investor) => (
                        <AdminTableRow
                          key={investor.id}
                          interactive
                          onClick={() => handleSelectInvestor(investor.id)}
                        >
                          <AdminTableCell>
                            <AdminInvestorCell
                              name={investor.fullName}
                              email={investor.email}
                            />
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            {investor.investmentCount}
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            <AdminMoney
                              value={formatCurrency(investor.totalInvested)}
                              emphasis
                            />
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            <AdminMoney
                              value={formatCurrency(investor.totalGenerated)}
                              className="text-emerald-700"
                            />
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            <AdminMoney
                              value={formatCurrency(investor.availableDividends)}
                              className="text-emerald-700"
                            />
                          </AdminTableCell>
                          <AdminTableCell>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </AdminTableCell>
                        </AdminTableRow>
                      ))
                    )}
                  </AdminTableBody>
                </AdminTable>
              </AdminDataTable>
            </AdminSectionCard>
          )}
        </AdminSegmentPanel>

        <AdminSegmentPanel value="commissions">
          <AdminSectionCard
            title="Comissões por Liquidez"
            description="Blocos de rentabilidade agrupados conforme a liquidez contratada"
            variant="card"
            noPadding
          >
            <AdminDataTable embedded>
              <AdminTable>
                <AdminTableHeader>
                  <TableRow className="hover:bg-transparent">
                    <AdminTableHead>Investidor</AdminTableHead>
                    <AdminTableHead>Investimento</AdminTableHead>
                    <AdminTableHead>Liquidez</AdminTableHead>
                    <AdminTableHead>Período</AdminTableHead>
                    <AdminTableHead align="right">Taxa</AdminTableHead>
                    <AdminTableHead align="right">Valor</AdminTableHead>
                    <AdminTableHead>Pagamento</AdminTableHead>
                    <AdminTableHead>Status</AdminTableHead>
                    <AdminTableHead align="right">Ações</AdminTableHead>
                  </TableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {filteredCommissions.length === 0 ? (
                    <AdminTableEmpty
                      colSpan={9}
                      message="Nenhuma comissão encontrada"
                    />
                  ) : (
                    filteredCommissions.map((row) => {
                      const profile = profiles[row.investor_id];
                      const investment = investments[row.investment_id];

                      return (
                        <AdminTableRow key={row.id}>
                          <AdminTableCell>
                            <AdminInvestorCell
                              name={profile?.full_name || "—"}
                              email={profile?.email || row.investor_id.slice(0, 8)}
                            />
                          </AdminTableCell>
                          <AdminTableCell>
                            <AdminMoney
                              value={formatCurrency(Number(row.investment_amount))}
                              emphasis
                            />
                            <p className="mt-0.5 text-xs text-slate-500">
                              {investment?.payment_date
                                ? formatDateOnly(investment.payment_date)
                                : row.investment_id.slice(0, 8)}
                            </p>
                          </AdminTableCell>
                          <AdminTableCell>{row.commission_type}</AdminTableCell>
                          <AdminTableCell secondary>
                            {formatDateOnly(row.period_start)} —{" "}
                            {formatDateOnly(row.period_end)}
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            {formatRate(row.month_rate)}
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            <ReturnAmountCell
                              amount={Number(row.commission_amount)}
                            />
                          </AdminTableCell>
                          <AdminTableCell secondary>
                            {formatDateOnly(row.to_be_pay_at)}
                          </AdminTableCell>
                          <AdminTableCell>
                            <CommissionStatusBadges row={row} />
                          </AdminTableCell>
                          <AdminTableCell align="right" className="w-10">
                            {renderCommissionActions(row)}
                          </AdminTableCell>
                        </AdminTableRow>
                      );
                    })
                  )}
                </AdminTableBody>
              </AdminTable>
            </AdminDataTable>
          </AdminSectionCard>
        </AdminSegmentPanel>

        <AdminSegmentPanel value="monthly">
          <AdminSectionCard
            title="Rendimentos Mensais"
            description="Detalhamento período a período gerado pelo cron de fechamento"
            variant="muted"
            noPadding
          >
            <AdminDataTable embedded>
              <AdminTable>
                <AdminTableHeader>
                  <TableRow className="hover:bg-transparent">
                    <AdminTableHead>Investidor</AdminTableHead>
                    <AdminTableHead align="right">Investimento</AdminTableHead>
                    <AdminTableHead>Período</AdminTableHead>
                    <AdminTableHead align="right">#</AdminTableHead>
                    <AdminTableHead align="right">Taxa</AdminTableHead>
                    <AdminTableHead align="right">Valor</AdminTableHead>
                    <AdminTableHead>Pagamento</AdminTableHead>
                    <AdminTableHead>Pago em</AdminTableHead>
                    <AdminTableHead align="right">Ações</AdminTableHead>
                  </TableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {filteredReturns.length === 0 ? (
                    <AdminTableEmpty
                      colSpan={9}
                      message="Nenhum rendimento mensal encontrado"
                    />
                  ) : (
                    filteredReturns.map((row) => {
                      const profile = profiles[row.investor_id];

                      return (
                        <AdminTableRow key={row.id}>
                          <AdminTableCell>
                            <AdminInvestorCell
                              name={profile?.full_name || "—"}
                              email={profile?.email || row.investor_id.slice(0, 8)}
                            />
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            <AdminMoney
                              value={formatCurrency(Number(row.investment_amount))}
                              emphasis
                            />
                          </AdminTableCell>
                          <AdminTableCell secondary>
                            {formatDateOnly(row.period_start)} —{" "}
                            {formatDateOnly(row.period_end)}
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            {row.current_return_period}
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            {formatRate(row.return_rate)}
                          </AdminTableCell>
                          <AdminTableCell align="right">
                            <ReturnAmountCell
                              amount={Number(row.return_amount)}
                              monthlyReturn={row}
                            />
                          </AdminTableCell>
                          <AdminTableCell secondary>
                            {formatDateOnly(row.to_be_pay_at)}
                          </AdminTableCell>
                          <AdminTableCell secondary>
                            {row.paid_at ? formatDateOnly(row.paid_at) : "—"}
                          </AdminTableCell>
                          <AdminTableCell align="right" className="w-10">
                            {renderEditReturnAction(row)}
                          </AdminTableCell>
                        </AdminTableRow>
                      );
                    })
                  )}
                </AdminTableBody>
              </AdminTable>
            </AdminDataTable>
          </AdminSectionCard>
        </AdminSegmentPanel>
      </AdminSegmentTabs>
      </AdminWorkspace>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className={cn(adminTokens.dialog, "sm:max-w-md")}>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              Informe a data em que a comissão foi paga ao investidor.
            </DialogDescription>
          </DialogHeader>

          {commissionToPay && (
            <div className="space-y-4">
              <div className={adminTokens.dialogPanel}>
                <p>
                  <span className="text-[#6B7C74]">Valor:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(Number(commissionToPay.commission_amount))}
                  </span>
                </p>
                <p>
                  <span className="text-[#6B7C74]">Período:</span>{" "}
                  {formatDateOnly(commissionToPay.period_start)} —{" "}
                  {formatDateOnly(commissionToPay.period_end)}
                </p>
                <p>
                  <span className="text-[#6B7C74]">Previsto para:</span>{" "}
                  {formatDateOnly(commissionToPay.to_be_pay_at)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid-at-date">Data do pagamento</Label>
                <Input
                  id="paid-at-date"
                  type="date"
                  value={paidAtDate}
                  onChange={(event) => setPaidAtDate(event.target.value)}
                  className={adminTokens.input}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <AdminSecondaryButton
              onClick={() => setPayDialogOpen(false)}
              disabled={isPaying}
            >
              Cancelar
            </AdminSecondaryButton>
            <AdminPrimaryButton
              onClick={handleMarkAsPaid}
              disabled={isPaying || !paidAtDate}
            >
              {isPaying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar pagamento"
              )}
            </AdminPrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editReturnDialogOpen} onOpenChange={setEditReturnDialogOpen}>
        <DialogContent className={cn(adminTokens.dialog, "sm:max-w-md")}>
          <DialogHeader>
            <DialogTitle>Editar rendimento mensal</DialogTitle>
            <DialogDescription>
              O valor da comissão vinculada será recalculada automaticamente,
              inclusive para rendimentos já pagos.
            </DialogDescription>
          </DialogHeader>

          {returnToEdit && (
            <div className="space-y-4">
              <div className={adminTokens.dialogPanel}>
                <p>
                  <span className="text-[#6B7C74]">Período:</span>{" "}
                  {formatDateOnly(returnToEdit.period_start)} —{" "}
                  {formatDateOnly(returnToEdit.period_end)}
                </p>
                <p>
                  <span className="text-[#6B7C74]">Valor atual:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(Number(returnToEdit.return_amount))}
                  </span>
                </p>
                <p>
                  <span className="text-[#6B7C74]">Taxa atual:</span>{" "}
                  {formatRate(returnToEdit.return_rate)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-amount">Novo valor do retorno (R$)</Label>
                <Input
                  id="return-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editReturnAmount}
                  onChange={(event) => setEditReturnAmount(event.target.value)}
                  className={adminTokens.input}
                />
                <p className="text-xs text-[#6B7C74]">
                  Taxa equivalente: {formatRate(previewEditReturnRate)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <AdminSecondaryButton
              onClick={() => setEditReturnDialogOpen(false)}
              disabled={isSavingReturn}
            >
              Cancelar
            </AdminSecondaryButton>
            <AdminPrimaryButton
              onClick={handleSaveReturnAmount}
              disabled={
                isSavingReturn ||
                editReturnAmount === "" ||
                !Number.isFinite(Number(editReturnAmount)) ||
                Number(editReturnAmount) < 0
              }
            >
              {isSavingReturn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar alteração"
              )}
            </AdminPrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
