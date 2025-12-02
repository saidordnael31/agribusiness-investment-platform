"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

      // Buscar escritórios onde role == "escritorio" e parent_id = distribuidorId
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "escritorio")
        .eq("parent_id", distribuidorId)
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Erro ao buscar escritórios:", profilesError);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setMyEscritorios([]);
        return;
      }

      const escritorioIds = profiles.map((p) => p.id);

      // SIMPLIFICADO: Buscar assessores usando distributor_id
      const { data: assessores, error: assessoresError } = await supabase
        .from("profiles")
        .select("id, parent_id, office_id, user_type, role, distributor_id")
        .eq("user_type", "distributor")
        .eq("role", "assessor")
        .eq("distributor_id", distribuidorId);

      if (assessoresError) {
        console.error("Erro ao buscar assessores:", assessoresError);
      }

      console.log(`[DISTRIBUIDOR] Escritórios encontrados: ${profiles.length}`);
      console.log(`[DISTRIBUIDOR] IDs dos escritórios:`, escritorioIds);
      console.log(`[DISTRIBUIDOR] Total de assessores: ${assessores?.length || 0}`);

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
      const assessoresByEscritorio = (assessores || []).reduce<Record<string, number>>(
        (acc, assessor) => {
          const escritorioId = assessor.office_id || assessor.parent_id;
          if (escritorioId && escritorioIds.includes(escritorioId)) {
            acc[escritorioId] = (acc[escritorioId] || 0) + 1;
          }
          return acc;
        },
        {}
      );

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

        // Comissão do distribuidor: 1% sobre o total investido
        const totalCommission = totalInvested * 0.01;
        
        console.log(`[DISTRIBUIDOR] Escritório ${profile.full_name} - Comissão (1%): R$ ${totalCommission}`);

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

  const handleViewDetails = async (escritorio: Escritorio) => {
    setSelectedEscritorio(escritorio);
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    
    try {
      const supabase = createClient();
      const escritorioId = escritorio.id;

      // Buscar assessores do escritório (por office_id ou parent_id)
      const { data: assessoresByOffice, error: assessoresByOfficeError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, cnpj, created_at")
        .eq("user_type", "distributor")
        .eq("role", "assessor")
        .eq("office_id", escritorioId);

      const { data: assessoresByParent, error: assessoresByParentError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, cnpj, created_at")
        .eq("user_type", "distributor")
        .eq("role", "assessor")
        .eq("parent_id", escritorioId);

      // Combinar e remover duplicatas
      const allAssessores = [
        ...(assessoresByOffice || []),
        ...(assessoresByParent || [])
      ];
      const assessores = allAssessores.filter((assessor, index, self) =>
        index === self.findIndex(a => a.id === assessor.id)
      );

      if (assessoresByOfficeError || assessoresByParentError) {
        console.error("Erro ao buscar assessores:", assessoresByOfficeError || assessoresByParentError);
        toast({
          title: "Erro",
          description: "Erro ao buscar assessores do escritório",
          variant: "destructive",
        });
      }

      // Buscar investidores do escritório (diretamente ou via assessores)
      const assessorIds = assessores.map((a) => a.id);
      
      // Investidores diretamente vinculados ao escritório
      const { data: investorsByOffice, error: investorsByOfficeError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, cnpj, created_at, parent_id")
        .eq("user_type", "investor")
        .eq("office_id", escritorioId);

      // Investidores vinculados via assessores
      let investorsByAssessor: any[] = [];
      if (assessorIds.length > 0) {
        const { data: investorsByAssessorData, error: investorsByAssessorError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, cnpj, created_at, parent_id")
          .eq("user_type", "investor")
          .in("parent_id", assessorIds);

        if (!investorsByAssessorError) {
          investorsByAssessor = investorsByAssessorData || [];
        }
      }

      // Combinar e remover duplicatas
      const allInvestors = [
        ...(investorsByOffice || []),
        ...investorsByAssessor
      ];
      const uniqueInvestors = allInvestors.filter((investor, index, self) =>
        index === self.findIndex(i => i.id === investor.id)
      );

      const investorIds = uniqueInvestors.map((i) => i.id);

      // Buscar investimentos ativos dos investidores
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
        }
      }

      // Calcular total arrecadado por investidor
      const investmentsByInvestor = investments.reduce<Record<string, number>>(
        (acc, investment) => {
          const amount = Number(investment.amount) || 0;
          const userId = investment.user_id;
          acc[userId] = (acc[userId] || 0) + amount;
          return acc;
        },
        {}
      );

      // Calcular total arrecadado por assessor (soma dos investimentos dos seus investidores)
      const investmentsByAssessor: Record<string, number> = {};
      assessores.forEach((assessor) => {
        const assessorInvestors = uniqueInvestors.filter(
          (investor) => investor.parent_id === assessor.id
        );
        const total = assessorInvestors.reduce((sum, investor) => {
          return sum + (investmentsByInvestor[investor.id] || 0);
        }, 0);
        investmentsByAssessor[assessor.id] = total;
      });

      // Adicionar total arrecadado aos assessores
      const assessoresComTotal = assessores.map((assessor) => ({
        ...assessor,
        totalArrecadado: investmentsByAssessor[assessor.id] || 0,
      }));

      // Buscar nomes dos assessores para os investidores
      const assessoresMap = new Map(assessores.map((a) => [a.id, a.full_name || a.email]));

      // Adicionar total investido e assessor aos investidores
      const investorsComTotal = uniqueInvestors.map((investor) => ({
        ...investor,
        totalInvestido: investmentsByInvestor[investor.id] || 0,
        assessorNome: investor.parent_id ? assessoresMap.get(investor.parent_id) || "-" : "-",
      }));

      setEscritorioAssessores(assessoresComTotal);
      setEscritorioInvestors(investorsComTotal);
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
            <CardTitle className="text-sm font-medium text-white">Comissão Total (1%)</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-[#00BC6E]">{formatCurrency(totalStats.totalCommission)}</div>
            <p className="text-xs text-white/70 mt-1">Sobre escritórios</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="escritorios" className="text-sm">
            Meus Escritórios
          </TabsTrigger>
          <TabsTrigger value="criar" className="text-sm">
            Criar Escritório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escritorios">
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meus Escritórios</CardTitle>
              <CardDescription>
                Escritórios vinculados ao seu distribuidor
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar escritórios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEscritorios ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEscritorios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum escritório encontrado. Crie seu primeiro escritório para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Escritório</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Total Investido</TableHead>
                  <TableHead>Comissão (1%)</TableHead>
                  <TableHead>Assessores</TableHead>
                  <TableHead>Investidores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEscritorios.map((escritorio) => (
                  <TableRow key={escritorio.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{escritorio.name}</div>
                        <div className="text-sm text-muted-foreground">{escritorio.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {escritorio.cnpj ? formatCpfCnpj(escritorio.cnpj) : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(escritorio.totalInvested)}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(escritorio.totalCommission)}
                    </TableCell>
                    <TableCell>{escritorio.assessoresCount}</TableCell>
                    <TableCell>{escritorio.investorsCount}</TableCell>
                    <TableCell>
                      <Badge variant={escritorio.status === "active" ? "default" : "secondary"}>
                        {escritorio.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(escritorio.joinedAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(escritorio)}
                        className="flex items-center gap-2"
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
           <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
             <DialogContent className="!max-w-[95vw] !w-[95vw] !max-h-[95vh] h-[95vh] overflow-y-auto flex flex-col">
               <DialogHeader className="flex-shrink-0">
                 <DialogTitle>Detalhes do Escritório: {selectedEscritorio?.name}</DialogTitle>
                 <DialogDescription>
                   Assessores e investidores vinculados a este escritório
                 </DialogDescription>
               </DialogHeader>

               {loadingDetails ? (
                 <div className="flex items-center justify-center py-8 flex-1">
                   <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                 </div>
               ) : (
                 <Tabs defaultValue="assessores" className="w-full flex flex-col flex-1 min-h-0">
                   <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                     <TabsTrigger value="assessores">
                       Assessores ({escritorioAssessores.length})
                     </TabsTrigger>
                     <TabsTrigger value="investidores">
                       Investidores ({escritorioInvestors.length})
                     </TabsTrigger>
                   </TabsList>

                   <TabsContent value="assessores" className="mt-4 flex-1 min-h-0 overflow-auto">
                     {escritorioAssessores.length === 0 ? (
                       <div className="text-center py-8 text-muted-foreground">
                         <p className="text-sm">Nenhum assessor vinculado a este escritório.</p>
                       </div>
                     ) : (
                       <div className="border rounded-lg">
                         <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Total Arrecadado</TableHead>
                              <TableHead>Cadastrado em</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {escritorioAssessores.map((assessor) => (
                              <TableRow key={assessor.id}>
                                <TableCell className="font-medium">{assessor.full_name || "-"}</TableCell>
                                <TableCell className="font-medium text-green-600">
                                  {formatCurrency(assessor.totalArrecadado || 0)}
                                </TableCell>
                                <TableCell>
                                  {new Date(assessor.created_at).toLocaleDateString("pt-BR")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                   <TabsContent value="investidores" className="mt-4 flex-1 min-h-0 overflow-auto">
                     {escritorioInvestors.length === 0 ? (
                       <div className="text-center py-8 text-muted-foreground">
                         <p className="text-sm">Nenhum investidor vinculado a este escritório.</p>
                       </div>
                     ) : (
                       <div className="border rounded-lg">
                         <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Assessor</TableHead>
                              <TableHead>Total Investido</TableHead>
                              <TableHead>Cadastrado em</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {escritorioInvestors.map((investor) => (
                              <TableRow key={investor.id}>
                                <TableCell className="font-medium">{investor.full_name || "-"}</TableCell>
                                <TableCell>{investor.assessorNome || "-"}</TableCell>
                                <TableCell className="font-medium text-green-600">
                                  {formatCurrency(investor.totalInvestido || 0)}
                                </TableCell>
                                <TableCell>
                                  {new Date(investor.created_at).toLocaleDateString("pt-BR")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="criar">
          <Card className="border border-[#C7F3E1] bg-[#E9FBF5] shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#064E3B] text-xl font-semibold">
                <UserPlus className="w-5 h-5" />
                Criar Novo Escritório
              </CardTitle>
              <CardDescription className="text-[#047857]/80">
                Preencha os dados do escritório que será vinculado ao seu distribuidor.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateEscritorio();
                }}
                className="max-w-full space-y-6"
              >
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    {REGISTRATION_STEPS.map((step, index) => {
                      const isActive = index === currentStep;
                      const isCompleted = index < currentStep;

                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                            isActive
                              ? "border-[#047857] bg-white text-[#064E3B] shadow-sm"
                              : isCompleted
                              ? "border-[#A7F3D0] bg-[#DCFCE7] text-[#047857]"
                              : "border-transparent bg-transparent text-slate-500"
                          }`}
                        >
                          <span className="font-semibold">{index + 1}</span>
                          <span>{step}</span>
                        </div>
                      );
                    })}
                  </div>

                  {renderStepContent()}
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetEscritorioForm}
                      disabled={submittingEscritorio}
                      className="bg-transparent"
                    >
                      Limpar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePreviousStep}
                      disabled={currentStep === 0 || submittingEscritorio}
                    >
                      Voltar
                    </Button>
                  </div>
                  {currentStep === REGISTRATION_STEPS.length - 1 ? (
                    <Button type="submit" disabled={submittingEscritorio}>
                      {submittingEscritorio ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Criar Escritório
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleNextStep} disabled={submittingEscritorio}>
                      Avançar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

