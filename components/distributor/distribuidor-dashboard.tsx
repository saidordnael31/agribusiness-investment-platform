"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  DollarSign,
  Building2,
  UserPlus,
  Loader2,
  Search,
  Edit,
  Eye,
  MapPin,
  Mail,
  ChevronDown,
  ChevronRight,
  FileText,
  Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCommissionRate } from "@/lib/commission-utils";
import { PDFViewer } from "@/components/contracts/pdf-viewer";
import { ReceiptViewer } from "@/components/admin/receipt-viewer";
import { createPortal } from "react-dom";

interface UserData {
  id: string;
  name: string;
  email: string;
  user_type: string;
  role: string;
}

interface Escritorio {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cnpj?: string;
  totalInvested: number;
  totalCommission: number;
  assessoresCount: number;
  investorsCount: number;
  status: string;
  joinedAt: string;
  lastActivity: string;
}

const formatCPF = (value: string) =>
  value.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

const formatCNPJ = (value: string) =>
  value.replace(/\D/g, "").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

const formatCpfCnpj = (value?: string | null) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return formatCPF(digits);
  }
  if (digits.length === 14) {
    return formatCNPJ(digits);
  }
  return value;
};

const REGISTRATION_STEPS = ["Gerais", "Endereço", "Dados Bancários"];

