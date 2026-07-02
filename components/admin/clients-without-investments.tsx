"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AdminSectionCard,
  AdminSecondaryButton,
  AdminStatusBadge,
  adminTokens,
} from "@/components/admin/ui";

interface ClientWithoutInvestment {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  hasInvestments: boolean;
  hasRecentInvestments: boolean;
  lastInvestmentDate: string | null;
  reason: "no_investments" | "no_recent_investments" | null;
  advisor: {
    name: string;
    email: string;
  } | null;
}

export function ClientsWithoutInvestments() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientWithoutInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        filterType: filterType,
      });

      if (search) {
        params.append("search", search);
      }

      const response = await fetch(
        `/api/clients-without-investments?${params.toString()}`,
      );
      const result = await response.json();

      if (result.success) {
        setClients(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      } else {
        toast({
          title: "Erro ao carregar clientes",
          description:
            result.error || "Não foi possível carregar a lista de clientes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Ocorreu um erro ao buscar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, filterType, search, toast]);

  useEffect(() => {
    fetchClients();
  }, [page, filterType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchClients();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateWithTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReasonBadge = (reason: string | null) => {
    if (reason === "no_investments") {
      return (
        <AdminStatusBadge tone="danger">
          <AlertCircle className="mr-1 h-3 w-3" />
          Sem investimentos
        </AdminStatusBadge>
      );
    }
    if (reason === "no_recent_investments") {
      return (
        <AdminStatusBadge tone="warning">
          <Calendar className="mr-1 h-3 w-3" />
          Sem aportes recentes
        </AdminStatusBadge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#22C55E]" />
          <h2 className="text-lg font-semibold text-[#F3F5F4]">
            Clientes sem Investimentos
          </h2>
        </div>
        <AdminSecondaryButton size="sm" onClick={fetchClients} disabled={loading}>
          <RefreshCw
            className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
          />
          Atualizar
        </AdminSecondaryButton>
      </div>

      <AdminSectionCard
        title="Filtros"
        description="Clientes sem investimentos ou sem novos aportes nos últimos 12 meses"
        variant="muted"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7C74]" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(adminTokens.input, "pl-10")}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className={cn(adminTokens.input, "w-full sm:w-64")}>
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent className={adminTokens.selectContent}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="none">Sem investimentos</SelectItem>
              <SelectItem value="no_recent">Sem aportes recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Lista de Clientes"
        action={
          <AdminStatusBadge tone="muted">
            {total} {total === 1 ? "cliente" : "clientes"}
          </AdminStatusBadge>
        }
        variant="card"
        noPadding
      >
        {loading ? (
          <p className="py-12 text-center text-sm text-[#6B7C74]">
            Carregando clientes...
          </p>
        ) : clients.length > 0 ? (
          <>
            <div className="divide-y divide-white/[0.04]">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 transition-colors hover:bg-[#202C26]"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-[#F3F5F4]">
                      {client.full_name || client.email.split("@")[0]}
                    </h3>
                    {getReasonBadge(client.reason)}
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <span className={adminTokens.label}>Email</span>
                      <p className="font-medium text-[#A5B3AC]">{client.email}</p>
                    </div>
                    {client.phone && (
                      <div>
                        <span className={adminTokens.label}>Telefone</span>
                        <p className="font-medium text-[#A5B3AC]">{client.phone}</p>
                      </div>
                    )}
                    <div>
                      <span className={adminTokens.label}>Cadastrado em</span>
                      <p className="font-medium text-[#A5B3AC]">
                        {formatDate(client.created_at)}
                      </p>
                    </div>
                    {client.advisor && (
                      <div>
                        <span className={adminTokens.label}>Assessor</span>
                        <p className="font-medium text-[#A5B3AC]">
                          {client.advisor.name}
                        </p>
                      </div>
                    )}
                    {client.lastInvestmentDate && (
                      <div>
                        <span className={adminTokens.label}>Último investimento</span>
                        <p className="font-medium text-[#A5B3AC]">
                          {formatDateWithTime(client.lastInvestmentDate)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                <span className="text-xs text-[#6B7C74]">
                  Página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <AdminSecondaryButton
                    size="sm"
                    className="h-8"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </AdminSecondaryButton>
                  <AdminSecondaryButton
                    size="sm"
                    className="h-8"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages || loading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </AdminSecondaryButton>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-12">
            <Users className="mb-3 h-10 w-10 text-[#6B7C74]" />
            <p className="text-sm text-[#6B7C74]">
              {search || filterType !== "all"
                ? "Nenhum cliente encontrado com os filtros aplicados"
                : "Nenhum cliente sem investimentos encontrado"}
            </p>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