export function DistribuidorDashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [myEscritorios, setMyEscritorios] = useState<Escritorio[]>([]);
  const [loadingEscritorios, setLoadingEscritorios] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("escritorios");
  const [submittingEscritorio, setSubmittingEscritorio] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isBankListOpen, setIsBankListOpen] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  
  const [escritorioForm, setEscritorioForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cpfCnpj: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    pixKey: "",
    bankCode: "",
    bankName: "",
    agency: "",
    accountNumber: "",
  });

  const [totalStats, setTotalStats] = useState({
    totalEscritorios: 0,
    totalInvested: 0,
    totalCommission: 0,
    totalAssessores: 0,
    totalInvestors: 0,
  });

  // Estados para o modal de detalhes do escritório
  const [selectedEscritorio, setSelectedEscritorio] = useState<Escritorio | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [escritorioAssessores, setEscritorioAssessores] = useState<any[]>([]);
  const [escritorioInvestors, setEscritorioInvestors] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedAssessores, setExpandedAssessores] = useState<Set<string>>(new Set());
  const [expandedInvestors, setExpandedInvestors] = useState<Set<string>>(new Set());
  const [investmentsByInvestor, setInvestmentsByInvestor] = useState<Record<string, any[]>>({});
  const [investorsByAssessor, setInvestorsByAssessor] = useState<Record<string, any[]>>({});
  const [totalInvestments, setTotalInvestments] = useState<number>(0);
  const [viewingContract, setViewingContract] = useState<{ id: string; file_name: string; file_type: string } | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ id: string; file_name: string; file_type: string; file_size: number; status: 'pending' | 'approved' | 'rejected'; created_at: string } | null>(null);
  const [loadingContract, setLoadingContract] = useState<string | null>(null); // ID do investimento sendo carregado
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null); // ID do investimento sendo carregado

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchMyEscritorios(user.id);
    }
  }, [user]);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setIsLoadingBanks(true);
        const response = await fetch("https://brasilapi.com.br/api/banks/v1");
        if (!response.ok) {
          throw new Error("Não foi possível carregar a lista de bancos.");
        }
        const data = await response.json();
        const mappedBanks = Array.isArray(data)
          ? data
              .filter((bank: any) => bank?.code && bank?.name)
              .map((bank: any) => ({
                code: String(bank.code),
                name: String(bank.name),
              }))
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
          : [];
        setBanks(mappedBanks);
      } catch (error: any) {
        console.error("Erro ao carregar bancos:", error);
        toast({
          title: "Erro ao carregar bancos",
          description: error.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingBanks(false);
      }
    };

    loadBanks();
  }, [toast]);

  useEffect(() => {
    if (!escritorioForm.bankCode) return;
    const selected = banks.find((bank) => bank.code === escritorioForm.bankCode);
    if (selected) {
      setBankSearchTerm(`${selected.code} - ${selected.name}`);
    }
  }, [escritorioForm.bankCode, banks]);

  useEffect(() => {
    const stats = myEscritorios.reduce(
      (acc, escritorio) => ({
        totalEscritorios: acc.totalEscritorios + 1,
        totalInvested: acc.totalInvested + escritorio.totalInvested,
        totalCommission: acc.totalCommission + escritorio.totalCommission,
        totalAssessores: acc.totalAssessores + escritorio.assessoresCount,
        totalInvestors: acc.totalInvestors + escritorio.investorsCount,
      }),
      {
        totalEscritorios: 0,
        totalInvested: 0,
        totalCommission: 0,
        totalAssessores: 0,
        totalInvestors: 0,
      }
    );
    setTotalStats(stats);
  }, [myEscritorios]);

  const fetchMyEscritorios = async (distribuidorId: string) => {
    try {
      setLoadingEscritorios(true);
      const supabase = createClient();

      // Validar acesso ao distribuidor
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        console.error("[DistribuidorDashboard] Usuário não autenticado");
        return;
      }

      const loggedUser = JSON.parse(userStr);
      if (!loggedUser.id) {
        console.error("[DistribuidorDashboard] ID do usuário não encontrado");
        return;
      }

      // Validar que o distribuidorId é do usuário logado ou que o usuário tem acesso
      const { validateUserAccess, validateAdminAccess } = await import("@/lib/client-permission-utils");
      const isAdmin = await validateAdminAccess(loggedUser.id);
      const hasAccess = distribuidorId === loggedUser.id || isAdmin || await validateUserAccess(loggedUser.id, distribuidorId);
      
      if (!hasAccess) {
        console.error("[DistribuidorDashboard] Usuário não tem permissão para acessar estes escritórios");
        toast({
          title: "Erro",
          description: "Você não tem permissão para acessar estes dados",
          variant: "destructive",
        });
        return;
      }

      // Buscar perfil do distribuidor para obter user_type_id
      const { data: distributorProfile } = await supabase
        .from("profiles")
        .select("user_type_id")
        .eq("id", distribuidorId)
        .single();

      if (!distributorProfile?.user_type_id) {
        console.error("Distribuidor sem user_type_id");
        return;
      }

      // Buscar escritórios usando relações hierárquicas (mais confiável)
      // Isso busca TODOS os tipos de escritórios que o distribuidor pode ver/criar
      const { data: relations, error: relationsError } = await supabase.rpc(
        'get_user_type_relations_all',
        { p_user_type_id: distributorProfile.user_type_id }
      );

      if (relationsError) {
        console.error("Erro ao buscar relações:", relationsError);
      }

      // Filtrar TODAS as relações onde o distribuidor é pai (role: "parent")
      // Isso inclui TODOS os tipos de escritórios que o distribuidor pode ver/criar
      const allChildRelations = relations?.filter(
        (rel: any) => rel.role === "parent"
      ) || [];

      console.log(`[DISTRIBUIDOR] Total de relações encontradas (onde distribuidor é pai):`, allChildRelations.length);
      console.log(`[DISTRIBUIDOR] Detalhes de TODAS as relações:`, allChildRelations);

      // Extrair TODOS os user_type_id dos filhos (escritórios de diferentes tipos)
      const childUserTypeIds = allChildRelations.map((rel: any) => rel.child_user_type_id);
      const uniqueChildUserTypeIds = [...new Set(childUserTypeIds)];

      console.log(`[DISTRIBUIDOR] Tipos de escritórios únicos encontrados:`, uniqueChildUserTypeIds.length);
      console.log(`[DISTRIBUIDOR] IDs dos tipos de escritórios:`, uniqueChildUserTypeIds);
      console.log(`[DISTRIBUIDOR] Tipos de escritórios (nomes):`, allChildRelations.map((rel: any) => ({
        user_type_id: rel.child_user_type_id,
        user_type: rel.child_user_type,
        display_name: rel.child_display_name
      })));

      // Buscar TODOS os escritórios de TODOS os tipos relacionados ao distribuidor
      let allOffices: any[] = [];
      
      if (uniqueChildUserTypeIds.length > 0) {
        const { data: officesData, error: allOfficesError } = await supabase
        .from("profiles")
        .select("*")
          .in("user_type_id", uniqueChildUserTypeIds)
        .order("created_at", { ascending: false });

        if (allOfficesError) {
          console.error("Erro ao buscar todos os escritórios:", allOfficesError);
        } else {
          allOffices = officesData || [];
        }
      }

      console.log(`[DISTRIBUIDOR] Total de escritórios encontrados (todos os tipos): ${allOffices.length}`);
      if (allOffices.length > 0) {
        console.log(`[DISTRIBUIDOR] Todos os escritórios:`, allOffices.map((o: any) => ({ 
          id: o.id, 
          name: o.full_name, 
          parent_id: o.parent_id,
          user_type_id: o.user_type_id,
          distribuidorId: distribuidorId,
          matches: o.parent_id === distribuidorId 
        })));
      }

      // Filtrar escritórios que pertencem ao distribuidor
      // Método 1: Por parent_id direto (mais rápido)
      // Método 2: Validar acesso usando validateUserAccess para cada escritório (fallback)
      const profiles: any[] = [];
      
      if (allOffices.length > 0) {
        for (const office of allOffices) {
          // Verificar se tem parent_id correto
          if (office.parent_id === distribuidorId) {
            profiles.push(office);
            continue;
          }
          
          // Se não tem parent_id correto, validar acesso (pode ser que o parent_id esteja errado mas o acesso seja válido)
          const { validateUserAccess } = await import("@/lib/client-permission-utils");
          const hasAccess = await validateUserAccess(loggedUser.id, office.id);
          if (hasAccess) {
            console.log(`[DISTRIBUIDOR] Escritório ${office.full_name} (${office.id}) encontrado via validação de acesso, mesmo sem parent_id correto`);
            profiles.push(office);
          }
        }
      }

      console.log(`[DISTRIBUIDOR] Total de escritórios encontrados após filtro: ${profiles.length}`);
      if (profiles.length > 0) {
        console.log(`[DISTRIBUIDOR] IDs finais dos escritórios:`, profiles.map((p: any) => ({ id: p.id, name: p.full_name, parent_id: p.parent_id })));
      }

      if (profiles.length === 0) {
        setMyEscritorios([]);
        return;
      }

      const escritorioIds = profiles.map((p) => p.id);

      // Buscar assessores de TODOS os tipos relacionados a cada escritório
      // Para cada escritório, buscar suas relações e identificar todos os tipos de assessores
      let allAdvisorUserTypeIds: Set<number> = new Set();
      
      // Buscar relações de cada escritório para identificar tipos de assessores
      for (const escritorio of profiles) {
        const { data: escritorioRelations, error: escritorioRelationsError } = await supabase.rpc(
          'get_user_type_relations_all',
          { p_user_type_id: escritorio.user_type_id }
        );

        if (escritorioRelationsError) {
          console.error(`Erro ao buscar relações do escritório ${escritorio.id}:`, escritorioRelationsError);
          continue;
        }

        // Filtrar relações onde o escritório é pai (role: "parent") - esses são os tipos de assessores
        const advisorRelations = escritorioRelations?.filter(
          (rel: any) => rel.role === "parent"
        ) || [];

        console.log(`[DISTRIBUIDOR] Escritório ${escritorio.full_name} (${escritorio.id}) tem ${advisorRelations.length} tipos de assessores relacionados`);
        
        // Adicionar todos os user_type_id dos assessores ao conjunto
        advisorRelations.forEach((rel: any) => {
          allAdvisorUserTypeIds.add(rel.child_user_type_id);
        });
      }

      const uniqueAdvisorUserTypeIds = Array.from(allAdvisorUserTypeIds);
      console.log(`[DISTRIBUIDOR] Tipos únicos de assessores encontrados:`, uniqueAdvisorUserTypeIds.length);
      console.log(`[DISTRIBUIDOR] IDs dos tipos de assessores:`, uniqueAdvisorUserTypeIds);

      // Buscar assessores de TODOS os tipos relacionados aos escritórios
      let assessores: any[] = [];
      
      if (uniqueAdvisorUserTypeIds.length > 0 && escritorioIds.length > 0) {
        // Buscar assessores que:
        // 1. Têm um dos user_type_id de assessor identificados
        // 2. Pertencem a um dos escritórios (via office_id ou parent_id)
        
        // Query 1: Assessores com office_id em um dos escritórios
        const { data: assessoresByOffice, error: assessoresByOfficeError } = await supabase
        .from("profiles")
          .select("id, parent_id, office_id, user_type_id, distributor_id")
          .in("user_type_id", uniqueAdvisorUserTypeIds)
          .in("office_id", escritorioIds);

        // Query 2: Assessores com parent_id em um dos escritórios
        const { data: assessoresByParent, error: assessoresByParentError } = await supabase
          .from("profiles")
          .select("id, parent_id, office_id, user_type_id, distributor_id")
          .in("user_type_id", uniqueAdvisorUserTypeIds)
          .in("parent_id", escritorioIds);

        if (assessoresByOfficeError) {
          console.error("Erro ao buscar assessores por office_id:", assessoresByOfficeError);
        }
        if (assessoresByParentError) {
          console.error("Erro ao buscar assessores por parent_id:", assessoresByParentError);
        }

        // Combinar e remover duplicatas
        const allAssessores = [
          ...(assessoresByOffice || []),
          ...(assessoresByParent || [])
        ];
        
        // Remover duplicatas baseado no ID
        const assessoresMap = new Map();
        allAssessores.forEach((advisor: any) => {
          assessoresMap.set(advisor.id, advisor);
        });
        
        assessores = Array.from(assessoresMap.values());
      }

      console.log(`[DISTRIBUIDOR] Escritórios encontrados: ${profiles.length}`);
      console.log(`[DISTRIBUIDOR] IDs dos escritórios:`, escritorioIds);
      console.log(`[DISTRIBUIDOR] Total de assessores encontrados: ${assessores.length}`);
      if (assessores.length > 0) {
        console.log(`[DISTRIBUIDOR] Detalhes dos assessores:`, assessores.map((a: any) => ({
          id: a.id,
          office_id: a.office_id,
          parent_id: a.parent_id,
          user_type_id: a.user_type_id
        })));
      }

      // SIMPLIFICADO: Buscar investidores usando distributor_id
      const { data: investors, error: investorsError } = await supabase
        .from("profiles")
        .select("id, parent_id, office_id, distributor_id")
        .eq("user_type", "investor")
        .eq("distributor_id", distribuidorId);

      if (investorsError) {
        console.error("Erro ao buscar investidores:", investorsError);
      }

      console.log(`[DISTRIBUIDOR] Total de investidores: ${investors?.length || 0}`);
      console.log(`[DISTRIBUIDOR] IDs dos investidores:`, (investors || []).map(i => i.id));

      const investorIds = (investors || []).map((i) => i.id);

      // Buscar investimentos
      let investments: any[] = [];
      if (investorIds.length > 0) {
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("user_id, amount, status")
          .eq("status", "active")
          .in("user_id", investorIds);

        if (investmentsError) {
          console.error("Erro ao buscar investimentos:", investmentsError);
        } else {
          investments = investmentsData || [];
          console.log(`[DISTRIBUIDOR] Investimentos encontrados: ${investments.length}`);
          console.log(`[DISTRIBUIDOR] Detalhes dos investimentos:`, investments);
        }
      } else {
        console.log(`[DISTRIBUIDOR] Nenhum investidor encontrado, não há investimentos para buscar`);
      }

      // Calcular totais por escritório
      const investmentsByInvestor = investments.reduce<Record<string, number>>(
        (acc, investment) => {
          const amount = Number(investment.amount) || 0;
          const userId = investment.user_id;
          acc[userId] = (acc[userId] || 0) + amount;
          console.log(`[DISTRIBUIDOR] Investimento do usuário ${userId}: R$ ${amount} (acumulado: R$ ${acc[userId]})`);
          return acc;
        },
        {}
      );
      
      console.log(`[DISTRIBUIDOR] Total de investimentos por investidor:`, investmentsByInvestor);

      // Contar assessores por escritório (usando office_id ou parent_id)
      const assessoresByEscritorio = assessores.reduce<Record<string, number>>(
        (acc, assessor) => {
          const escritorioId = assessor.office_id || assessor.parent_id;
          if (escritorioId && escritorioIds.includes(escritorioId)) {
            acc[escritorioId] = (acc[escritorioId] || 0) + 1;
          }
          return acc;
        },
        {}
      );
      
      console.log(`[DISTRIBUIDOR] Assessores por escritório:`, assessoresByEscritorio);

      // Contar investidores por escritório (sem duplicação)
      const investorsByEscritorio: Record<string, Set<string>> = {};
      
      // Inicializar sets para cada escritório
      escritorioIds.forEach((id) => {
        investorsByEscritorio[id] = new Set();
      });

      // Adicionar investidores diretamente vinculados ao escritório via office_id
      (investors || []).forEach((investor) => {
        const escritorioId = investor.office_id;
        if (escritorioId && escritorioIds.includes(escritorioId)) {
          investorsByEscritorio[escritorioId].add(investor.id);
        }
      });

      // Adicionar investidores vinculados via assessores
      (assessores || []).forEach((assessor) => {
        const escritorioId = assessor.office_id || assessor.parent_id;
        if (escritorioId && escritorioIds.includes(escritorioId)) {
          // Buscar investidores deste assessor
          (investors || []).forEach((investor) => {
            if (investor.parent_id === assessor.id) {
              investorsByEscritorio[escritorioId].add(investor.id);
            }
          });
        }
      });

      // Converter sets para contagens
      const investorsByEscritorioCount: Record<string, number> = {};
      Object.keys(investorsByEscritorio).forEach((escritorioId) => {
        investorsByEscritorioCount[escritorioId] = investorsByEscritorio[escritorioId].size;
      });

      // Buscar taxa de comissão do distribuidor do banco uma vez (sempre usar período padrão de 12 meses e liquidez mensal)
      const commitmentPeriod = 12;
      const liquidity = "Mensal";
      const distributorCommissionRate = await getCommissionRate(distributorProfile.user_type_id, commitmentPeriod, liquidity);
      
      console.log(`[DISTRIBUIDOR] Taxa de comissão do distribuidor: ${(distributorCommissionRate * 100).toFixed(2)}%`);

      const transformedEscritorios: Escritorio[] = profiles.map((profile) => {
        const escritorioId = profile.id;
        const escritorioAssessores = assessoresByEscritorio[escritorioId] || 0;
        const escritorioInvestors = investorsByEscritorioCount[escritorioId] || 0;

        console.log(`[DISTRIBUIDOR] Escritório ${profile.full_name}: ${escritorioAssessores} assessores, ${escritorioInvestors} investidores`);

        // Calcular total investido pelos investidores deste escritório
        // Incluir investidores vinculados diretamente ao escritório (office_id)
        // e investidores vinculados via assessores do escritório
        const escritorioAssessorIds = (assessores || [])
          .filter((a) => (a.office_id || a.parent_id) === escritorioId)
          .map((a) => a.id);

        const escritorioInvestorIds = (investors || [])
          .filter((i) => 
            i.office_id === escritorioId || 
            escritorioAssessorIds.includes(i.parent_id || "")
          )
          .map((i) => i.id);

        console.log(`[DISTRIBUIDOR] Escritório ${profile.full_name} - IDs dos investidores:`, escritorioInvestorIds);
        console.log(`[DISTRIBUIDOR] Escritório ${profile.full_name} - Investimentos por investidor:`, investmentsByInvestor);

        const totalInvested = escritorioInvestorIds.reduce(
          (sum, investorId) => {
            const amount = investmentsByInvestor[investorId] || 0;
            console.log(`[DISTRIBUIDOR] Investidor ${investorId}: R$ ${amount}`);
            return sum + amount;
          },
          0
        );

        console.log(`[DISTRIBUIDOR] Escritório ${profile.full_name} - Total investido: R$ ${totalInvested}`);

        // Calcular comissão usando taxa do banco
        const totalCommission = totalInvested * distributorCommissionRate;
        
        console.log(`[DISTRIBUIDOR] Escritório ${profile.full_name} - Comissão: R$ ${totalCommission}`);

        const cpfCnpjFromProfile = profile.cnpj || "";

        return {
          id: profile.id,
          name: profile.full_name || profile.email.split("@")[0],
          email: profile.email,
          phone: profile.phone,
          cnpj: cpfCnpjFromProfile,
          totalInvested,
          totalCommission,
          assessoresCount: escritorioAssessores,
          investorsCount: escritorioInvestors,
          status: profile.is_active ? "active" : "inactive",
          joinedAt: profile.created_at,
          lastActivity: profile.updated_at || profile.created_at,
        };
      });

      setMyEscritorios(transformedEscritorios);
    } catch (error) {
      console.error("Erro ao buscar escritórios:", error);
    } finally {
      setLoadingEscritorios(false);
    }
  };

  const sanitizeCep = (value: string) => value.replace(/\D/g, "").slice(0, 8);

  const formatCep = (value: string) => {
    const digits = sanitizeCep(value);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const handleZipChange = (value: string) => {
    const formatted = formatCep(value);
    setEscritorioForm((prev) => ({
      ...prev,
      zipCode: formatted,
    }));
  };

  const fetchAddressByCep = async () => {
    const cepDigits = sanitizeCep(escritorioForm.zipCode);

    if (cepDigits.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Informe um CEP com 8 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsFetchingCep(true);
      setEscritorioForm((prev) => ({
        ...prev,
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      }));

      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data = await response.json();
      if (data?.erro) {
        throw new Error("CEP não encontrado.");
      }

      setEscritorioForm((prev) => ({
        ...prev,
        street: data.logradouro || "",
        number: "",
        complement: data.complemento || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));

      toast({
        title: "Endereço atualizado",
        description: "Os campos de endereço foram preenchidos com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao buscar CEP",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleSelectBank = (bankCode: string) => {
    const bank = banks.find((item) => item.code === bankCode);
    setEscritorioForm((prev) => ({
      ...prev,
      bankCode,
      bankName: bank?.name || "",
    }));
    setBankSearchTerm(bank ? `${bank.code} - ${bank.name}` : "");
    setIsBankListOpen(false);
  };

  const validateStep = (stepIndex: number) => {
    const missing: string[] = [];

    switch (stepIndex) {
      case 0: {
        if (!escritorioForm.fullName) missing.push("Nome completo");
        if (!escritorioForm.email) missing.push("Email");
        if (!escritorioForm.cpfCnpj) missing.push("CPF/CNPJ");
        // Removido: validação de senha - senha será gerada automaticamente
        break;
      }
      case 1: {
        if (!escritorioForm.street) missing.push("Rua");
        if (!escritorioForm.number) missing.push("Número");
        if (!escritorioForm.neighborhood) missing.push("Bairro");
        if (!escritorioForm.city) missing.push("Cidade");
        if (!escritorioForm.state) missing.push("Estado");
        if (!escritorioForm.zipCode) {
          missing.push("CEP");
        } else if (sanitizeCep(escritorioForm.zipCode).length !== 8) {
          toast({
            title: "CEP inválido",
            description: "Informe um CEP com 8 dígitos.",
            variant: "destructive",
          });
          return false;
        }
        break;
      }
      case 2: {
        const hasPix = Boolean(escritorioForm.pixKey?.trim());
        const hasBankData =
          Boolean(escritorioForm.bankCode) ||
          Boolean(escritorioForm.agency) ||
          Boolean(escritorioForm.accountNumber);

        if (!hasPix && !hasBankData) {
          missing.push("Chave PIX ou dados bancários");
        }

        if (hasBankData) {
          const bankMissing: string[] = [];
          if (!escritorioForm.bankCode) bankMissing.push("Banco");
          if (!escritorioForm.agency) bankMissing.push("Agência");
          if (!escritorioForm.accountNumber) bankMissing.push("Conta");

          if (bankMissing.length > 0) {
            missing.push(...bankMissing);
          }
        }
        break;
      }
      default:
        break;
    }

    if (missing.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha os campos: ${missing.join(", ")}.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;

    setCurrentStep((prev) => {
      const stepsLength = REGISTRATION_STEPS.length;
      return Math.min(prev + 1, stepsLength - 1);
    });
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const resetEscritorioForm = () => {
    setEscritorioForm({
      fullName: "",
      email: "",
      phone: "",
      cpfCnpj: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      pixKey: "",
      bankCode: "",
      bankName: "",
      agency: "",
      accountNumber: "",
    });
    setCurrentStep(0);
    setBankSearchTerm("");
    setIsBankListOpen(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                value={escritorioForm.fullName}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
                placeholder="Nome completo do escritório"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={escritorioForm.email}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={escritorioForm.phone}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
              <Input
                id="cpfCnpj"
                value={escritorioForm.cpfCnpj ? formatCpfCnpj(escritorioForm.cpfCnpj) : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const value = digits.slice(0, 14);
                  setEscritorioForm((prev) => ({
                    ...prev,
                    cpfCnpj: value,
                  }));
                }}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
                required
              />
            </div>

            <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Mail className="h-4 w-4" />
                <p className="text-sm">
                  Uma senha temporária será gerada automaticamente e enviada por email ao escritório.
                </p>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="street">Rua *</Label>
              <Input
                id="street"
                value={escritorioForm.street}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    street: e.target.value,
                  }))
                }
                placeholder="Nome da rua"
                required
              />
            </div>

            <div>
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                value={escritorioForm.number}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    number: e.target.value,
                  }))
                }
                placeholder="123"
                required
              />
            </div>

            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={escritorioForm.complement}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    complement: e.target.value,
                  }))
                }
                placeholder="Apartamento, sala, bloco..."
              />
            </div>

            <div>
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input
                id="neighborhood"
                value={escritorioForm.neighborhood}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    neighborhood: e.target.value,
                  }))
                }
                placeholder="Nome do bairro"
                required
              />
            </div>

            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={escritorioForm.city}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    city: e.target.value,
                  }))
                }
                placeholder="Nome da cidade"
                required
              />
            </div>

            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                value={escritorioForm.state}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    state: e.target.value,
                  }))
                }
                placeholder="SP"
                required
              />
            </div>

            <div>
              <Label htmlFor="zipCode">CEP *</Label>
              <div className="flex gap-2">
                <Input
                  id="zipCode"
                  value={escritorioForm.zipCode}
                  onChange={(e) => handleZipChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchAddressByCep();
                    }
                  }}
                  placeholder="00000-000"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchAddressByCep}
                  disabled={isFetchingCep}
                  className="whitespace-nowrap"
                >
                  {isFetchingCep ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Buscar CEP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      case 2: {
        const filteredBanks = banks.filter((bank) =>
          `${bank.code} ${bank.name}`.toLowerCase().includes(bankSearchTerm.toLowerCase())
        );

        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX ou Endereço USDT</Label>
              <Input
                id="pixKey"
                value={escritorioForm.pixKey}
                onChange={(e) =>
                  setEscritorioForm((prev) => ({
                    ...prev,
                    pixKey: e.target.value,
                  }))
                }
                placeholder="Chave PIX (CPF, email, telefone) ou endereço USDT"
              />
            </div>

            <div className="space-y-2">
              <Label>Banco</Label>
              <div className="relative">
                <Input
                  value={bankSearchTerm}
                  onChange={(e) => {
                    setBankSearchTerm(e.target.value);
                    setEscritorioForm((prev) => ({
                      ...prev,
                      bankCode: "",
                      bankName: "",
                    }));
                    setIsBankListOpen(true);
                  }}
                  onFocus={() => setIsBankListOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsBankListOpen(false), 150);
                  }}
                  placeholder={
                    isLoadingBanks ? "Carregando bancos..." : "Digite nome ou código do banco"
                  }
                  disabled={isLoadingBanks}
                />
                {isBankListOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md">
                    {isLoadingBanks ? (
                      <div className="p-3 text-sm text-muted-foreground">Carregando bancos...</div>
                    ) : filteredBanks.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">Nenhum banco encontrado.</div>
                    ) : (
                      filteredBanks.map((bank) => (
                        <button
                          key={bank.code}
                          type="button"
                          className={`flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                            escritorioForm.bankCode === bank.code ? "bg-accent/60" : ""
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectBank(bank.code);
                          }}
                        >
                          <span className="font-medium">{bank.code}</span>
                          <span className="text-muted-foreground">{bank.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Lista oficial (BACEN/Febraban). Digite parte do nome ou código para filtrar o banco.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="agency">Agência</Label>
                <Input
                  id="agency"
                  value={escritorioForm.agency}
                  onChange={(e) =>
                    setEscritorioForm((prev) => ({
                      ...prev,
                      agency: e.target.value,
                    }))
                  }
                  placeholder="Ex: 0001"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Conta</Label>
                <Input
                  id="accountNumber"
                  value={escritorioForm.accountNumber}
                  onChange={(e) =>
                    setEscritorioForm((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                  placeholder="Ex: 123456-7"
                />
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const buildFullAddress = () => {
    const parts = [
      escritorioForm.street,
      escritorioForm.number,
      escritorioForm.complement,
      escritorioForm.neighborhood,
      escritorioForm.city,
      escritorioForm.state,
      escritorioForm.zipCode,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const handleCreateEscritorio = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < REGISTRATION_STEPS.length - 1) {
      handleNextStep();
      return;
    }

    try {
      setSubmittingEscritorio(true);
      
      // Validar que o usuário logado tem permissão para criar escritórios
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        throw new Error("Usuário não autenticado");
      }

      const loggedUser = JSON.parse(userStr);
      const { validateCanCreateProfile, validateAdminAccess } = await import("@/lib/client-permission-utils");
      const isAdmin = await validateAdminAccess(loggedUser.id);
      const canCreate = isAdmin || await validateCanCreateProfile(loggedUser.id, "office");
      
      if (!canCreate) {
        throw new Error("Você não tem permissão para criar escritórios");
      }

      const supabase = createClient();

      const pixNote = escritorioForm.pixKey
        ? ` | PIX: ${escritorioForm.pixKey}`
        : "";
      const bankNote = escritorioForm.bankCode
        ? ` | Banco: ${escritorioForm.bankCode}${
            escritorioForm.bankName ? ` - ${escritorioForm.bankName}` : ""
          } Agência: ${escritorioForm.agency || "-"} Conta: ${escritorioForm.accountNumber || "-"}`
        : "";
      const metadataNotes = `CPF/CNPJ: ${escritorioForm.cpfCnpj}${pixNote}${bankNote}`;

      // Gerar senha temporária
      const { generateTemporaryPassword } = await import("@/lib/password-utils");
      const temporaryPassword = generateTemporaryPassword(12);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: escritorioForm.email,
        password: temporaryPassword,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/login`,
          data: {
            full_name: escritorioForm.fullName,
            user_type: "distributor",
            role: "escritorio",
            parent_id: user?.id || null,
            phone: escritorioForm.phone || null,
            cpf_cnpj: escritorioForm.cpfCnpj,
            notes: metadataNotes,
            pix_usdt_key: escritorioForm.pixKey || null,
            bank_code: escritorioForm.bankCode || null,
            bank_name: escritorioForm.bankName || null,
            bank_branch: escritorioForm.agency || null,
            bank_account: escritorioForm.accountNumber || null,
            address_complement: escritorioForm.complement || null,
          },
        },
      });

      if (authError) {
        console.error("Erro ao criar usuário no Supabase Auth:", authError);
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário: dados do usuário não retornados");
      }

      console.log("Usuário criado no Supabase Auth com sucesso:", authData.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata.full_name,
            user_type: "distributor",
            role: "escritorio",
            parent_id: user?.id || null,
            distributor_id: user?.id || null,
            phone: authData.user.user_metadata.phone || null,
            cnpj: authData.user.user_metadata.cpf_cnpj || null,
            notes: `Escritório criado pelo distribuidor ${user?.name}${pixNote}${bankNote}`,
            hierarchy_level: "office",
            is_active: true,
            address: buildFullAddress(),
            pix_usdt_key: escritorioForm.pixKey || null,
            bank_name: escritorioForm.bankName || null,
            bank_branch: escritorioForm.agency || null,
            bank_account: escritorioForm.accountNumber || null,
            is_pass_temp: true, // Marcar que precisa trocar senha no primeiro login
          },
        ])
        .select()
        .single();

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError);
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }

      // Enviar senha temporária por email
      try {
        const sendPasswordResponse = await fetch("/api/auth/send-temporary-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: escritorioForm.email,
            userName: escritorioForm.fullName,
            password: temporaryPassword,
          }),
        });

        const sendPasswordData = await sendPasswordResponse.json();
        
        if (sendPasswordData.success) {
          console.log("Senha temporária enviada com sucesso");
        } else {
          console.error("Erro ao enviar senha temporária:", sendPasswordData.error);
        }
      } catch (passwordError) {
        console.error("Erro ao enviar senha temporária:", passwordError);
      }

      toast({
        title: "Escritório cadastrado!",
        description: `${escritorioForm.fullName} foi cadastrado com sucesso. Senha temporária enviada por email.`,
      });

      resetEscritorioForm();
      setActiveTab("escritorios");

      if (user?.id) {
        setTimeout(() => {
          fetchMyEscritorios(user.id);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Erro ao cadastrar escritório:", error);
      toast({
        title: "Erro ao cadastrar escritório",
        description: error.message || "Não foi possível cadastrar o escritório.",
        variant: "destructive",
      });
    } finally {
      setSubmittingEscritorio(false);
    }
  };

  const filteredEscritorios = useMemo(() => {
    if (!searchTerm.trim()) {
      return myEscritorios;
    }

    const term = searchTerm.toLowerCase();
    return myEscritorios.filter(
      (escritorio) =>
        escritorio.name.toLowerCase().includes(term) ||
        escritorio.email.toLowerCase().includes(term) ||
        formatCpfCnpj(escritorio.cnpj)?.toLowerCase().includes(term)
    );
  }, [myEscritorios, searchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Formata data em UTC para evitar diferença de 1 dia por timezone
  const formatDateUTC = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "-";
    const s = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
    const dateOnly = s.split("T")[0];
    if (!dateOnly) return "-";
    const [y, m, d] = dateOnly.split("-");
    return `${d}/${m}/${y}`;
  };

  const handleViewDetails = async (escritorio: Escritorio) => {
    setSelectedEscritorio(escritorio);
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    
    try {
      const supabase = createClient();
      const escritorioId = escritorio.id;

      // Obter o ID do distribuidor logado
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        setLoadingDetails(false);
        return;
      }

      const loggedUser = JSON.parse(userStr);
      const distribuidorId = loggedUser.id;

      // Validar acesso ao escritório
      const { validateUserAccess, validateAdminAccess } = await import("@/lib/client-permission-utils");
      const isAdmin = await validateAdminAccess(loggedUser.id);
      const hasAccess = isAdmin || await validateUserAccess(loggedUser.id, escritorioId);
      
      if (!hasAccess) {
        toast({
          title: "Erro",
          description: "Você não tem permissão para acessar os detalhes deste escritório",
          variant: "destructive",
        });
        setIsDetailsModalOpen(false);
        setLoadingDetails(false);
        return;
      }

      // Buscar user_type_id do escritório para identificar seus tipos de assessores
      const { data: escritorioProfile } = await supabase
        .from("profiles")
        .select("user_type_id")
        .eq("id", escritorioId)
        .single();

      if (!escritorioProfile?.user_type_id) {
        toast({
          title: "Erro",
          description: "Erro ao buscar perfil do escritório",
          variant: "destructive",
        });
        setLoadingDetails(false);
        return;
      }

      // Buscar relações do escritório para identificar TODOS os tipos de assessores
      const { data: escritorioRelations, error: escritorioRelationsError } = await supabase.rpc(
        'get_user_type_relations_all',
        { p_user_type_id: escritorioProfile.user_type_id }
      );

      if (escritorioRelationsError) {
        console.error("Erro ao buscar relações do escritório:", escritorioRelationsError);
      }

      // Filtrar relações onde o escritório é pai (role: "parent") - esses são os tipos de assessores
      const advisorRelations = escritorioRelations?.filter(
        (rel: any) => rel.role === "parent"
      ) || [];

      console.log(`[DETALHES] Escritório ${escritorioId} tem ${advisorRelations.length} tipos de assessores relacionados`);
      console.log(`[DETALHES] Tipos de assessores:`, advisorRelations.map((rel: any) => ({
        user_type_id: rel.child_user_type_id,
        user_type: rel.child_user_type,
        display_name: rel.child_display_name
      })));

      // Extrair todos os user_type_id únicos dos assessores
      const advisorUserTypeIds = advisorRelations.map((rel: any) => rel.child_user_type_id);
      const uniqueAdvisorUserTypeIds = [...new Set(advisorUserTypeIds)];

      // Buscar assessores de TODOS os tipos relacionados ao escritório
      let assessores: any[] = [];

      if (uniqueAdvisorUserTypeIds.length > 0) {
        // Query 1: Assessores com office_id = escritorioId
      const { data: assessoresByOffice, error: assessoresByOfficeError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, cnpj, created_at")
          .in("user_type_id", uniqueAdvisorUserTypeIds)
        .eq("office_id", escritorioId);

        // Query 2: Assessores com parent_id = escritorioId
      const { data: assessoresByParent, error: assessoresByParentError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, cnpj, created_at")
          .in("user_type_id", uniqueAdvisorUserTypeIds)
        .eq("parent_id", escritorioId);

        if (assessoresByOfficeError) {
          console.error("Erro ao buscar assessores por office_id:", assessoresByOfficeError);
        }
        if (assessoresByParentError) {
          console.error("Erro ao buscar assessores por parent_id:", assessoresByParentError);
      }

      // Combinar e remover duplicatas
      const allAssessores = [
        ...(assessoresByOffice || []),
          ...(assessoresByParent || [])
        ];
        
        // Remover duplicatas baseado no ID
        const assessoresMap = new Map();
        allAssessores.forEach((advisor: any) => {
          assessoresMap.set(advisor.id, advisor);
        });
        
        assessores = Array.from(assessoresMap.values());

      if (assessoresByOfficeError || assessoresByParentError) {
          toast({
            title: "Aviso",
            description: "Alguns assessores podem não ter sido carregados",
            variant: "default",
          });
        }
      } else {
        console.warn(`[DETALHES] Nenhum tipo de assessor encontrado para o escritório ${escritorioId}`);
      }

      console.log(`[DISTRIBUIDOR] Assessores encontrados para escritório ${escritorioId}:`, assessores.length);
      console.log(`[DISTRIBUIDOR] Detalhes dos assessores:`, assessores.map((a: any) => ({
        id: a.id,
        nome: a.full_name,
        email: a.email
      })));
      
      // Verificar se há assessores de diferentes tipos
      if (assessores.length > 0) {
        const assessorTypes = await Promise.all(
          assessores.map(async (assessor: any) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("user_type_id")
              .eq("id", assessor.id)
              .single();
            return profile?.user_type_id;
          })
        );
        console.log(`[DETALHES] Tipos de assessores encontrados:`, [...new Set(assessorTypes)]);
      }

      // Buscar user_type_id de "investor" para filtrar investidores
      const { data: investorUserType } = await supabase
        .from("user_types")
        .select("id")
        .eq("user_type", "investor")
        .limit(1);

      if (!investorUserType || investorUserType.length === 0) {
        toast({
          title: "Erro",
          description: "Tipo de usuário 'investor' não encontrado",
          variant: "destructive",
        });
        setLoadingDetails(false);
        return;
      }

      const investorUserTypeId = investorUserType[0].id;

      // Buscar investidores do escritório (diretamente ou via assessores)
      const assessorIds = assessores.map((a) => a.id);
      
      console.log(`[DETALHES] Buscando investidores para escritório ${escritorioId}`);
      console.log(`[DETALHES] IDs dos assessores:`, assessorIds);
      
      // Buscar investidores de múltiplas formas para garantir que encontramos todos:
      // 1. Investidores diretamente vinculados ao escritório (office_id)
      const { data: investorsByOffice, error: investorsByOfficeError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, cnpj, created_at, parent_id, office_id, distributor_id")
        .eq("user_type_id", investorUserTypeId)
        .eq("office_id", escritorioId);

      if (investorsByOfficeError) {
        console.error("Erro ao buscar investidores por office_id:", investorsByOfficeError);
      }
      console.log(`[DETALHES] Investidores encontrados por office_id: ${investorsByOffice?.length || 0}`);

      // 2. Investidores vinculados via assessores (parent_id = assessor)
      let investorsByAssessor: any[] = [];
      if (assessorIds.length > 0) {
        const { data: investorsByAssessorData, error: investorsByAssessorError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, cnpj, created_at, parent_id, office_id, distributor_id")
          .eq("user_type_id", investorUserTypeId)
          .in("parent_id", assessorIds);

        if (investorsByAssessorError) {
          console.error("Erro ao buscar investidores por parent_id:", investorsByAssessorError);
        } else {
          investorsByAssessor = investorsByAssessorData || [];
        }
        console.log(`[DETALHES] Investidores encontrados por parent_id: ${investorsByAssessor.length}`);
      }

      // 3. Investidores vinculados via distributor_id (mesma lógica da função principal)
      // Buscar todos os investidores do distribuidor e filtrar pelos que pertencem a este escritório
      let investorsByDistributor: any[] = [];
      if (distribuidorId) {
        // IMPORTANTE: Usar user_type ao invés de user_type_id para manter compatibilidade
        // A função principal usa .eq("user_type", "investor")
        const { data: allInvestorsByDistributor, error: investorsByDistributorError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, cnpj, created_at, parent_id, office_id, distributor_id, user_type_id")
          .eq("user_type", "investor")
          .eq("distributor_id", distribuidorId);

        if (investorsByDistributorError) {
          console.error("Erro ao buscar investidores por distributor_id:", investorsByDistributorError);
        } else {
          console.log(`[DETALHES] Total de investidores do distribuidor: ${allInvestorsByDistributor?.length || 0}`);
          console.log(`[DETALHES] IDs dos assessores do escritório:`, assessorIds);
          
          // Filtrar apenas os investidores que pertencem a este escritório ou seus assessores
          // Mesma lógica da função principal: office_id = escritorioId OU parent_id em um dos assessores
          investorsByDistributor = (allInvestorsByDistributor || []).filter((investor: any) => {
            // Investidor vinculado diretamente ao escritório
            if (investor.office_id === escritorioId) {
              console.log(`[DETALHES] Investidor ${investor.id} vinculado diretamente ao escritório (office_id)`);
              return true;
            }
            // Investidor vinculado a um assessor deste escritório
            if (investor.parent_id && assessorIds.includes(investor.parent_id)) {
              console.log(`[DETALHES] Investidor ${investor.id} vinculado ao assessor ${investor.parent_id}`);
              return true;
            }
            return false;
          });
        }
        console.log(`[DETALHES] Investidores encontrados por distributor_id (filtrados): ${investorsByDistributor.length}`);
        if (investorsByDistributor.length > 0) {
          console.log(`[DETALHES] IDs dos investidores filtrados:`, investorsByDistributor.map((i: any) => i.id));
        }
      }

      // Combinar e remover duplicatas
      const allInvestors = [
        ...(investorsByOffice || []),
        ...investorsByAssessor,
        ...investorsByDistributor
      ];
      const uniqueInvestors = allInvestors.filter((investor, index, self) =>
        index === self.findIndex(i => i.id === investor.id)
      );

      console.log(`[DETALHES] Total de investidores únicos: ${uniqueInvestors.length}`);

      const investorIds = uniqueInvestors.map((i) => i.id);

      // Buscar investimentos ativos dos investidores com todos os dados necessários
      let investments: any[] = [];
      if (investorIds.length > 0) {
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("id, user_id, amount, status, payment_date, profitability_liquidity, commitment_period, created_at")
          .eq("status", "active")
          .in("user_id", investorIds);

        if (investmentsError) {
          console.error("Erro ao buscar investimentos:", investmentsError);
        } else {
          investments = investmentsData || [];
        }
      }

      // Buscar user_type_id dos investidores e assessores para calcular comissões
      const investorProfilesWithType = await Promise.all(
        uniqueInvestors.map(async (investor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_type_id, parent_id")
            .eq("id", investor.id)
            .single();
          return { ...investor, user_type_id: profile?.user_type_id, parent_id: profile?.parent_id };
        })
      );

      const assessorProfilesWithType = await Promise.all(
        assessores.map(async (assessor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_type_id")
            .eq("id", assessor.id)
            .single();
          return { ...assessor, user_type_id: profile?.user_type_id };
        })
      );

      // Calcular comissões para cada investimento usando calculateNewCommissionLogic
      const { calculateNewCommissionLogic: calcNewCommissionLogic, getNextPaymentIndex, toDateStringLocal } = await import("@/lib/commission-calculator");
      // Normaliza payment_date para YYYY-MM-DD (evita diferença de 1 dia por timezone nos cálculos)
      const toDateOnly = (d: string | Date | null | undefined): string | undefined => {
        if (!d) return undefined;
        const s = typeof d === "string" ? d : new Date(d).toISOString();
        return s.split("T")[0] || undefined;
      };
      
      const investmentsWithCommissions = await Promise.all(
        investments.map(async (investment) => {
          const investorProfile = investorProfilesWithType.find((p) => p.id === investment.user_id);
          const advisorProfile = investorProfile?.parent_id 
            ? assessorProfilesWithType.find((p) => p.id === investorProfile.parent_id)
            : null;

          let investorRate = 0;
          let advisorRate = 0;
          let investorCommission = 0;
          let advisorCommission = 0;
          let officeCommission = 0;

          // Buscar taxas para exibição
          if (investorProfile?.user_type_id) {
            investorRate = await getCommissionRate(
              investorProfile.user_type_id,
              investment.commitment_period || 12,
              investment.profitability_liquidity || "Mensal"
            );
          }

          if (advisorProfile?.user_type_id) {
            advisorRate = await getCommissionRate(
              advisorProfile.user_type_id,
              12,
              "Mensal"
            );
          }

          // Calcular comissões usando calculateNewCommissionLogic para obter valores corretos com pro-rata e payout_start_days
          try {
            // Calcular comissão do investidor (com D+60)
            const paymentDateStr = toDateOnly(investment.payment_date || investment.created_at) || investment.payment_date || investment.created_at;
            const investorCommissionCalc = await calcNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: paymentDateStr,
              commitment_period: investment.commitment_period || 12,
              liquidity: investment.profitability_liquidity,
              investorName: investorProfile?.full_name || "Investidor",
              investorUserTypeId: investorProfile?.user_type_id || null,
              advisorId: advisorProfile?.id,
              advisorName: advisorProfile?.full_name || "Assessor",
              advisorUserTypeId: advisorProfile?.user_type_id || null,
              officeId: escritorioId,
              officeUserTypeId: escritorioProfile?.user_type_id || null,
              officeName: selectedEscritorio?.name || "Escritório",
              isForAdvisor: false, // Investidores têm D+60
            });

            // Escritório e assessor: mesma lógica do getProrataInfo (export) via getNextPaymentIndex
            if (investorCommissionCalc.monthlyBreakdown && investorCommissionCalc.paymentDueDate) {
              const idx = getNextPaymentIndex(investorCommissionCalc.paymentDueDate);
              const entry = investorCommissionCalc.monthlyBreakdown[idx];
              if (entry) {
                officeCommission = entry.officeCommission ?? 0;
                advisorCommission = entry.advisorCommission ?? 0;
              } else if (investorCommissionCalc.monthlyBreakdown[0]) {
                officeCommission = investorCommissionCalc.monthlyBreakdown[0].officeCommission ?? 0;
                advisorCommission = investorCommissionCalc.monthlyBreakdown[0].advisorCommission ?? 0;
              }
            }

            // Próxima comissão do investidor: primeiro futuro com valor > 0 (D+60 pode zerar períodos iniciais)
            if (investorCommissionCalc.monthlyBreakdown && investorCommissionCalc.paymentDueDate) {
              const todayStr = toDateStringLocal(new Date());
              let nextPaymentIndex = -1;
              for (let i = 0; i < investorCommissionCalc.paymentDueDate.length; i++) {
                const dStr = toDateStringLocal(new Date(investorCommissionCalc.paymentDueDate[i]));
                if (dStr >= todayStr) {
                  const val = investorCommissionCalc.monthlyBreakdown[i]?.investorCommission ?? 0;
                  if (val > 0) {
                    nextPaymentIndex = i;
                    break;
                  }
                }
              }
              if (nextPaymentIndex < 0) {
                const firstWithValue = investorCommissionCalc.monthlyBreakdown.findIndex((m) => (m.investorCommission ?? 0) > 0);
                if (firstWithValue >= 0) {
                  investorCommission = investorCommissionCalc.monthlyBreakdown[firstWithValue].investorCommission ?? 0;
                }
              } else if (investorCommissionCalc.monthlyBreakdown[nextPaymentIndex]) {
                investorCommission = investorCommissionCalc.monthlyBreakdown[nextPaymentIndex].investorCommission ?? 0;
              }
            }

            // Comissão do assessor já vem de investorCommissionCalc (mesmo cálculo do export de Minhas Comissões)
          } catch (error) {
            console.error(`[DETALHES] Erro ao calcular comissões para investimento ${investment.id}:`, error);
            // Fallback para cálculo simples se houver erro
            investorCommission = Number(investment.amount) * investorRate;
            advisorCommission = Number(investment.amount) * advisorRate;
            officeCommission = Number(investment.amount) * 0.01; // fallback 1% escritório
          }

          return {
            ...investment,
            investorRate,
            advisorRate,
            investorCommission,
            advisorCommission,
            officeCommission,
          };
        })
      );

      // Agrupar investimentos por investidor
      const investmentsByInvestor: Record<string, {
        total: number;
        investments: typeof investmentsWithCommissions;
        latestPaymentDate: string | null;
        liquidity: string | null;
        period: number | null;
        totalInvestorCommission: number;
        totalAdvisorCommission: number;
        totalOfficeCommission: number;
      }> = {};

      investmentsWithCommissions.forEach((inv) => {
        if (!investmentsByInvestor[inv.user_id]) {
          investmentsByInvestor[inv.user_id] = {
            total: 0,
            investments: [],
            latestPaymentDate: null,
            liquidity: null,
            period: null,
            totalInvestorCommission: 0,
            totalAdvisorCommission: 0,
            totalOfficeCommission: 0,
          };
        }
        investmentsByInvestor[inv.user_id].total += Number(inv.amount);
        investmentsByInvestor[inv.user_id].investments.push(inv);
        investmentsByInvestor[inv.user_id].totalInvestorCommission += inv.investorCommission;
        investmentsByInvestor[inv.user_id].totalAdvisorCommission += inv.advisorCommission;
        investmentsByInvestor[inv.user_id].totalOfficeCommission += inv.officeCommission;
        
        // Pegar a data de depósito mais recente
        if (inv.payment_date) {
          const invDate = new Date(inv.payment_date);
          const latestDate = investmentsByInvestor[inv.user_id].latestPaymentDate;
          const currentDate = latestDate ? new Date(latestDate) : null;
          if (!currentDate || invDate > currentDate) {
            investmentsByInvestor[inv.user_id].latestPaymentDate = inv.payment_date;
            investmentsByInvestor[inv.user_id].liquidity = inv.profitability_liquidity;
            investmentsByInvestor[inv.user_id].period = inv.commitment_period;
          }
        }
      });

      // Calcular total arrecadado e comissões por assessor diretamente dos investimentos (fonte da verdade)
      const investmentsByAssessor: Record<string, number> = {};
      const comissaoByAssessor: Record<string, { advisor: number; office: number }> = {};
      assessores.forEach((a) => {
        investmentsByAssessor[a.id] = 0;
        comissaoByAssessor[String(a.id)] = { advisor: 0, office: 0 };
      });
      investmentsWithCommissions.forEach((inv) => {
        const investorProfile = investorProfilesWithType.find((p) => p.id === inv.user_id);
        const advisorId = investorProfile?.parent_id;
        const advisorKey = advisorId ? String(advisorId) : null;
        if (advisorKey && comissaoByAssessor[advisorKey]) {
          comissaoByAssessor[advisorKey].advisor += Number(inv.advisorCommission) || 0;
          comissaoByAssessor[advisorKey].office += Number(inv.officeCommission) || 0;
        }
      });
      // Recalcular total arrecadado por assessor (soma dos investimentos)
      assessores.forEach((assessor) => {
        const assessorInvestors = investorProfilesWithType.filter(
          (investor) => investor.parent_id === assessor.id
        );
        const total = assessorInvestors.reduce((sum, investor) => {
          return sum + (investmentsByInvestor[investor.id]?.total || 0);
        }, 0);
        investmentsByAssessor[assessor.id] = total;
        console.log(`[DETALHES] Assessor ${assessor.full_name} (${assessor.id}): ${assessorInvestors.length} investidores, Total: R$ ${total.toFixed(2)}`);
      });

      // Também buscar investidores vinculados diretamente ao escritório (sem assessor)
      // Esses investidores devem ser contabilizados no total do escritório, mas não de um assessor específico
      const investorsWithoutAdvisor = investorProfilesWithType.filter(
        (investor) => {
          // Investidor vinculado diretamente ao escritório (office_id = escritorioId) e sem parent_id de assessor
          return investor.parent_id === null || !assessorIds.includes(investor.parent_id);
        }
      );
      
      console.log(`[DETALHES] Investidores sem assessor (vinculados diretamente ao escritório): ${investorsWithoutAdvisor.length}`);
      investorsWithoutAdvisor.forEach((investor) => {
        const total = investmentsByInvestor[investor.id]?.total || 0;
        console.log(`[DETALHES] Investidor ${investor.full_name} (${investor.id}): Total: R$ ${total.toFixed(2)} (sem assessor)`);
      });

      console.log(`[DETALHES] Total arrecadado por assessor:`, investmentsByAssessor);

      // Buscar nomes dos assessores para os investidores
      const assessoresMap = new Map(assessores.map((a) => [a.id, a.full_name || a.email]));

      // Adicionar dados completos aos investidores
      const investorsComTotal = investorProfilesWithType.map((investor) => {
        const investorData = investmentsByInvestor[investor.id];
        return {
        ...investor,
          totalInvestido: investorData?.total || 0,
        assessorNome: investor.parent_id ? assessoresMap.get(investor.parent_id) || "-" : "-",
          paymentDate: investorData?.latestPaymentDate || null,
          liquidity: investorData?.liquidity || null,
          period: investorData?.period || null,
          investorCommission: investorData?.totalInvestorCommission || 0,
          advisorCommission: investorData?.totalAdvisorCommission || 0,
          officeCommission: investorData?.totalOfficeCommission || 0,
        };
      });

      // Agrupar investidores por assessor (antes de assessoresComTotal)
      const investorsByAssessorMap: Record<string, any[]> = {};
      investorsComTotal.forEach((investor) => {
        const assessorId = investor.parent_id || "sem_assessor";
        if (!investorsByAssessorMap[assessorId]) {
          investorsByAssessorMap[assessorId] = [];
        }
        investorsByAssessorMap[assessorId].push(investor);
      });

      // Usar comissões calculadas diretamente dos investimentos (comissaoByAssessor)
      const assessoresComTotal = assessorProfilesWithType.map((assessor) => {
        const totalArrecadado = investmentsByAssessor[assessor.id] || 0;
        const comm = comissaoByAssessor[String(assessor.id)] || { advisor: 0, office: 0 };
        return {
          ...assessor,
          totalArrecadado,
          comissaoAssessor: comm.advisor,
          comissaoEscritorio: comm.office,
        };
      });

      console.log(`[DETALHES] Finalizando busca de detalhes:`);
      console.log(`[DETALHES] - Assessores: ${assessoresComTotal.length}`);
      console.log(`[DETALHES] - Investidores: ${investorsComTotal.length}`);
      console.log(`[DETALHES] - Investimentos processados: ${investmentsWithCommissions.length}`);
      console.log(`[DETALHES] - Investimentos por investidor:`, Object.keys(investmentsByInvestor).length);

      setEscritorioAssessores(assessoresComTotal);
      setEscritorioInvestors(investorsComTotal);

      // Agrupar investimentos por investidor para o accordion
      const investmentsByInvestorMap: Record<string, any[]> = {};
      investmentsWithCommissions.forEach((inv) => {
        if (!investmentsByInvestorMap[inv.user_id]) {
          investmentsByInvestorMap[inv.user_id] = [];
        }
        const investor = investorProfilesWithType.find((i) => i.id === inv.user_id);
        investmentsByInvestorMap[inv.user_id].push({
          ...inv,
          investorName: investor?.full_name || "-",
          investorEmail: investor?.email || "-",
        });
      });
      setInvestmentsByInvestor(investmentsByInvestorMap);
      setTotalInvestments(investmentsWithCommissions.length);
      setInvestorsByAssessor(investorsByAssessorMap);
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar detalhes do escritório",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">Dashboard do Distribuidor</h1>
        <p className="text-white/80 mb-6">
          Gerencie seus escritórios e acompanhe sua rentabilidade
        </p>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10">
            <Building2 className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-white">Total de Escritórios</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-white">{totalStats.totalEscritorios}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10">
            <DollarSign className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-white">Total Investido</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-[#00BC6E]">{formatCurrency(totalStats.totalInvested)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10">
            <TrendingUp className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-white">Comissão Total</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-[#00BC6E]">{formatCurrency(totalStats.totalCommission)}</div>
            <p className="text-xs text-white/70 mt-1">Sobre escritórios</p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal */}
      <div className="space-y-6">
          <Card className="bg-[#01223F] border-[#003562] shadow-lg">
        <CardHeader className="bg-[#003562] border-b border-[#003562] pt-2 !pb-0 px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-white text-lg mb-0">Meus Escritórios</CardTitle>
              <CardDescription className="text-gray-400 text-sm mt-0.5">
                Escritórios vinculados ao seu distribuidor
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => { window.location.href = "/users/create"; }}
                className="bg-[#00BC6E] text-white hover:bg-[#00BC6E]/80"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Escritório
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar escritórios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 h-9 bg-[#01223F] border-[#003562] text-white placeholder:text-gray-500 focus:border-[#00BC6E] focus:ring-[#00BC6E]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="bg-[#01223F]">
          {loadingEscritorios ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#00BC6E]" />
            </div>
          ) : filteredEscritorios.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum escritório encontrado. Crie seu primeiro escritório para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#003562] border-[#003562] hover:bg-[#003562]">
                  <TableHead className="text-white font-semibold">Escritório</TableHead>
                  <TableHead className="text-white font-semibold">CPF/CNPJ</TableHead>
                  <TableHead className="text-white font-semibold">Total Investido</TableHead>
                  <TableHead className="text-white font-semibold">Comissão</TableHead>
                  <TableHead className="text-white font-semibold">Assessores</TableHead>
                  <TableHead className="text-white font-semibold">Investidores</TableHead>
                  <TableHead className="text-white font-semibold">Status</TableHead>
                  <TableHead className="text-white font-semibold">Cadastrado em</TableHead>
                  <TableHead className="text-white font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEscritorios.map((escritorio) => (
                  <TableRow key={escritorio.id} className="bg-[#01223F] border-[#003562] hover:bg-[#003562]">
                    <TableCell className="text-white">
                      <div>
                        <div className="font-medium text-white">{escritorio.name}</div>
                        <div className="text-sm text-gray-400">{escritorio.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {escritorio.cnpj ? formatCpfCnpj(escritorio.cnpj) : "-"}
                    </TableCell>
                    <TableCell className="font-medium text-[#00BC6E]">
                      {formatCurrency(escritorio.totalInvested)}
                    </TableCell>
                    <TableCell className="font-medium text-[#00BC6E]">
                      {formatCurrency(escritorio.totalCommission)}
                    </TableCell>
                    <TableCell className="text-gray-300">{escritorio.assessoresCount}</TableCell>
                    <TableCell className="text-gray-300">{escritorio.investorsCount}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={escritorio.status === "active" ? "default" : "secondary"}
                        className={escritorio.status === "active" 
                          ? "bg-[#00BC6E] text-white hover:bg-[#00BC6E]/90" 
                          : "bg-gray-600 text-white"
                        }
                      >
                        {escritorio.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatDateUTC(escritorio.joinedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(escritorio)}
                        className="flex items-center gap-2 bg-[#003562] border-[#003562] text-white hover:bg-[#00BC6E] hover:border-[#00BC6E]"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
          </Card>

           {/* Modal de Detalhes do Escritório */}
           <Dialog 
             open={isDetailsModalOpen} 
             onOpenChange={(open) => {
               // Não fechar o modal de detalhes se o PDFViewer ou ReceiptViewer estiver aberto
               if (!open && (viewingContract || viewingReceipt)) {
                 return;
               }
               setIsDetailsModalOpen(open);
             }}
           >
             <DialogContent className="!max-w-[95vw] !w-[95vw] !max-h-[95vh] h-[95vh] overflow-y-auto flex flex-col bg-[#01223F] border-[#003562] text-white">
               <DialogHeader className="flex-shrink-0">
                 <DialogTitle className="text-white text-xl font-bold">Detalhes do Escritório: {selectedEscritorio?.name}</DialogTitle>
                 <DialogDescription className="text-gray-400">
                   Assessores e investidores vinculados a este escritório
                 </DialogDescription>
               </DialogHeader>

               {loadingDetails ? (
                 <div className="flex items-center justify-center py-8 flex-1">
                   <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                 </div>
               ) : (
                 <div className="w-full flex flex-col flex-1 min-h-0">
                   {/* Cabeçalho com informações do escritório */}
                   <div className="bg-[#003562] border border-[#003562] rounded-lg p-4 mb-4 flex-shrink-0">
                     <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                       <div>
                         <p className="text-gray-400 text-xs mb-1">Total de Assessores</p>
                         <p className="text-white text-lg font-semibold">{escritorioAssessores.length}</p>
                       </div>
                       <div>
                         <p className="text-gray-400 text-xs mb-1">Total de Investidores</p>
                         <p className="text-white text-lg font-semibold">{escritorioInvestors.length}</p>
                       </div>
                       <div>
                         <p className="text-gray-400 text-xs mb-1">Nº de Investimentos</p>
                         <p className="text-white text-lg font-semibold">{totalInvestments}</p>
                       </div>
                       <div>
                         <p className="text-gray-400 text-xs mb-1">Total Captado</p>
                         <p className="text-[#00BC6E] text-lg font-semibold">
                           {formatCurrency(
                             escritorioAssessores.reduce((sum, a) => sum + (a.totalArrecadado || 0), 0)
                           )}
                         </p>
                       </div>
                       <div>
                         <p className="text-gray-400 text-xs mb-1">Próxima Comissão Escritório</p>
                         <p className="text-[#00BC6E] text-lg font-semibold">
                           {formatCurrency(
                             escritorioAssessores.reduce((sum, a) => sum + (a.comissaoEscritorio || 0), 0)
                           )}
                         </p>
                       </div>
                       <div>
                         <p className="text-gray-400 text-xs mb-1">Comissão Total Escritório</p>
                         <p className="text-blue-400 text-lg font-semibold">
                           {formatCurrency(
                             escritorioInvestors.reduce((sum, inv) => sum + (inv.officeCommission || 0), 0)
                           )}
                         </p>
                       </div>
                     </div>
                   </div>

                   {/* Lista de Assessores com Investidores */}
                   <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                     {escritorioAssessores.length === 0 ? (
                       <div className="text-center py-8 text-gray-400">
                         <p className="text-sm">Nenhum assessor vinculado a este escritório.</p>
                       </div>
                     ) : (
                       <div className="border border-[#003562] rounded-lg bg-[#003562] overflow-x-auto">
                         <Table>
                           <TableHeader className="sticky top-0 z-30 bg-[#003562] border-b border-[#003562] shadow-sm">
                               <TableRow className="border-[#003562] hover:bg-[#003562]">
                                 <TableHead className="text-white font-semibold w-12 bg-[#003562]"></TableHead>
                                 <TableHead className="text-white font-semibold bg-[#003562]">Nome</TableHead>
                                 <TableHead className="text-white font-semibold bg-[#003562]">Investidores</TableHead>
                                 <TableHead className="text-white font-semibold bg-[#003562]">Investimentos</TableHead>
                                <TableHead className="text-white font-semibold bg-[#003562]">Total Arrecadado</TableHead>
                                <TableHead className="text-white font-semibold bg-[#003562]">Próxima Comissão Assessor</TableHead>
                                <TableHead className="text-white font-semibold bg-[#003562]">Próxima Comissão Escritório</TableHead>
                                <TableHead className="text-white font-semibold bg-[#003562]">Cadastrado em</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                               {escritorioAssessores.map((assessor) => {
                                 const isAssessorExpanded = expandedAssessores.has(assessor.id);
                                 const assessorInvestors = investorsByAssessor[assessor.id] || [];
                                 const assessorInvestmentsCount = assessorInvestors.reduce((sum, inv) => {
                                   return sum + (investmentsByInvestor[inv.id]?.length || 0);
                                 }, 0);
                                 const hasInvestors = assessorInvestors.length > 0;
                                 
                                 return (
                                   <React.Fragment key={assessor.id}>
                                     <TableRow 
                                       className={`border-[#003562] hover:bg-[#01223F] ${hasInvestors ? 'cursor-pointer' : ''}`}
                                       onClick={() => {
                                         if (!hasInvestors) return;
                                         setExpandedAssessores(prev => {
                                           const newSet = new Set(prev);
                                           if (newSet.has(assessor.id)) {
                                             newSet.delete(assessor.id);
                                           } else {
                                             newSet.add(assessor.id);
                                           }
                                           return newSet;
                                         });
                                       }}
                                     >
                                       <TableCell className="w-12">
                                         {hasInvestors ? (
                                           isAssessorExpanded ? (
                                             <ChevronDown className="h-4 w-4 text-white" />
                                           ) : (
                                             <ChevronRight className="h-4 w-4 text-white" />
                                           )
                                         ) : null}
                                       </TableCell>
                                       <TableCell className="font-medium text-white">{assessor.full_name || "-"}</TableCell>
                                       <TableCell className="text-white font-medium">{assessorInvestors.length}</TableCell>
                                       <TableCell className="text-white font-medium">{assessorInvestmentsCount}</TableCell>
                                       <TableCell className="font-medium text-[#00BC6E]">
                                  {formatCurrency(assessor.totalArrecadado || 0)}
                                </TableCell>
                                       <TableCell className="font-medium text-[#00BC6E]">
                                         {formatCurrency(assessor.comissaoAssessor ?? 0)}
                                       </TableCell>
                                       <TableCell className="font-medium text-amber-400">
                                         {formatCurrency(assessor.comissaoEscritorio ?? 0)}
                                       </TableCell>
                                       <TableCell className="text-gray-300">
                                  {formatDateUTC(assessor.created_at)}
                                </TableCell>
                              </TableRow>
                                     {isAssessorExpanded && assessorInvestors.length > 0 && (
                                       <TableRow className="bg-[#01223F]">
                                         <TableCell colSpan={8} className="p-0">
                                           <div className="px-4 py-3 bg-[#01223F]">
                                             <div className="text-sm font-semibold text-white mb-3">
                                               Investidores de {assessor.full_name} ({assessorInvestors.length})
                      </div>
                                             <Table>
                                               <TableHeader>
                                                 <TableRow className="border-[#003562] hover:bg-[#003562]">
                                                   <TableHead className="text-gray-300 font-semibold text-xs w-12"></TableHead>
                                                   <TableHead className="text-gray-300 font-semibold text-xs">Nome</TableHead>
                                                   <TableHead className="text-gray-300 font-semibold text-xs">Investimentos</TableHead>
                                                   <TableHead className="text-gray-300 font-semibold text-xs">Total Investido</TableHead>
                                                   <TableHead className="text-gray-300 font-semibold text-xs">Comissão do Investidor</TableHead>
                                                   <TableHead className="text-gray-300 font-semibold text-xs">Comissão do Assessor</TableHead>
                                                   <TableHead className="text-gray-300 font-semibold text-xs">Comissão do Escritório</TableHead>
                                                 </TableRow>
                                               </TableHeader>
                                               <TableBody>
                                                 {assessorInvestors.map((investor: any) => {
                                                   const isInvestorExpanded = expandedInvestors.has(investor.id);
                                                   const investorInvestments = investmentsByInvestor[investor.id] || [];
                                                   const hasInvestments = investorInvestments.length > 0;
                                                   
                                                   return (
                                                     <React.Fragment key={investor.id}>
                                                       <TableRow 
                                                         className={`border-[#003562] hover:bg-[#003562] ${hasInvestments ? 'cursor-pointer' : ''}`}
                                                         onClick={(e) => {
                                                           e.stopPropagation();
                                                           if (!hasInvestments) return;
                                                           setExpandedInvestors(prev => {
                                                             const newSet = new Set(prev);
                                                             if (newSet.has(investor.id)) {
                                                               newSet.delete(investor.id);
                                                             } else {
                                                               newSet.add(investor.id);
                                                             }
                                                             return newSet;
                                                           });
                                                         }}
                                                       >
                                                         <TableCell className="w-12">
                                                           {hasInvestments ? (
                                                             isInvestorExpanded ? (
                                                               <ChevronDown className="h-4 w-4 text-white" />
                                                             ) : (
                                                               <ChevronRight className="h-4 w-4 text-white" />
                                                             )
                                                           ) : null}
                                                         </TableCell>
                                                         <TableCell className="text-white text-sm font-medium">{investor.full_name || "-"}</TableCell>
                                                         <TableCell className="text-white text-sm font-medium">{investorInvestments.length}</TableCell>
                                                         <TableCell className="text-[#00BC6E] text-sm font-medium">
                                                           {formatCurrency(investor.totalInvestido || 0)}
                                                         </TableCell>
                                                         <TableCell className="text-[#00BC6E] text-sm font-medium">
                                                           {formatCurrency(investor.investorCommission || 0)}
                                                         </TableCell>
                                                       <TableCell className="text-blue-400 text-sm font-medium">
                                                         {formatCurrency(Number(investor.advisorCommission) || 0)}
                                                       </TableCell>
                                                       <TableCell className="text-amber-400 text-sm font-medium">
                                                         {formatCurrency(Number(investor.officeCommission) || 0)}
                                                       </TableCell>
                                                       </TableRow>
                                                       {isInvestorExpanded && investorInvestments.length > 0 && (
                                                         <TableRow className="bg-[#01223F]">
                                                           <TableCell colSpan={6} className="p-0">
                                                             <div className="px-4 py-3 bg-[#01223F]">
                                                               <div className="text-xs font-semibold text-white mb-2">
                                                                 Investimentos de {investor.full_name} ({investorInvestments.length})
                                                               </div>
                         <Table>
                          <TableHeader>
                                                                   <TableRow className="border-[#003562] hover:bg-[#003562]">
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Valor</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Data de Depósito</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Liquidez</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Prazo</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Taxa</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Comissão do Investidor</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Comissão do Assessor</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Comissão do Escritório</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Ver Contrato</TableHead>
                                                                     <TableHead className="text-gray-300 font-semibold text-xs">Comprovantes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                                                                   {investorInvestments.map((investment: any) => (
                                                                     <TableRow key={investment.id} className="border-[#003562] hover:bg-[#003562]">
                                                                       <TableCell className="text-[#00BC6E] text-xs font-medium">
                                                                         {formatCurrency(Number(investment.amount) || 0)}
                                                                       </TableCell>
                                                                       <TableCell className="text-gray-300 text-xs">
                                                                         {formatDateUTC(investment.payment_date)}
                                </TableCell>
                                <TableCell>
                                                                         {investment.profitability_liquidity ? (
                                                                           <Badge className="bg-[#00BC6E] text-white text-xs">
                                                                             {investment.profitability_liquidity}
                                                                           </Badge>
                                                                         ) : (
                                                                           <span className="text-gray-400 text-xs">-</span>
                                                                         )}
                                                                       </TableCell>
                                                                       <TableCell className="text-gray-300 text-xs">
                                                                         {investment.commitment_period ? `${investment.commitment_period} meses` : "-"}
                                                                       </TableCell>
                                                                       <TableCell className="text-[#00BC6E] text-xs font-medium">
                                                                         {investment.investorRate !== undefined 
                                                                           ? `${(investment.investorRate * 100).toFixed(2)}%`
                                                                           : "-"}
                                                                       </TableCell>
                                                                       <TableCell className="text-[#00BC6E] text-xs font-medium">
                                                                         {formatCurrency(investment.investorCommission || 0)}
                                                                       </TableCell>
                                                                       <TableCell className="text-blue-400 text-xs font-medium">
                                                                         {formatCurrency(investment.advisorCommission || 0)}
                                                                       </TableCell>
                                                                       <TableCell className="text-amber-400 text-xs font-medium">
                                                                         {formatCurrency(investment.officeCommission || 0)}
                                                                       </TableCell>
                                                                       <TableCell>
                                                                         <Button
                                                                           variant="ghost"
                                                                           size="sm"
                                                                           className="h-7 px-2 text-xs text-[#00BC6E] hover:text-[#00BC6E] hover:bg-[#00BC6E]/10"
                                                                           disabled={loadingContract === investment.id}
                                                                           onClick={async (e) => {
                                                                             e.stopPropagation();
                                                                             setLoadingContract(investment.id);
                                                                             try {
                                                                               const response = await fetch(`/api/contracts?investorId=${investment.user_id}&investmentId=${investment.id}`);
                                                                               const result = await response.json();
                                                                               if (result.success && result.data && result.data.length > 0) {
                                                                                 const contract = result.data[0];
                                                                                 setViewingContract({
                                                                                   id: contract.id,
                                                                                   file_name: contract.file_name,
                                                                                   file_type: contract.file_type,
                                                                                 });
                                                                               } else {
                                                                                 toast({
                                                                                   title: "Sem contrato",
                                                                                   description: "Nenhum contrato encontrado para este investimento.",
                                                                                   variant: "default",
                                                                                 });
                                                                               }
                                                                             } catch (error) {
                                                                               console.error("Erro ao buscar contrato:", error);
                                                                               toast({
                                                                                 title: "Erro",
                                                                                 description: "Erro ao buscar contrato.",
                                                                                 variant: "destructive",
                                                                               });
                                                                             } finally {
                                                                               setLoadingContract(null);
                                                                             }
                                                                           }}
                                                                         >
                                                                           {loadingContract === investment.id ? (
                                                                             <>
                                                                               <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                               Carregando...
                                                                             </>
                                                                           ) : (
                                                                             <>
                                                                               <FileText className="h-3 w-3 mr-1" />
                                                                               Contrato
                                                                             </>
                                                                           )}
                                                                         </Button>
                                                                       </TableCell>
                                                                       <TableCell>
                                                                         <Button
                                                                           variant="ghost"
                                                                           size="sm"
                                                                           className="h-7 px-2 text-xs text-blue-400 hover:text-blue-400 hover:bg-blue-400/10"
                                                                           disabled={loadingReceipt === investment.id}
                                                                           onClick={async (e) => {
                                                                             e.stopPropagation();
                                                                             setLoadingReceipt(investment.id);
                                                                             try {
                                                                               const response = await fetch(`/api/pix-receipts?transactionId=${investment.id}`);
                                                                               const result = await response.json();
                                                                               if (result.success && result.data && result.data.length > 0) {
                                                                                 const receipt = result.data[0];
                                                                                 setViewingReceipt({
                                                                                   id: receipt.id,
                                                                                   file_name: receipt.file_name,
                                                                                   file_type: receipt.file_type,
                                                                                   file_size: receipt.file_size,
                                                                                   status: receipt.status as 'pending' | 'approved' | 'rejected',
                                                                                   created_at: receipt.created_at,
                                                                                 });
                                                                               } else {
                                                                                 toast({
                                                                                   title: "Sem comprovante",
                                                                                   description: "Nenhum comprovante encontrado para este investimento.",
                                                                                   variant: "default",
                                                                                 });
                                                                               }
                                                                             } catch (error) {
                                                                               console.error("Erro ao buscar comprovante:", error);
                                                                               toast({
                                                                                 title: "Erro",
                                                                                 description: "Erro ao buscar comprovante.",
                                                                                 variant: "destructive",
                                                                               });
                                                                             } finally {
                                                                               setLoadingReceipt(null);
                                                                             }
                                                                           }}
                                                                         >
                                                                           {loadingReceipt === investment.id ? (
                                                                             <>
                                                                               <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                               Carregando...
                                                                             </>
                                                                           ) : (
                                                                             <>
                                                                               <Receipt className="h-3 w-3 mr-1" />
                                                                               Ver
                                                                             </>
                                                                           )}
                                                                         </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                                                           </TableCell>
                                                         </TableRow>
                                                       )}
                                                     </React.Fragment>
                                                   );
                                                 })}
                                               </TableBody>
                                             </Table>
                                           </div>
                                         </TableCell>
                                       </TableRow>
                                     )}
                                   </React.Fragment>
                                 );
                               })}
                             </TableBody>
                           </Table>
                       </div>
                     )}
                   </div>
                 </div>
              )}
            </DialogContent>
          </Dialog>
      </div>

      {/* Modal de visualização de Contrato */}
      {viewingContract && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              pointerEvents: "auto",
            }}
            onClick={(e) => {
              // Se clicar no overlay (não no conteúdo), fechar apenas o PDFViewer
              if (e.target === e.currentTarget) {
                e.stopPropagation();
                e.preventDefault();
                setViewingContract(null);
              }
            }}
            onMouseDown={(e) => {
              // Prevenir que eventos de mouse fechem o modal de detalhes
              e.stopPropagation();
            }}
          >
            <div
              className="w-full max-w-7xl max-h-[90vh] flex items-center justify-center"
              style={{ pointerEvents: "auto" }}
              onClick={(e) => {
                // Prevenir propagação de cliques dentro do conteúdo
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                // Prevenir propagação de eventos de mouse
                e.stopPropagation();
              }}
            >
              <PDFViewer
                contractId={viewingContract.id}
                fileName={viewingContract.file_name}
                fileType={viewingContract.file_type}
                onClose={() => {
                  setViewingContract(null);
                  // Não fechar o modal de detalhes
                }}
              />
                  </div>
          </div>,
          document.body,
        )}

      {/* Modal de visualização de Comprovante */}
      {viewingReceipt && (
        <ReceiptViewer
          receipt={viewingReceipt}
          isOpen={!!viewingReceipt}
          onClose={() => {
            setViewingReceipt(null);
            // Não fechar o modal de detalhes
          }}
        />
      )}
    </div>
  );
}

