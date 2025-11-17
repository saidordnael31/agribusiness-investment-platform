"use client";

import type React from "react";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Users,
  Trophy,
  UserPlus,
  Loader2,
  QrCode,
  Copy,
  Search,
  Award,
  UserCheck,
  Edit,
  FileText,
  Download,
  Eye,
  Check,
  X,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { CommissionSimulator } from "./commission-simulator";
import { SalesChart } from "./sales-chart";
import { ApproveInvestmentModal } from "./approve-investment-modal";
import { AdvisorCommissionsDetail } from "./advisor-commissions-detail";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvestmentSimulator } from "../investor/investment-simulator";
import { PDFViewer } from "../contracts/pdf-viewer";

const REGISTRATION_STEPS = ["Gerais", "Endereço", "Dados Bancários"];

const createEmptyInvestorForm = () => ({
  fullName: "",
  email: "",
  phone: "",
  cpf: "",
  rg: "",
  nationality: "",
  maritalStatus: "",
  profession: "",
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
  password: "",
  confirmPassword: "",
  investmentValue: "",
  rescueTerm: "",
  commitmentPeriod: "",
  liquidity: "",
  profitability: "",
});

interface UserData {
  id: string;
  name: string;
  email: string;
  user_type: string;
  role: string;
}

interface Investor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  totalInvested: number;
  status: string;
  joinedAt: string;
  lastActivity: string;
  address?: string;
  rg?: string;
  nationality?: string;
  maritalStatus?: string;
  profession?: string;
  pixKey?: string;
  user_type?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  advisorId?: string | null;
  advisorName?: string | null;
  advisorEmail?: string | null;
}

interface Advisor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  totalCaptured: number;
  status: string;
  joinedAt: string;
  lastActivity: string;
  investorsCount: number;
  address?: string;
  rg?: string;
  nationality?: string;
  maritalStatus?: string;
  profession?: string;
  pixKey?: string;
  user_type?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
}

interface QRCodeData {
  qrCode: string;
  paymentString: string;
  originalData: any;
}

interface Contract {
  id: string;
  contract_name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  status: string;
  created_at: string;
  uploaded_by: string;
  investor_id?: string;
  uploaded_by_profile?: {
    full_name: string;
    email: string;
  };
}

interface InvestorContractOverview {
  investorId: string;
  investorName: string;
  investorEmail?: string;
  contract: Contract;
}

interface Investment {
  id: string;
  amount: number;
  quota_type: string;
  monthly_return_rate: number;
  commitment_period: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function DistributorDashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [userOfficeId, setUserOfficeId] = useState<string | null>(null);
  const [myInvestors, setMyInvestors] = useState<Investor[]>([]);
  const [myAdvisors, setMyAdvisors] = useState<Advisor[]>([]);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchAdvisorTerm, setSearchAdvisorTerm] = useState("");

  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [userType, setUserType] = useState<"investor" | "advisor">("investor");
  const [investorForm, setInvestorForm] = useState(createEmptyInvestorForm());
  const [currentStep, setCurrentStep] = useState(0);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isBankListOpen, setIsBankListOpen] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("simulator");

  const resetInvestorForm = () => {
    setInvestorForm(createEmptyInvestorForm());
    setCurrentStep(0);
    setUserType(user?.role === "escritorio" ? "advisor" : "investor");
    setBankSearchTerm("");
    setIsBankListOpen(false);
  };

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

  const [submittingInvestor, setSubmittingInvestor] = useState(false);

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

  // Estados para edição de perfil
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Investor | Advisor | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cpf: "",
    rg: "",
    nationality: "",
    maritalStatus: "",
    profession: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    pixKey: "",
    bankName: "",
    bankBranch: "",
    bankAccount: "",
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editBankSearchTerm, setEditBankSearchTerm] = useState("");
  const [isEditBankListOpen, setIsEditBankListOpen] = useState(false);

  // Estados para contratos e investimentos
  const [userContracts, setUserContracts] = useState<Contract[]>([]);
  const [userInvestments, setUserInvestments] = useState<Investment[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingInvestments, setLoadingInvestments] = useState(false);
  const [contractsOverview, setContractsOverview] = useState<InvestorContractOverview[]>([]);
  const [loadingContractsOverview, setLoadingContractsOverview] = useState(false);
  const [contractsOverviewLoaded, setContractsOverviewLoaded] = useState(false);
  const [contractsOverviewError, setContractsOverviewError] = useState<string | null>(null);
  const [contractsSearchTerm, setContractsSearchTerm] = useState("");
  
  // Estados para visualização de contratos
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Estados para aprovação de investimentos
  const [approvingInvestment, setApprovingInvestment] = useState<string | null>(null);
  const [rejectingInvestment, setRejectingInvestment] = useState<string | null>(null);
  
  // Estados para modal de aprovação
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<{
    id: string;
    amount: number;
    investorName: string;
  } | null>(null);
  
  // Estados para observações e comprovantes
  const [investmentNotes, setInvestmentNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{
    investmentId: string;
    receiptUrl: string;
    fileName: string;
  } | null>(null);
  const [officeAdvisors, setOfficeAdvisors] = useState<Advisor[]>([]);
const [showNewInvestmentModal, setShowNewInvestmentModal] = useState(false);
const [newInvestmentForm, setNewInvestmentForm] = useState({
  amount: "",
  commitmentPeriod: "",
  liquidity: "",
});
const [createInvestmentLoading, setCreateInvestmentLoading] = useState(false);
const [generatePixAfterCreate, setGeneratePixAfterCreate] = useState(true);

  const [distributorData, setDistributorData] = useState({
    totalCaptured: 0,
    monthlyCommission: 0,
    annualCommission: 0,
    clientsCount: 0,
    officeShare: 0,
    advisorShare: 0,
    currentMonth: {
      captured: 0,
      commission: 0,
    },
    performanceBonus: {
      meta1Achieved: false,
      meta2Achieved: false,
      additionalRate: 0,
    },
    ranking: {
      position: 0,
      totalDistributors: 0,
      poolShare: 0,
      topAdvisorName: "",
      topAdvisorTotal: 0,
    },
  });

  const getVisibleSteps = () =>
    userType === "investor" ? REGISTRATION_STEPS : REGISTRATION_STEPS.slice(0, 3);

  useEffect(() => {
    setCurrentStep((prev) => Math.min(prev, getVisibleSteps().length - 1));
  }, [userType]);

  useEffect(() => {
    if (user?.role === "escritorio") {
      setUserType("advisor");
    } else if (user?.role === "assessor") {
      setUserType("investor");
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
    if (!investorForm.bankCode) return;
    const selected = banks.find((bank) => bank.code === investorForm.bankCode);
    if (selected) {
      setBankSearchTerm(`${selected.code} - ${selected.name}`);
    }
  }, [investorForm.bankCode, banks]);

  useEffect(() => {
    if (!showEditModal) {
      return;
    }

    if (!editForm.bankName) {
      setEditBankSearchTerm("");
      return;
    }

    const matchedBank = banks.find((bank) => bank.name === editForm.bankName);
    if (matchedBank) {
      const displayName = `${matchedBank.code} - ${matchedBank.name}`;
      setEditBankSearchTerm((prev) =>
        prev === displayName ? prev : displayName
      );
    } else {
      setEditBankSearchTerm((prev) =>
        prev === editForm.bankName ? prev : editForm.bankName
      );
    }
  }, [showEditModal, editForm.bankName, banks]);

  const showMissingFieldsToast = (fields: string[]) => {
    toast({
      title: "Campos obrigatórios",
      description: `Preencha os campos: ${fields.join(", ")}.`,
      variant: "destructive",
    });
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
    setInvestorForm((prev) => ({
      ...prev,
      zipCode: formatted,
    }));
  };

  const fetchAddressByCep = async () => {
    const cepDigits = sanitizeCep(investorForm.zipCode);

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
      setInvestorForm((prev) => ({
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

      setInvestorForm((prev) => ({
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
    setInvestorForm((prev) => ({
      ...prev,
      bankCode,
      bankName: bank?.name || "",
    }));
    setBankSearchTerm(
      bank ? `${bank.code} - ${bank.name}` : ""
    );
    setIsBankListOpen(false);
  };

  const handleSelectEditBank = (bankCode: string) => {
    const bank = banks.find((item) => item.code === bankCode);
    const displayName = bank ? `${bank.code} - ${bank.name}` : "";
    setEditForm((prev) => ({
      ...prev,
      bankName: bank?.name || "",
    }));
    setEditBankSearchTerm(displayName);
    setIsEditBankListOpen(false);
  };

  const validateStep = (stepIndex: number) => {
    const missing: string[] = [];

    switch (stepIndex) {
      case 0: {
        if (!investorForm.fullName) missing.push("Nome completo");
        if (!investorForm.email) missing.push("Email");
        if (!investorForm.cpf) missing.push("CPF");
        if (!investorForm.rg) missing.push("RG");
        if (!investorForm.nationality) missing.push("Nacionalidade");
        if (!investorForm.maritalStatus) missing.push("Estado civil");
        if (!investorForm.profession) missing.push("Profissão");
        if (!investorForm.password) missing.push("Senha");
        if (!investorForm.confirmPassword) missing.push("Confirmar senha");

        if (
          investorForm.password &&
          investorForm.confirmPassword &&
          investorForm.password !== investorForm.confirmPassword
        ) {
          toast({
            title: "Senhas não coincidem",
            description: "A senha e confirmação de senha devem ser iguais.",
            variant: "destructive",
          });
          return false;
        }
        break;
      }
      case 1: {
        if (!investorForm.street) missing.push("Rua");
        if (!investorForm.number) missing.push("Número");
        if (!investorForm.neighborhood) missing.push("Bairro");
        if (!investorForm.city) missing.push("Cidade");
        if (!investorForm.state) missing.push("Estado");
        if (!investorForm.zipCode) {
          missing.push("CEP");
        } else if (sanitizeCep(investorForm.zipCode).length !== 8) {
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
        const hasPix = Boolean(investorForm.pixKey?.trim());
        const hasBankData =
          Boolean(investorForm.bankCode) ||
          Boolean(investorForm.agency) ||
          Boolean(investorForm.accountNumber);

        if (!hasPix && !hasBankData) {
          missing.push("Chave PIX ou dados bancários");
        }

        if (hasBankData) {
          const bankMissing: string[] = [];
          if (!investorForm.bankCode) bankMissing.push("Banco");
          if (!investorForm.agency) bankMissing.push("Agência");
          if (!investorForm.accountNumber) bankMissing.push("Conta");

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
      showMissingFieldsToast(missing);
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;

    setCurrentStep((prev) => {
      const stepsLength = getVisibleSteps().length;
      return Math.min(prev + 1, stepsLength - 1);
    });
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
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
                value={investorForm.fullName}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
                placeholder="Nome completo do investidor"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={investorForm.email}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                value={investorForm.phone}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={investorForm.cpf}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    cpf: e.target.value,
                  }))
                }
                placeholder="000.000.000-00"
                required
              />
            </div>

            <div>
              <Label htmlFor="rg">RG *</Label>
              <Input
                id="rg"
                value={investorForm.rg}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    rg: e.target.value,
                  }))
                }
                placeholder="00.000.000-0"
                required
              />
            </div>

            <div>
              <Label htmlFor="nationality">Nacionalidade *</Label>
              <Input
                id="nationality"
                value={investorForm.nationality}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    nationality: e.target.value,
                  }))
                }
                placeholder="Brasileira"
                required
              />
            </div>

            <div>
              <Label htmlFor="maritalStatus">Estado Civil *</Label>
              <select
                id="maritalStatus"
                value={investorForm.maritalStatus}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    maritalStatus: e.target.value,
                  }))
                }
                className="w-full rounded-md border p-2"
                required
              >
                <option value="">Selecione o estado civil</option>
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viuvo">Viúvo(a)</option>
                <option value="uniao_estavel">União Estável</option>
              </select>
            </div>

            <div>
              <Label htmlFor="profession">Profissão *</Label>
              <Input
                id="profession"
                value={investorForm.profession}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    profession: e.target.value,
                  }))
                }
                placeholder="Ex: Engenheiro, Médico, Advogado..."
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={investorForm.password}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Senha do investidor"
                required
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={investorForm.confirmPassword}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Confirme a senha"
                required
                minLength={6}
              />
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
                value={investorForm.street}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                value={investorForm.number}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                value={investorForm.complement}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                value={investorForm.neighborhood}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                value={investorForm.city}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                value={investorForm.state}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                  value={investorForm.zipCode}
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
                value={investorForm.pixKey}
                onChange={(e) =>
                  setInvestorForm((prev) => ({
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
                    setInvestorForm((prev) => ({
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
                            investorForm.bankCode === bank.code ? "bg-accent/60" : ""
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
                  value={investorForm.agency}
                  onChange={(e) =>
                    setInvestorForm((prev) => ({
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
                  value={investorForm.accountNumber}
                  onChange={(e) =>
                    setInvestorForm((prev) => ({
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

  useEffect(() => {
    if (myInvestors.length === 0 || !user) return;

    const totalCaptured = myInvestors.reduce(
      (sum, inv) => sum + inv.totalInvested,
      0
    );

    const officeShare = totalCaptured * 0.01;
    const advisorShare = officeShare * 3;

    const baseCommissionRate =
      user.role === "escritorio"
        ? 0.01
        : user.role === "investor"
        ? 0.02
        : 0.03; // Baseado no role
    const monthlyCommission = totalCaptured * baseCommissionRate;
    const annualCommission = monthlyCommission * 12;

    setDistributorData((prev) => ({
      ...prev,
      totalCaptured,
      monthlyCommission: monthlyCommission,
      annualCommission: annualCommission,
      clientsCount: myInvestors.length,
      advisorShare,
      officeShare,
      currentMonth: {
        captured: totalCaptured,
        commission: monthlyCommission,
      },
      performanceBonus: {
        meta1Achieved: totalCaptured >= 3000000,
        meta2Achieved: totalCaptured >= 7000000,
        additionalRate: totalCaptured >= 7000000 ? 5 : 0,
      },
      ranking: {
        ...prev.ranking,
        poolShare: totalCaptured * 0.02,
      },
    }));
  }, [myInvestors]);

  const visibleSteps = getVisibleSteps();
  const isLastStep = currentStep === visibleSteps.length - 1;
  const showContractsTab = user?.role === "assessor" || user?.role === "escritorio";
  const tabsGridCols =
    user?.role === "escritorio" ? "grid-cols-6" : showContractsTab ? "grid-cols-5" : "grid-cols-4";
  const overviewGridCols =
    user?.role === "escritorio" ? "lg:grid-cols-5" : "lg:grid-cols-4";
  const filteredContractsOverview = useMemo(() => {
    if (!contractsSearchTerm.trim()) {
      return contractsOverview;
    }

    const term = contractsSearchTerm.toLowerCase();

    return contractsOverview.filter(({ investorName, investorEmail, contract }) => {
      const matchesInvestorName = investorName?.toLowerCase().includes(term);
      const matchesInvestorEmail = investorEmail?.toLowerCase().includes(term);
      const matchesContractName = contract.contract_name?.toLowerCase().includes(term);
      const matchesFileName = contract.file_name?.toLowerCase().includes(term);
      const matchesStatus = contract.status?.toLowerCase().includes(term);

      return (
        matchesInvestorName ||
        matchesInvestorEmail ||
        matchesContractName ||
        matchesFileName ||
        matchesStatus
      );
    });
  }, [contractsOverview, contractsSearchTerm]);
  const totalContracts = contractsOverview.length;

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  // Função para buscar o office_id do usuário logado
  const fetchUserOfficeId = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("office_id, role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Erro ao buscar office_id do usuário:", error);
        return;
      }

      // Se o usuário for um escritório, seu office_id é seu próprio id
      // Se for um assessor, usa o office_id do seu perfil
      const officeId = profile.role === "escritorio" ? userId : profile.office_id;
      console.log(`[v0] Office ID definido para usuário ${userId}:`, officeId, `(role: ${profile.role})`);
      setUserOfficeId(officeId);
    } catch (error) {
      console.error("Erro ao buscar office_id:", error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserOfficeId(user.id);
      fetchMyInvestors(user?.id);
      fetchMyAdvisors(user?.id);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "assessor" && userOfficeId) {
      void fetchOfficeAdvisors(userOfficeId);
    }
  }, [user?.role, userOfficeId]);

  const fetchMyInvestors = async (distributorId: string) => {
    let profilesWithInvestments: any[] = [];
    try {
      setLoadingInvestors(true);
      const supabase = createClient();

      // Se for escritório, buscar por office_id, senão buscar por parent_id
      const query =
        user?.role === "escritorio"
          ? supabase
              .from("profiles")
              .select("*")
              .eq("user_type", "investor")
              .eq("office_id", distributorId)
              .order("created_at", { ascending: false })
          : supabase
              .from("profiles")
              .select("*")
              .eq("user_type", "investor")
              .eq("parent_id", distributorId)
              .order("created_at", { ascending: false });

      const { data: profiles, error: profilesError } = await query;

      const advisorInfoMap: Record<string, { name: string; email: string | null }> = {};

      if (!profilesError && profiles.length > 0) {
        if (user?.role === "escritorio") {
          const parentIds = Array.from(
            new Set(
              profiles
                .map((p) => p.parent_id)
                .filter((parentId): parentId is string => Boolean(parentId))
            )
          );

          if (parentIds.length > 0) {
            const { data: advisorsInfo, error: advisorsInfoError } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", parentIds);

            if (advisorsInfoError) {
              console.error("Erro ao buscar dados dos assessores responsáveis:", advisorsInfoError);
            } else {
              advisorsInfo?.forEach((advisor: any) => {
                advisorInfoMap[advisor.id] = {
                  name: advisor.full_name || advisor.email?.split("@")[0] || "Assessor",
                  email: advisor.email || null,
                };
              });
            }
          }
        }

        const profileIds = profiles.map((p) => p.id);

        const { data: investments, error: investmentsError } = await supabase
          .from("investments")
          .select("*")
          .eq("status", "active")
          .in("user_id", profileIds); // <-- aqui, não .eq()

        // Junta os dados manualmente
        const profilesWithInvestmentsMapped = profiles.map((profile) => ({
          ...profile,
          investments: investments?.filter((inv) => inv.user_id === profile.id),
        }));
        profilesWithInvestments = profilesWithInvestmentsMapped;
      }

      if (profilesError) {
        console.error("Erro ao buscar investidores:", profilesError);
        return;
      }

      const transformedInvestors: Investor[] = (
        profilesWithInvestments || []
      ).map((profile) => {
        const totalInvested =
          profile.investments?.reduce(
            (sum: number, inv: any) => sum + (inv.amount || 0),
            0
          ) || 0;

        const cpfFromProfile =
          profile.cnpj ||
          (profile.notes?.includes("CPF:")
            ? profile.notes.split("CPF:")[1]?.split("|")[0]?.trim()
            : "");
        const cpfDigits = cpfFromProfile ? String(cpfFromProfile).replace(/\D/g, "") : "";
        const parentId = profile.parent_id ?? null;
        const advisorInfo = parentId ? advisorInfoMap[parentId] : undefined;

        return {
          id: profile.id,
          name: profile.full_name || profile.email.split("@")[0],
          email: profile.email,
          phone: profile.phone,
          cpf: cpfDigits,
          totalInvested,
          status: profile.is_active ? "active" : "inactive",
          joinedAt: profile.created_at,
          lastActivity: profile.updated_at || profile.created_at,
          address: profile.address,
          rg: profile.rg,
          nationality: profile.nationality,
          maritalStatus: profile.marital_status,
          profession: profile.profession,
          pixKey: profile.pix_usdt_key,
          user_type: profile.user_type,
          bankName: profile.bank_name,
          bankBranch: profile.bank_branch,
          bankAccount: profile.bank_account,
          advisorId: parentId,
          advisorName: advisorInfo?.name ?? null,
          advisorEmail: advisorInfo?.email ?? null,
        };
      });

      setMyInvestors(transformedInvestors);
    } catch (error) {
      console.error("Erro ao buscar investidores:", error);
    } finally {
      setLoadingInvestors(false);
    }
  };

  const fetchMyAdvisors = async (distributorId: string) => {
    try {
      setLoadingAdvisors(true);
      const supabase = createClient();

      // Se for escritório, buscar por office_id, senão buscar por parent_id
      const query =
        user?.role === "escritorio"
          ? supabase
              .from("profiles")
              .select("*")
              .eq("user_type", "distributor")
              .eq("office_id", distributorId)
              .order("created_at", { ascending: false })
          : supabase
              .from("profiles")
              .select("*")
              .eq("user_type", "distributor")
              .eq("parent_id", distributorId)
              .order("created_at", { ascending: false });

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) {
        console.error("Erro ao buscar assessores:", profilesError);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setMyAdvisors([]);
        return;
      }

      const profileIds = profiles.map((p) => p.id);

      const { data: advisorInvestors, error: advisorInvestorsError } = await supabase
        .from("profiles")
        .select("id, parent_id")
        .eq("user_type", "investor")
        .in("parent_id", profileIds);

      if (advisorInvestorsError) {
        console.error("Erro ao buscar investidores dos assessores:", advisorInvestorsError);
      }

      const investorIds = advisorInvestors?.map((inv) => inv.id) ?? [];

      let investorInvestments: { user_id: string; amount: number }[] = [];
      if (investorIds.length > 0) {
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("user_id, amount")
          .eq("status", "active")
          .in("user_id", investorIds);

        if (investmentsError) {
          console.error("Erro ao buscar investimentos dos investidores:", investmentsError);
        } else {
          investorInvestments = investmentsData || [];
        }
      }

      const investmentsByInvestor = investorInvestments.reduce<Record<string, number>>(
        (acc, investment) => {
          acc[investment.user_id] = (acc[investment.user_id] || 0) + (investment.amount || 0);
          return acc;
        },
        {}
      );

      const transformedAdvisors: Advisor[] = profiles.map((profile) => {
        const advisorInvestorIds =
          advisorInvestors?.filter((inv) => inv.parent_id === profile.id).map((inv) => inv.id) ||
          [];

        const advisorInvestorsCount = advisorInvestorIds.length;

        const totalCaptured = advisorInvestorIds.reduce(
          (sum, investorId) => sum + (investmentsByInvestor[investorId] || 0),
          0
        );

        const cpfFromProfile =
          profile.cnpj ||
          (profile.notes?.includes("CPF:")
            ? profile.notes.split("CPF:")[1]?.split("|")[0]?.trim()
            : "");
        const cpfDigits = cpfFromProfile ? String(cpfFromProfile).replace(/\D/g, "") : "";

        return {
          id: profile.id,
          name: profile.full_name || profile.email.split("@")[0],
          email: profile.email,
          phone: profile.phone,
          cpf: cpfDigits,
          totalCaptured,
          status: profile.is_active ? "active" : "inactive",
          joinedAt: profile.created_at,
          lastActivity: profile.updated_at || profile.created_at,
          investorsCount: advisorInvestorsCount,
          address: profile.address,
          rg: profile.rg,
          nationality: profile.nationality,
          maritalStatus: profile.marital_status,
          profession: profile.profession,
          pixKey: profile.pix_usdt_key,
          user_type: profile.user_type,
          bankName: profile.bank_name,
          bankBranch: profile.bank_branch,
          bankAccount: profile.bank_account,
        };
      });

      setMyAdvisors(transformedAdvisors);
      if (user?.role === "escritorio") {
        setOfficeAdvisors(transformedAdvisors);
      }
    } catch (error) {
      console.error("Erro ao buscar assessores:", error);
    } finally {
      setLoadingAdvisors(false);
    }
  };

  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas para ambos os tipos
    if (
      !investorForm.fullName ||
      !investorForm.email ||
      !investorForm.password ||
      !investorForm.rg ||
      !investorForm.nationality ||
      !investorForm.maritalStatus ||
      !investorForm.profession ||
      !investorForm.street ||
      !investorForm.number ||
      !investorForm.neighborhood ||
      !investorForm.city ||
      !investorForm.state ||
      !investorForm.zipCode
    ) {
      toast({
        title: "Campos obrigatórios",
        description:
        "Preencha todos os campos obrigatórios incluindo RG, nacionalidade, estado civil, profissão e endereço completo.",
        variant: "destructive",
      });
      return;
    }

    const cepDigits = sanitizeCep(investorForm.zipCode);
    if (cepDigits.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Informe um CEP com 8 dígitos.",
        variant: "destructive",
      });
      return;
    }

    const hasPix = Boolean(investorForm.pixKey?.trim());
    const hasBankData =
      Boolean(investorForm.bankCode) ||
      Boolean(investorForm.agency) ||
      Boolean(investorForm.accountNumber);

    if (!hasPix && !hasBankData) {
      toast({
        title: "Dados bancários obrigatórios",
        description: "Informe uma chave PIX ou preencha banco, agência e conta.",
        variant: "destructive",
      });
      return;
    }

    if (hasBankData) {
      const bankMissing: string[] = [];
      if (!investorForm.bankCode) bankMissing.push("Banco");
      if (!investorForm.agency) bankMissing.push("Agência");
      if (!investorForm.accountNumber) bankMissing.push("Conta");

      if (bankMissing.length > 0) {
        showMissingFieldsToast(bankMissing);
        return;
      }
    }

    if (investorForm.password !== investorForm.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A senha e confirmação de senha devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (investorForm.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingInvestor(true);
      const supabase = createClient();

      // Verificar se o office_id está disponível
      if (!userOfficeId && user?.role === "escritorio") {
        toast({
          title: "Erro de configuração",
          description: "Office ID não encontrado. Tente fazer login novamente.",
          variant: "destructive",
        });
        return;
      }

      // Buscar o distributor_id baseado no contexto do usuário
      let distributorId: string | null = null;
      
      if (user?.role === "distribuidor") {
        // Se o usuário é distribuidor, o distributor_id é ele mesmo
        distributorId = user.id;
      } else if (user?.role === "escritorio") {
        // Se o usuário é escritório, buscar o distributor_id do escritório (parent_id)
        const { data: officeProfile } = await supabase
          .from("profiles")
          .select("distributor_id, parent_id")
          .eq("id", user.id)
          .single();
        
        distributorId = officeProfile?.distributor_id || officeProfile?.parent_id || null;
      } else if (user?.role === "assessor") {
        // Se o usuário é assessor, buscar o distributor_id do assessor
        const { data: assessorProfile } = await supabase
          .from("profiles")
          .select("distributor_id")
          .eq("id", user.id)
          .single();
        
        distributorId = assessorProfile?.distributor_id || null;
      }

      // const [firstName, ...lastNameParts] = investorForm.fullName
      //   .trim()
      //   .split(" ");
      // const lastName = lastNameParts.join(" ") || firstName;

      // const registrationData = {
      //   firstName,
      //   lastName,
      //   email: investorForm.email,
      //   password: investorForm.password,
      //   phone: investorForm.phone,
      //   cpf: investorForm.cpf,
      //   rg: "",
      //   assessorId: user?.id || null,
      // };

      // console.log(
      //   "[v0] Enviando dados para endpoint externo:",
      //   registrationData
      // );

      // const response = await fetch("/api/external/register", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(registrationData),
      // });

      // const result = await response.json();

      // if (!result.success) {
      //   throw new Error(
      //     result.error || "Erro ao cadastrar investidor na API externa"
      //   );
      // }

      // console.log(
      //   "[v0] Investidor cadastrado com sucesso na API externa:",
      //   result.data
      // );

      const pixNote = investorForm.pixKey
        ? ` | PIX: ${investorForm.pixKey}`
        : "";
      const bankNote = investorForm.bankCode
        ? ` | Banco: ${investorForm.bankCode}${
            investorForm.bankName ? ` - ${investorForm.bankName}` : ""
          } Agência: ${investorForm.agency || "-"} Conta: ${investorForm.accountNumber || "-"}`
        : "";
      const metadataNotes = `CPF: ${investorForm.cpf}${pixNote}${bankNote}`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: investorForm.email,
        password: investorForm.password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/login`,
          data: {
            full_name: investorForm.fullName,
            user_type: userType === "investor" ? "investor" : "distributor",
            phone: investorForm.phone,
            parent_id: user?.id || null,
            cpf_cnpj: investorForm.cpf,
            notes: metadataNotes,
            pix_usdt_key: investorForm.pixKey || null,
            bank_code: investorForm.bankCode || null,
            bank_name: investorForm.bankName || null,
            bank_branch: investorForm.agency || null,
            bank_account: investorForm.accountNumber || null,
            address_complement: investorForm.complement || null,
          },
        },
      });

      if (authError) {
        console.error(
          "[v0] Erro ao criar usuário no Supabase Auth:",
          authError
        );
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error(
          "Erro ao criar usuário: dados do usuário não retornados"
        );
      }

      console.log(
        "[v0] Usuário criado no Supabase Auth com sucesso:",
        authData.user.id
      );
      console.log(
        "[v0] Perfil será criado automaticamente pelo trigger do Supabase"
      );
      console.log("[v0] Criando perfil com office_id:", userOfficeId);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata.full_name,
            user_type: authData.user.user_metadata.user_type,
            role: userType === "investor" ? "investidor" : "assessor",
            parent_id: authData.user.user_metadata.parent_id || null,
            office_id: userOfficeId, // Usar o office_id do usuário logado
            distributor_id: distributorId, // Setar o distributor_id
            phone: authData.user.user_metadata.phone || null,
            cnpj: authData.user.user_metadata.cpf_cnpj || null,
            notes: `Usuário criado via dashboard do assessor ${user?.name}${pixNote}${bankNote}`,
            hierarchy_level: userType === "investor" ? "advisor" : "advisor",
            rescue_type:
              userType === "investor" && investorForm.rescueTerm
                ? investorForm.rescueTerm
                : null,
            is_active: true,
            rg: investorForm.rg,
            nationality: investorForm.nationality,
            marital_status: investorForm.maritalStatus,
            profession: investorForm.profession,
            address: buildFullAddress(),
            pix_usdt_key: investorForm.pixKey || null,
            bank_name: investorForm.bankName || null,
            bank_branch: investorForm.agency || null,
            bank_account: investorForm.accountNumber || null,
          },
        ])
        .select()
        .single();

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError);

        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      } else {
        console.log("Perfil criado:", profileData);
      }

      toast({
        title: userType === "investor" ? "Investidor cadastrado!" : "Assessor cadastrado!",
        description: `${investorForm.fullName} foi cadastrado com sucesso.`,
      });
      
      resetInvestorForm();
      setShowInvestorModal(false);

      if (user?.id) {
        setTimeout(() => {
          fetchMyInvestors(user.id);
          if (user.role === "escritorio") {
            fetchMyAdvisors(user.id);
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error("Erro ao cadastrar usuário:", error);
      toast({
        title: userType === "investor" ? "Erro ao cadastrar investidor" : "Erro ao cadastrar assessor",
        description:
          error.message || `Não foi possível cadastrar o ${userType === "investor" ? "investidor" : "assessor"}.`,
        variant: "destructive",
      });
    } finally {
      setSubmittingInvestor(false);
    }
  };

  interface QRRecipientInfo {
    cpf?: string | null;
    email?: string | null;
    fullName?: string | null;
  }

  const generateQRCode = async (
    value: number,
    recipient?: QRRecipientInfo
  ) => {
    try {
      setGeneratingQR(true);

      const cpf = recipient?.cpf || investorForm.cpf;
      const email = recipient?.email || investorForm.email;
      const fullName = recipient?.fullName || investorForm.fullName;

      if (!cpf) {
        throw new Error("CPF do investidor não informado para gerar o QR Code.");
      }

      const response = await fetch("/api/external/generate-qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value,
          cpf,
          email,
          userName: fullName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao gerar QR Code PIX");
      }

      console.log("[v0] QR Code gerado com sucesso:", result);

      setQRCodeData({
        qrCode: result.qrCode,
        paymentString: result.paymentString,
        originalData: result.originalData,
      });
      setShowQRModal(true);

      toast({
        title: "QR Code PIX gerado!",
        description:
          "O QR Code para pagamento foi gerado com sucesso. Um email com o código PIX foi enviado para você.",
      });
    } catch (error: any) {
      console.error("Erro ao gerar QR Code:", error);
      toast({
        title: "Erro ao gerar QR Code",
        description: error.message || "Não foi possível gerar o QR Code PIX.",
        variant: "destructive",
      });
    } finally {
      setGeneratingQR(false);
    }
  };

  const copyPixCode = () => {
    if (qrCodeData?.paymentString) {
      navigator.clipboard.writeText(qrCodeData.paymentString);
      toast({
        title: "Código PIX copiado!",
        description: "O código PIX foi copiado para a área de transferência.",
      });
    }
  };

  // Função para buscar contratos do usuário
  const fetchUserContracts = async (userId: string) => {
    try {
      setLoadingContracts(true);
      
      console.log("🔍 [DEBUG] Buscando contratos para userId:", userId);

      // Usar a API de contratos em vez de acessar diretamente o Supabase
      const response = await fetch(`/api/contracts?investorId=${userId}`);
      const result = await response.json();

      console.log("🔍 [DEBUG] Resultado da API de contratos:", result);

      if (!result.success) {
        console.error("❌ [DEBUG] Erro na API de contratos:", result.error);
        setUserContracts([]);
        return;
      }

      console.log("✅ [DEBUG] Contratos encontrados via API:", result.data?.length || 0);
      setUserContracts(result.data || []);
    } catch (error) {
      console.error("❌ [DEBUG] Erro geral ao buscar contratos:", error);
      setUserContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  };

  // Função para buscar investimentos do usuário
  const fetchUserInvestments = async (userId: string) => {
    try {
      setLoadingInvestments(true);
      const supabase = createClient();

      // Primeiro, verificar se o usuário é um investidor
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_type")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        console.error("Erro ao buscar perfil:", profileError);
        setUserInvestments([]);
        return;
      }

      if (profile.user_type !== 'investor') {
        setUserInvestments([]);
        return;
      }

      // Buscar investimentos do usuário
      const { data: investments, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar investimentos:", error);
        setUserInvestments([]);
        return;
      }

      setUserInvestments(investments || []);
      
      // Carregar observações existentes
      if (investments && investments.length > 0) {
        const notesMap: Record<string, string> = {};
        investments.forEach(investment => {
          if (investment.notes) {
            notesMap[investment.id] = investment.notes;
          }
        });
        setInvestmentNotes(notesMap);
      }
    } catch (error) {
      console.error("Erro ao buscar investimentos:", error);
    } finally {
      setLoadingInvestments(false);
    }
  };

  const loadContractsOverview = useCallback(async () => {
    if (!showContractsTab) {
      return;
    }

    if (!myInvestors.length) {
      setContractsOverview([]);
      setContractsOverviewError(null);
      setContractsOverviewLoaded(true);
      return;
    }

    setLoadingContractsOverview(true);
    setContractsOverviewError(null);

    try {
      const results = await Promise.allSettled(
        myInvestors.map(async (investor) => {
          const response = await fetch(`/api/contracts?investorId=${investor.id}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erro ao buscar contratos do investidor");
          }

          return {
            investor,
            contracts: Array.isArray(result.data) ? (result.data as Contract[]) : [],
          };
        })
      );

      const aggregated: InvestorContractOverview[] = [];
      const failedInvestors: string[] = [];

      results.forEach((res, index) => {
        const investor = myInvestors[index];

        if (res.status === "fulfilled") {
          const contracts = res.value?.contracts ?? [];

          contracts.forEach((contract) => {
            aggregated.push({
              investorId: investor.id,
              investorName: investor.name,
              investorEmail: investor.email,
              contract,
            });
          });
        } else {
          failedInvestors.push(investor.name);
        }
      });

      aggregated.sort(
        (a, b) =>
          new Date(b.contract.created_at).getTime() -
          new Date(a.contract.created_at).getTime()
      );

      setContractsOverview(aggregated);

      if (failedInvestors.length > 0) {
        const errorMessage = `Não foi possível carregar contratos de: ${failedInvestors.join(", ")}.`;
        setContractsOverviewError(errorMessage);
        toast({
          title: "Erro ao carregar contratos",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar contratos do painel:", error);
      const message = "Não foi possível carregar os contratos.";
      setContractsOverview([]);
      setContractsOverviewError(message);
      toast({
        title: "Erro ao carregar contratos",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingContractsOverview(false);
      setContractsOverviewLoaded(true);
    }
  }, [
    myInvestors,
    toast,
    showContractsTab,
  ]);

  useEffect(() => {
    setContractsOverviewLoaded(false);
  }, [myInvestors]);

  useEffect(() => {
    if (
      activeTab === "contracts" &&
      !contractsOverviewLoaded &&
      !loadingContractsOverview
    ) {
      void loadContractsOverview();
    }
  }, [
    activeTab,
    contractsOverviewLoaded,
    loadingContractsOverview,
    loadContractsOverview,
  ]);

  // Função para abrir modal de edição
  const handleEditUser = (user: Investor | Advisor) => {
    setEditingUser(user);
    
    // Extrair dados do endereço se existir
    let street = '', number = '', neighborhood = '', city = '', state = '', zipCode = '';
    
    if (user.address) {
      const addressParts = user.address.split(', ');
      
      street = addressParts[0] || '';
      number = addressParts[1] || '';
      neighborhood = addressParts[2] || '';
      city = addressParts[3] || '';
      state = addressParts[4] || '';
      zipCode = addressParts[5] || '';
    }

    const formattedCpf = formatCpfCnpj(user.cpf);

    const formData = {
      fullName: user.name,
      email: user.email,
      phone: user.phone || "",
      cpf: formattedCpf,
      rg: user.rg || "",
      nationality: user.nationality || "",
      maritalStatus: user.maritalStatus || "",
      profession: user.profession || "",
      street,
      number,
      neighborhood,
      city,
      state,
      zipCode,
      pixKey: user.pixKey || "",
      bankName: user.bankName || "",
      bankBranch: user.bankBranch || "",
      bankAccount: user.bankAccount || "",
    };

    setEditForm(formData);
    setEditBankSearchTerm(formData.bankName || "");
    setIsEditBankListOpen(false);
    setShowEditModal(true);

    // Buscar contratos e investimentos apenas para investidores
    if (user.user_type === 'investor' || 'totalInvested' in user) {
      fetchUserContracts(user.id);
      fetchUserInvestments(user.id);
    }
  };

  // Função para salvar edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) {
      return;
    }

    // Validações básicas
    if (
      !editForm.fullName ||
      !editForm.email ||
      !editForm.rg ||
      !editForm.nationality ||
      !editForm.maritalStatus ||
      !editForm.profession ||
      !editForm.street ||
      !editForm.number ||
      !editForm.neighborhood ||
      !editForm.city ||
      !editForm.state ||
      !editForm.zipCode ||
      !editForm.pixKey
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingEdit(true);
      const supabase = createClient();

      // Verificar se o usuário tem permissão para editar este perfil
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error("Usuário não autenticado");
      }

    const fullAddress = `${editForm.street}, ${editForm.number}, ${editForm.neighborhood}, ${editForm.city}, ${editForm.state}, ${editForm.zipCode}`.trim();
    const cpfDigits = editForm.cpf ? editForm.cpf.replace(/\D/g, "") : "";
    const pixNote = editForm.pixKey ? ` | PIX: ${editForm.pixKey}` : "";
    const bankLabel = editBankSearchTerm || editForm.bankName;
    const bankNote = bankLabel
      ? ` | Banco: ${bankLabel}${
          editForm.bankBranch ? ` Agência: ${editForm.bankBranch}` : ""
        } Conta: ${editForm.bankAccount || "-"}`
      : "";
    const notesString = `CPF: ${
      editForm.cpf || cpfDigits || "-"
    }${pixNote}${bankNote}`;

    const updateData = {
      full_name: editForm.fullName,
      email: editForm.email,
      phone: editForm.phone || null,
      cnpj: cpfDigits || null,
      notes: notesString,
      rg: editForm.rg,
      nationality: editForm.nationality,
      marital_status: editForm.maritalStatus,
      profession: editForm.profession,
      address: fullAddress,
      pix_usdt_key: editForm.pixKey || null,
      bank_name: editForm.bankName || null,
      bank_branch: editForm.bankBranch || null,
      bank_account: editForm.bankAccount || null,
      updated_at: new Date().toISOString(),
    };

      // Verificar se o perfil existe e se o usuário tem permissão
      const { data: profileCheck, error: checkError } = await supabase
        .from("profiles")
        .select("id, parent_id, office_id, user_type")
        .eq("id", editingUser.id)
        .single();

      if (checkError) {
        throw new Error(`Erro ao verificar perfil: ${checkError.message}`);
      }

      // Verificar se o usuário logado tem permissão para editar este perfil
      const isOwner = profileCheck.parent_id === user?.id || profileCheck.office_id === userOfficeId;
      if (!isOwner) {
        throw new Error("Você não tem permissão para editar este perfil");
      }

      let updateSuccess = false;
      let updateError = null;
      let usedRpc = false;

      // Tentar primeiro com função RPC
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('update_user_profile', {
          p_user_id: editingUser.id,
          p_full_name: updateData.full_name,
          p_email: updateData.email,
          p_phone: updateData.phone,
          p_cnpj: updateData.cnpj,
          p_notes: updateData.notes,
          p_rg: updateData.rg,
          p_nationality: updateData.nationality,
          p_marital_status: updateData.marital_status,
          p_profession: updateData.profession,
          p_address: updateData.address,
          p_pix_usdt_key: updateData.pix_usdt_key
        });

        if (rpcError) {
          throw new Error("RPC não disponível");
        }

        if (!rpcResult || !rpcResult.success) {
          throw new Error(rpcResult?.error || "Erro na função RPC");
        }

        updateSuccess = true;
        usedRpc = true;
      } catch (rpcError) {
        // Fallback: tentar atualização direta
        const { data, error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", editingUser.id)
          .select();

        if (error) {
          updateError = new Error(`Erro ao atualizar perfil: ${error.message}`);
        } else if (!data || data.length === 0) {
          updateError = new Error("Nenhum registro foi atualizado. Verifique se o usuário existe.");
        } else {
          updateSuccess = true;
        }
      }

      if (updateSuccess && usedRpc) {
        const { error: supplementalError } = await supabase
          .from("profiles")
          .update({
            bank_name: updateData.bank_name,
            bank_branch: updateData.bank_branch,
            bank_account: updateData.bank_account,
            cnpj: updateData.cnpj,
            notes: updateData.notes,
          })
          .eq("id", editingUser.id);

        if (supplementalError) {
          throw new Error(`Erro ao atualizar dados bancários: ${supplementalError.message}`);
        }
      }

      if (!updateSuccess) {
        throw updateError || new Error("Não foi possível atualizar o perfil");
      }

      toast({
        title: "Perfil atualizado!",
        description: "Os dados do usuário foram atualizados com sucesso.",
      });

      setShowEditModal(false);
      setEditingUser(null);
      setEditBankSearchTerm("");
      setIsEditBankListOpen(false);

      // Recarregar dados
      if (user?.id) {
        await fetchMyInvestors(user.id);
        if (user.role === "escritorio") {
          await fetchMyAdvisors(user.id);
        }
      }
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setSubmittingEdit(false);
    }
  };


  const resetNewInvestmentForm = () => {
    setNewInvestmentForm({
      amount: "",
      commitmentPeriod: "",
      liquidity: "",
    });
    setGeneratePixAfterCreate(true);
  };

  const openNewInvestmentModal = () => {
    if (!editingUser || !("id" in editingUser) || editingUser.user_type !== "investor") {
      toast({
        title: "Selecione um investidor",
        description: "Abra a tela de edição de um investidor para adicionar um investimento.",
        variant: "destructive",
      });
      return;
    }
    resetNewInvestmentForm();
    setShowNewInvestmentModal(true);
  };

  const handleCreateInvestmentForInvestor = async () => {
    if (!editingUser || editingUser.user_type !== "investor") {
      toast({
        title: "Investidor não selecionado",
        description: "Selecione um investidor para criar o investimento.",
        variant: "destructive",
      });
      return;
    }

    const sanitizedAmount = newInvestmentForm.amount
      .replace(/[^\d,]/g, "")
      .replace(",", ".");
    const amountNumber = Number.parseFloat(sanitizedAmount);

    if (!amountNumber || Number.isNaN(amountNumber)) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de investimento válido.",
        variant: "destructive",
      });
      return;
    }

    if (amountNumber < 5000) {
      toast({
        title: "Valor mínimo não atingido",
        description: "O valor mínimo de investimento é R$ 5.000,00.",
        variant: "destructive",
      });
      return;
    }

    if (!newInvestmentForm.commitmentPeriod || !newInvestmentForm.liquidity) {
      toast({
        title: "Informações incompletas",
        description: "Selecione o prazo de investimento e a liquidez.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreateInvestmentLoading(true);

      const supabase = createClient();

      const { error } = await supabase.rpc("create_investment_for_user", {
        p_user_id: editingUser.id,
        p_amount: amountNumber,
        p_status: "pending",
        p_quota_type: "senior",
        p_monthly_return_rate: getRateByPeriodAndLiquidity(
          Number(newInvestmentForm.commitmentPeriod),
          newInvestmentForm.liquidity
        ),
        p_commitment_period: Number(newInvestmentForm.commitmentPeriod),
        p_profitability_liquidity: newInvestmentForm.liquidity,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Investimento criado!",
        description: "O investimento foi registrado com sucesso e está pendente de aprovação.",
      });

      if (generatePixAfterCreate) {
        const cpf =
          editingUser.cpf ||
          (editForm.cpf ? editForm.cpf.replace(/\D/g, "") : "");

        await generateQRCode(amountNumber, {
          cpf,
          email: editingUser.email || editForm.email,
          fullName: editingUser.name || editForm.fullName,
        });
      }

      setShowNewInvestmentModal(false);
      await fetchUserInvestments(editingUser.id);
    } catch (error: any) {
      console.error("Erro ao criar investimento:", error);
      toast({
        title: "Erro ao criar investimento",
        description: error.message || "Não foi possível criar o investimento.",
        variant: "destructive",
      });
    } finally {
      setCreateInvestmentLoading(false);
    }
  };

  // Função para baixar contrato
  const downloadContract = (contract: Contract) => {
    const link = document.createElement('a');
    link.href = contract.file_url;
    link.download = contract.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para visualizar contrato (usando a mesma lógica do admin)
  const viewContract = async (contract: Contract) => {
    try {
      setSelectedContract(contract);
      setContractViewerOpen(true);
    } catch (error) {
      console.error("Erro ao abrir visualizador:", error);
      toast({
        title: "Erro ao visualizar contrato",
        description: "Não foi possível abrir o visualizador de contratos.",
        variant: "destructive",
      });
    }
  };

  // Função para abrir modal de aprovação
  const handleApproveInvestment = (investment: Investment) => {
    setSelectedInvestment({
      id: investment.id,
      amount: investment.amount,
      investorName: editingUser?.name || 'Investidor'
    });
    setApproveModalOpen(true);
  };

  // Função para rejeitar investimento
  const handleRejectInvestment = async (investmentId: string) => {
    try {
      setRejectingInvestment(investmentId);

      const response = await fetch("/api/investments/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          investmentId,
          action: "reject",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Não foi possível rejeitar o investimento.");
      }

      toast({
        title: "Investimento rejeitado!",
        description: result.message || "O investimento foi rejeitado e removido.",
      });

      if (editingUser) {
        await fetchUserInvestments(editingUser.id);
      }
    } catch (error: any) {
      console.error("Erro ao rejeitar investimento:", error);
      toast({
        title: "Erro ao rejeitar investimento",
        description: error.message || "Não foi possível rejeitar o investimento.",
        variant: "destructive",
      });
    } finally {
      setRejectingInvestment(null);
    }
  };

  // Função chamada quando a aprovação é bem-sucedida
  const handleApprovalSuccess = async () => {
    if (editingUser) {
      await fetchUserInvestments(editingUser.id);
    }
  };

  // Função para visualizar comprovante
  const handleViewReceipt = async (investmentId: string) => {
    setLoadingReceipt(true);
    try {
      // Buscar comprovantes do investimento
      const response = await fetch(`/api/pix-receipts?transactionId=${investmentId}`);
      const data = await response.json();

      if (!data.success || !data.data || data.data.length === 0) {
        toast({
          title: "Comprovante não encontrado",
          description: "Não foi possível encontrar o comprovante para este investimento.",
          variant: "destructive"
        });
        return;
      }

      // Tentar todos os comprovantes até encontrar um que funcione
      for (let i = 0; i < data.data.length; i++) {
        const receipt = data.data[i];
        
        const viewResponse = await fetch(`/api/pix-receipts/view?receiptId=${receipt.id}`);
        const viewData = await viewResponse.json();

        if (viewData.success && viewData.data.signed_url) {
          setSelectedReceipt({
            investmentId,
            receiptUrl: viewData.data.signed_url,
            fileName: receipt.file_name
          });
          setReceiptModalOpen(true);
          return; // Sair do loop se encontrou um comprovante válido
        }
      }
      
      // Se chegou aqui, nenhum comprovante funcionou
      toast({
        title: "Erro ao visualizar comprovante",
        description: "Nenhum dos comprovantes encontrados pôde ser visualizado. Verifique se os arquivos existem no storage.",
        variant: "destructive"
      });
    } catch (error: any) {
      console.error("❌ ERRO GERAL ao buscar comprovante:", error);
      console.error("Stack trace:", error.stack);
      toast({
        title: "Erro ao carregar comprovante",
        description: error.message || "Não foi possível carregar o comprovante.",
        variant: "destructive"
      });
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Função para alterar observações
  const handleNotesChange = (investmentId: string, notes: string) => {
    setInvestmentNotes(prev => ({
      ...prev,
      [investmentId]: notes
    }));
  };

  // Função para salvar observações
  const handleSaveNotes = async (investmentId: string) => {
    try {
      setSavingNotes(investmentId);
      const supabase = createClient();

      const notes = investmentNotes[investmentId] || '';
      
      const { error } = await supabase
        .from("investments")
        .update({ 
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", investmentId);

      if (error) {
        throw new Error(`Erro ao salvar observações: ${error.message}`);
      }

      toast({
        title: "Observações salvas!",
        description: "As observações foram salvas com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar observações:", error);
      toast({
        title: "Erro ao salvar observações",
        description: error.message || "Não foi possível salvar as observações.",
        variant: "destructive"
      });
    } finally {
      setSavingNotes(null);
    }
  };


  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, "");
    if (!numericValue) {
      return "";
    }
    const formattedValue = (Number.parseInt(numericValue) / 100).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
    return formattedValue;
  };

  const normalizedSearchTerm = searchTerm.toLowerCase();
  const filteredInvestors = myInvestors.filter((investor) => {
    const matchesName = investor.name.toLowerCase().includes(normalizedSearchTerm);
    const matchesEmail = investor.email.toLowerCase().includes(normalizedSearchTerm);
    const matchesAdvisor =
      investor.advisorName?.toLowerCase().includes(normalizedSearchTerm) ?? false;

    return matchesName || matchesEmail || matchesAdvisor;
  });

  const filteredAdvisors = myAdvisors.filter(
    (advisor) =>
      advisor.name.toLowerCase().includes(searchAdvisorTerm.toLowerCase()) ||
      advisor.email.toLowerCase().includes(searchAdvisorTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const fetchOfficeAdvisors = async (officeId: string) => {
    try {
      const supabase = createClient();

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "distributor")
        .eq("office_id", officeId)
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Erro ao buscar assessores do escritório:", profilesError);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setOfficeAdvisors([]);
        return;
      }

      const profileIds = profiles.map((p) => p.id);

      const { data: advisorInvestors } = await supabase
        .from("profiles")
        .select("id, parent_id")
        .eq("user_type", "investor")
        .in("parent_id", profileIds);

      const investorIds = advisorInvestors?.map((inv) => inv.id) ?? [];

      let investorInvestments: { user_id: string; amount: number }[] = [];
      if (investorIds.length > 0) {
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("user_id, amount")
          .eq("status", "active")
          .in("user_id", investorIds);

        if (investmentsError) {
          console.error("Erro ao buscar investimentos dos investidores do escritório:", investmentsError);
        } else {
          investorInvestments = investmentsData || [];
        }
      }

      const investmentsByInvestor = investorInvestments.reduce<Record<string, number>>(
        (acc, investment) => {
          acc[investment.user_id] = (acc[investment.user_id] || 0) + (investment.amount || 0);
          return acc;
        },
        {}
      );

      const transformed: Advisor[] = profiles.map((profile) => {
        const advisorInvestorIds =
          advisorInvestors?.filter((inv) => inv.parent_id === profile.id).map((inv) => inv.id) ||
          [];

        const advisorInvestorsCount = advisorInvestorIds.length;

        const totalCaptured = advisorInvestorIds.reduce(
          (sum, investorId) => sum + (investmentsByInvestor[investorId] || 0),
          0
        );

        const cpfFromProfile =
          profile.cnpj ||
          (profile.notes?.includes("CPF:")
            ? profile.notes.split("CPF:")[1]?.split("|")[0]?.trim()
            : "");
        const cpfDigits = cpfFromProfile ? String(cpfFromProfile).replace(/\D/g, "") : "";

        return {
          id: profile.id,
          name: profile.full_name || profile.email.split("@")[0],
          email: profile.email,
          phone: profile.phone,
          cpf: cpfDigits,
          totalCaptured,
          status: profile.is_active ? "active" : "inactive",
          joinedAt: profile.created_at,
          lastActivity: profile.updated_at || profile.created_at,
          investorsCount: advisorInvestorsCount,
          address: profile.address,
          rg: profile.rg,
          nationality: profile.nationality,
          maritalStatus: profile.marital_status,
          profession: profile.profession,
          pixKey: profile.pix_usdt_key,
          user_type: profile.user_type,
          bankName: profile.bank_name,
          bankBranch: profile.bank_branch,
          bankAccount: profile.bank_account,
        };
      });

      setOfficeAdvisors(transformed);
    } catch (error) {
      console.error("Erro ao carregar assessores do escritório:", error);
    }
  };

  useEffect(() => {
    if (!user) return;

    const advisorsForRanking =
      user.role === "escritorio"
        ? myAdvisors
        : user.role === "assessor"
        ? officeAdvisors
        : [];

    if (user.role === "assessor") {
      if (advisorsForRanking.length === 0) {
        setDistributorData((prev) => ({
          ...prev,
          ranking: {
            ...prev.ranking,
            position: 0,
            totalDistributors: 0,
            topAdvisorName: "",
            topAdvisorTotal: 0,
          },
        }));
        return;
      }

      const sorted = [...advisorsForRanking].sort(
        (a, b) => (b.totalCaptured || 0) - (a.totalCaptured || 0)
      );
      const positionIndex = sorted.findIndex((advisor) => advisor.id === user.id);

      setDistributorData((prev) => ({
        ...prev,
        ranking: {
          ...prev.ranking,
          position: positionIndex >= 0 ? positionIndex + 1 : 0,
          totalDistributors: sorted.length,
          topAdvisorName: sorted[0]?.name ?? "",
          topAdvisorTotal: sorted[0]?.totalCaptured ?? 0,
        },
      }));
    } else if (user.role === "escritorio") {
      if (myAdvisors.length === 0) {
        setDistributorData((prev) => ({
          ...prev,
          ranking: {
            ...prev.ranking,
            position: 0,
            totalDistributors: 0,
            topAdvisorName: "",
            topAdvisorTotal: 0,
          },
        }));
        return;
      }

      const sorted = [...myAdvisors].sort(
        (a, b) => (b.totalCaptured || 0) - (a.totalCaptured || 0)
      );

      setDistributorData((prev) => ({
        ...prev,
        ranking: {
          ...prev.ranking,
          position: 1,
          totalDistributors: sorted.length,
          topAdvisorName: sorted[0]?.name ?? "",
          topAdvisorTotal: sorted[0]?.totalCaptured ?? 0,
        },
      }));
    }
  }, [user, myAdvisors, officeAdvisors]);

  // Funções auxiliares para investimento
  const getAvailableLiquidityOptions = (period: number) => {
    switch (period) {
      case 3:
        return ["Mensal"];
      case 6:
        return ["Mensal", "Semestral"];
      case 12:
        return ["Mensal", "Semestral", "Anual"];
      case 24:
        return ["Mensal", "Semestral", "Anual"];
      case 36:
        return ["Mensal", "Semestral", "Anual", "Bienal", "Trienal"];
      default:
        return [];
    }
  };

  const getRateByPeriodAndLiquidity = (period: number, liquidity: string) => {
    const baseRates: Record<number, Record<string, number>> = {
      3: { "Mensal": 0.018 }, // 1.8%
      6: { "Mensal": 0.019, "Semestral": 0.02 }, // 1.9% | 2%
      12: { "Mensal": 0.021, "Semestral": 0.022, "Anual": 0.025 }, // 2.1% | 2.2% | 2.5%
      24: { "Mensal": 0.023, "Semestral": 0.025, "Anual": 0.027, "Bienal": 0.03 }, // 2.3% | 2.5% | 2.7% | 3%
      36: { "Mensal": 0.024, "Semestral": 0.026, "Anual": 0.03, "Bienal": 0.032, "Trienal": 0.035 } // 2.4% | 2.6% | 3% | 3.2% | 3.5%
    };
    
    return baseRates[period]?.[liquidity] || 0.03;
  };

  // Função para construir endereço completo
  const buildFullAddress = () => {
    const { street, number, complement, neighborhood, city, state, zipCode } = investorForm;
    const parts = [street, number, complement, neighborhood, city, state, zipCode]
      .map((part) => (part || "").trim())
      .filter((part) => part.length > 0);

    return parts.join(", ");
  };

  if (!user) return null;

  const meta1Progress = Math.min(
    (distributorData.totalCaptured / 500000) * 100,
    100
  );
  const meta2Progress = Math.min(
    (distributorData.totalCaptured / 1000000) * 100,
    100
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {user && user.role === "escritorio"
              ? "Dashboard do Escritório"
              : "Dashboard do Assessor"}
          </h2>
          <p className="text-muted-foreground">
            Acompanhe suas vendas, comissões e performance
          </p>
        </div>

        {/* Overview Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${overviewGridCols} gap-4 md:gap-6 mb-6 md:mb-8`}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Captado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-primary">
                {formatCurrency(distributorData.totalCaptured)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Comissão Mensal
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-secondary">
                {formatCurrency(distributorData.monthlyCommission)}
              </div>
              <p className="text-xs text-muted-foreground">
                Baseado na captação atual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Meus Investidores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-accent">
                {myInvestors.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Investidores cadastrados por você
              </p>
            </CardContent>
          </Card>

          {user?.role === "escritorio" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Meus Assessores
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-accent">
                  {myAdvisors.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assessores cadastrados por você
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ranking</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {user?.role === "assessor" ? (
                <>
                  <div className="text-xl md:text-2xl font-bold">
                    {distributorData.ranking.position > 0
                      ? `#${distributorData.ranking.position}`
                      : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {distributorData.ranking.totalDistributors > 0
                      ? `de ${distributorData.ranking.totalDistributors} assessores do escritório`
                      : "Aguardando dados"}
                  </p>
                  {distributorData.ranking.topAdvisorName && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Top 1: {distributorData.ranking.topAdvisorName} (
                      {formatCurrency(distributorData.ranking.topAdvisorTotal)})
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold leading-tight">
                    {distributorData.ranking.topAdvisorName || "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {distributorData.ranking.totalDistributors > 0
                      ? `Total de ${distributorData.ranking.totalDistributors} assessores`
                      : "Aguardando dados"}
                  </p>
                  {distributorData.ranking.topAdvisorName && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Captação líder: {formatCurrency(distributorData.ranking.topAdvisorTotal)}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Commission Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Divisão de Comissões</CardTitle>
              <CardDescription>
                Distribuição mensal das comissões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg space-y-2 sm:space-y-0">
                <div>
                  <h4 className="font-semibold text-primary">Assessor (3%)</h4>
                  <p className="text-sm text-muted-foreground">
                    Sua parte da comissão (Até 3 milhões)
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-primary">
                    {formatCurrency(distributorData.advisorShare)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg space-y-2 sm:space-y-0">
                <div>
                  <h4 className="font-semibold text-secondary">
                    Escritório (1%)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Parte do escritório (Até 3 milhões)
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-secondary">
                    {formatCurrency(distributorData.officeShare)}
                  </p>
                </div>
              </div>

              {distributorData.performanceBonus.additionalRate > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-accent/20 bg-accent/5 rounded-lg space-y-2 sm:space-y-0">
                  <div>
                    <h4 className="font-semibold text-accent">
                      Bônus Performance
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      +{distributorData.performanceBonus.additionalRate}%
                      adicional
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge variant="secondary">Ativo</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {user.email === "felipe@aethosconsultoria.com.br" && (
            <Card>
              <CardHeader>
                <CardTitle>Metas de Performance</CardTitle>
                <CardDescription>
                  Progresso para bônus adicionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <span className="text-sm font-medium">
                      Meta 1: R$ 3.000.000,00
                    </span>
                    <Badge
                      variant={
                        distributorData.performanceBonus.meta1Achieved
                          ? "default"
                          : "secondary"
                      }
                    >
                      {distributorData.performanceBonus.meta1Achieved
                        ? "Atingida"
                        : "Pendente"}
                    </Badge>
                  </div>
                  <Progress value={meta1Progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Captados em contratos de D+360 dias até 06/12/2025, bônus
                    fixo de R$ 150.000,00 (cento e cinquenta mil reais) a ser
                    pago até 20/12/2025
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <span className="text-sm font-medium">
                      Meta 2: R$ 7.000.000,00
                    </span>
                    <Badge
                      variant={
                        distributorData.performanceBonus.meta2Achieved
                          ? "default"
                          : "secondary"
                      }
                    >
                      {distributorData.performanceBonus.meta2Achieved
                        ? "Atingida"
                        : "Pendente"}
                    </Badge>
                  </div>
                  <Progress value={meta2Progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Captados em contratos de D+360 dias, bônus de R$ 250.000,00
                    (duzentos e cinquenta mil reais) para a aquisição de
                    carteiras de assessores ou absorção de escritório menor em
                    processo de descontinuidade para captação voltada para a
                    presente SCP.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <span className="text-sm font-medium">
                      Meta 3: R$ 15.000.000,00
                    </span>
                    <Badge
                      variant={
                        distributorData.performanceBonus.meta2Achieved
                          ? "default"
                          : "secondary"
                      }
                    >
                      {distributorData.performanceBonus.meta2Achieved
                        ? "Atingida"
                        : "Pendente"}
                    </Badge>
                  </div>
                  <Progress value={meta2Progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Captados em contratos de D+360 dias, bônus de fixo de R$
                    300.000,00 (trezentos mil reais) após 120 dias do
                    atingimento da meta.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <span className="text-sm font-medium">
                      Meta 4: R$ 30.000.000,00
                    </span>
                    <Badge
                      variant={
                        distributorData.performanceBonus.meta2Achieved
                          ? "default"
                          : "secondary"
                      }
                    >
                      {distributorData.performanceBonus.meta2Achieved
                        ? "Atingida"
                        : "Pendente"}
                    </Badge>
                  </div>
                  <Progress value={meta2Progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Captados em contratos de D+360 dias, bônus de R$ 350.000,00
                    (trezentos e cinquenta mil reais) para a aquisição de
                    carteiras de assessores ou absorção de escritório menor em
                    processo de descontinuidade para captação voltada para a
                    presente SCP.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <span className="text-sm font-medium">
                      Meta 5: R$ 50.000.000,00
                    </span>
                    <Badge
                      variant={
                        distributorData.performanceBonus.meta2Achieved
                          ? "default"
                          : "secondary"
                      }
                    >
                      {distributorData.performanceBonus.meta2Achieved
                        ? "Atingida"
                        : "Pendente"}
                    </Badge>
                  </div>
                  <Progress value={meta2Progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Captados em contratos de D+360 dias, bônus de participação
                    societária minoritária (equity) de 5% (cinco por cento) em
                    estrutura da AKINTEC, devendo ser ajustado por aditivo
                    contratual.
                  </p>
                </div>

                {distributorData.ranking.poolShare > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Pool Nacional</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sua participação no pool dos top escritórios:
                    </p>
                    <p className="font-bold text-accent">
                      {formatCurrency(distributorData.ranking.poolShare)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sales Chart */}
        <Card className="mb-6 md:mb-8">
          <CardHeader>
            <CardTitle>Evolução de Vendas</CardTitle>
            <CardDescription>
              Captação mensal nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart distributorId={user?.id} />
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${tabsGridCols}`}>
            <TabsTrigger value="simulator" className="text-sm">
              Simulador
            </TabsTrigger>
            <TabsTrigger value="commissions" className="text-sm">
              Minhas Comissões
            </TabsTrigger>
            <TabsTrigger value="investors" className="text-sm">
              Meus Investidores
            </TabsTrigger>
            {showContractsTab && (
              <TabsTrigger value="contracts" className="text-sm">
                Contratos
              </TabsTrigger>
            )}
            {user?.role === "escritorio" && (
              <TabsTrigger value="advisors" className="text-sm">
                Meus Assessores
              </TabsTrigger>
            )}
            <TabsTrigger value="register" className="text-sm">
              {user?.role === "escritorio" ? "Cadastrar Usuário" : "Cadastrar Investidor"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CommissionSimulator />

              <InvestmentSimulator title="Simule o investimento do cliente" />
            </div>
          </TabsContent>

          <TabsContent value="commissions">
            <AdvisorCommissionsDetail />
          </TabsContent>

          <TabsContent value="investors">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meus Investidores</CardTitle>
                    <CardDescription>
                      Lista de investidores cadastrados por você
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {myInvestors.length} investidores
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loadingInvestors ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Carregando investidores...
                    </p>
                  </div>
                ) : filteredInvestors.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? "Nenhum investidor encontrado"
                        : "Você ainda não cadastrou nenhum investidor"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        {user?.role === "escritorio" && (
                          <TableHead>Assessor Responsável</TableHead>
                        )}
                        <TableHead>Total Investido</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvestors.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell className="font-medium">
                            {investor.name}
                          </TableCell>
                          <TableCell>{investor.email}</TableCell>
                          {user?.role === "escritorio" && (
                            <TableCell>
                              {investor.advisorName ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">{investor.advisorName}</span>
                                  {investor.advisorEmail && (
                                    <span className="text-xs text-muted-foreground">
                                      {investor.advisorEmail}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">--</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {formatCurrency(investor.totalInvested)}
                          </TableCell>
                          <TableCell>
                            {new Date(investor.joinedAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(investor)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {showContractsTab && (
            <TabsContent value="contracts">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Contratos dos Meus Investidores</CardTitle>
                      <CardDescription>
                        Visualize e gerencie os contratos vinculados aos investidores da sua carteira.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {totalContracts} {totalContracts === 1 ? "contrato" : "contratos"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadContractsOverview()}
                        disabled={loadingContractsOverview}
                        className="flex items-center gap-2"
                      >
                        {loadingContractsOverview ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Atualizar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por investidor, email ou contrato..."
                        value={contractsSearchTerm}
                        onChange={(event) => setContractsSearchTerm(event.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {contractsOverviewError && (
                    <p className="mb-4 text-sm text-destructive">{contractsOverviewError}</p>
                  )}

                  {loadingContractsOverview ? (
                    <div className="py-10 text-center">
                      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
                      <p className="text-muted-foreground">Carregando contratos...</p>
                    </div>
                  ) : totalContracts === 0 ? (
                    <div className="py-12 text-center">
                      <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nenhum contrato encontrado para os seus investidores.
                      </p>
                    </div>
                  ) : filteredContractsOverview.length === 0 ? (
                    <div className="py-12 text-center">
                      <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nenhum contrato corresponde à busca atual.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investidor</TableHead>
                            <TableHead>Contrato</TableHead>
                            <TableHead>Arquivo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredContractsOverview.map(
                            ({ investorId, investorName, investorEmail, contract }) => {
                              const statusLabel =
                                contract.status === "active"
                                  ? "Ativo"
                                  : contract.status === "pending"
                                  ? "Pendente"
                                  : contract.status ?? "Desconhecido";

                              let statusVariant: "default" | "secondary" | "outline" = "outline";

                              if (contract.status === "active") {
                                statusVariant = "default";
                              } else if (contract.status === "pending") {
                                statusVariant = "secondary";
                              }

                              return (
                                <TableRow key={`${investorId}-${contract.id}`}>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{investorName}</span>
                                      {investorEmail && (
                                        <span className="text-xs text-muted-foreground">
                                          {investorEmail}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="max-w-xs">
                                    <p className="font-medium">{contract.contract_name}</p>
                                    {contract.uploaded_by_profile?.full_name && (
                                      <p className="text-xs text-muted-foreground">
                                        Enviado por {contract.uploaded_by_profile.full_name}
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-sm">{contract.file_name}</p>
                                    {contract.file_size ? (
                                      <p className="text-xs text-muted-foreground">
                                        {(contract.file_size / (1024 * 1024)).toFixed(2)} MB
                                      </p>
                                    ) : null}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={statusVariant}>
                                      {statusLabel}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {contract.created_at
                                      ? new Date(contract.created_at).toLocaleDateString("pt-BR")
                                      : "--"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadContract(contract)}
                                        title="Baixar contrato"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void viewContract(contract)}
                                        title="Visualizar contrato"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {user?.role === "escritorio" && (
            <TabsContent value="advisors">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Meus Assessores</CardTitle>
                      <CardDescription>
                        Lista de assessores cadastrados por você
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {myAdvisors.length} assessores
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchAdvisorTerm}
                        onChange={(e) => setSearchAdvisorTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {loadingAdvisors ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Carregando assessores...
                      </p>
                    </div>
                  ) : filteredAdvisors.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchAdvisorTerm
                          ? "Nenhum assessor encontrado"
                          : "Você ainda não cadastrou nenhum assessor"}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data de Cadastro</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAdvisors.map((advisor) => (
                          <TableRow key={advisor.id}>
                            <TableCell className="font-medium">
                              {advisor.name}
                            </TableCell>
                            <TableCell>{advisor.email}</TableCell>
                            <TableCell>{advisor.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  advisor.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {advisor.status === "active"
                                  ? "Ativo"
                                  : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(advisor.joinedAt).toLocaleDateString(
                                "pt-BR"
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(advisor)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  {user.role === "escritorio" ? "Cadastrar Assessor" : "Cadastrar Novo Investidor"}
                </CardTitle>
                <CardDescription>
                  {user.role === "escritorio" 
                    ? "Cadastre um novo assessor para o seu escritório."
                    : "Cadastre um novo investidor na plataforma. Ele será automaticamente associado a você como assessor."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleCreateInvestor}
                  className="max-w-full space-y-6"
                >
                  {/* Switch para escolher tipo de usuário (apenas para escritório) */}
                  {user.role === "escritorio" ? null : user.role === "assessor" ? (
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <Label className="mb-0 block text-base font-semibold">
                        Investidor
                      </Label>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <Label className="mb-3 block text-base font-semibold">
                        Tipo de Usuário
                      </Label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="userType"
                            value="investor"
                            checked={userType === "investor"}
                            onChange={(e) => {
                              setUserType(e.target.value as "investor" | "advisor");
                              setCurrentStep(0);
                            }}
                            className="w-4 h-4"
                          />
                          <span>Investidor</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="userType"
                            value="advisor"
                            checked={userType === "advisor"}
                            onChange={(e) => {
                              setUserType(e.target.value as "investor" | "advisor");
                              setCurrentStep(0);
                            }}
                            className="w-4 h-4"
                          />
                          <span>Assessor</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-3">
                      {visibleSteps.map((step, index) => {
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;

                        return (
                          <div
                            key={step}
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                              isActive
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : isCompleted
                                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                : "border-border text-muted-foreground"
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
                      onClick={resetInvestorForm}
                      disabled={submittingInvestor}
                      className="bg-transparent"
                    >
                      Limpar
                    </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreviousStep}
                        disabled={currentStep === 0}
                      >
                        Voltar
                      </Button>
                    </div>
                    {isLastStep ? (
                    <Button type="submit" disabled={submittingInvestor}>
                      {submittingInvestor ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                            <UserPlus className="mr-2 h-4 w-4" />
                          {userType === "investor" ? "Cadastrar Investidor" : "Cadastrar Assessor"}
                        </>
                      )}
                    </Button>
                    ) : (
                      <Button type="button" onClick={handleNextStep} disabled={submittingInvestor}>
                        Avancar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code PIX Gerado
              </DialogTitle>
              <DialogDescription>
                Use o QR Code abaixo ou copie o código PIX para realizar o
                pagamento.
              </DialogDescription>
            </DialogHeader>

            {qrCodeData && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={qrCodeData.qrCode || "/placeholder.svg"}
                    alt="QR Code PIX"
                    className="w-64 h-64 border rounded-lg"
                  />
                </div>

                {qrCodeData.paymentString && (
                  <div className="space-y-2">
                    <Label>Código PIX (Copia e Cola)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={qrCodeData.paymentString}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyPixCode}
                        className="shrink-0 bg-transparent"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setShowQRModal(false)}>Fechar</Button>
                </div>
              </div>
            )}

            {generatingQR && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Gerando QR Code...</span>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição de Perfil */}
        <Dialog
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open);
            if (!open) {
              setEditingUser(null);
              setEditBankSearchTerm("");
              setIsEditBankListOpen(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Editar Perfil do Usuário
              </DialogTitle>
              <DialogDescription>
                Edite as informações do usuário selecionado.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                {editingUser && ('totalInvested' in editingUser || editingUser.user_type === 'investor') && (
                  <>
                    <TabsTrigger value="contracts">Contratos</TabsTrigger>
                    <TabsTrigger value="investments">Investimentos</TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="profile">
                <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="editFullName">Nome Completo *</Label>
                        <Input
                          id="editFullName"
                          value={editForm.fullName}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              fullName: e.target.value,
                            }))
                          }
                          placeholder="Nome completo do usuário"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editEmail">Email *</Label>
                        <Input
                          id="editEmail"
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="email@exemplo.com"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editPhone">Telefone</Label>
                        <Input
                          id="editPhone"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="(11) 99999-9999"
                        />
                      </div>

                      <div>
                        <Label htmlFor="editNationality">Nacionalidade *</Label>
                        <Input
                          id="editNationality"
                          value={editForm.nationality}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              nationality: e.target.value,
                            }))
                          }
                          placeholder="Brasileira"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editMaritalStatus">Estado Civil *</Label>
                        <select
                          id="editMaritalStatus"
                          value={editForm.maritalStatus}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              maritalStatus: e.target.value,
                            }))
                          }
                          className="w-full border rounded-md p-2"
                          required
                        >
                          <option value="">Selecione o estado civil</option>
                          <option value="solteiro">Solteiro(a)</option>
                          <option value="casado">Casado(a)</option>
                          <option value="divorciado">Divorciado(a)</option>
                          <option value="viuvo">Viúvo(a)</option>
                          <option value="uniao_estavel">União Estável</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="editProfession">Profissão *</Label>
                        <Input
                          id="editProfession"
                          value={editForm.profession}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              profession: e.target.value,
                            }))
                          }
                          placeholder="Ex: Engenheiro, Médico, Advogado..."
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Documentos e Acesso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="editCpf">CPF *</Label>
                        <Input
                          id="editCpf"
                          value={editForm.cpf}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              cpf: e.target.value,
                            }))
                          }
                          onBlur={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              cpf: formatCpfCnpj(e.target.value),
                            }))
                          }
                          placeholder="000.000.000-00"
                          maxLength={18}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editRg">RG *</Label>
                        <Input
                          id="editRg"
                          value={editForm.rg}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              rg: e.target.value,
                            }))
                          }
                          placeholder="00.000.000-0"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Endereço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="editStreet">Rua *</Label>
                        <Input
                          id="editStreet"
                          value={editForm.street}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              street: e.target.value,
                            }))
                          }
                          placeholder="Nome da rua"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editNumber">Número *</Label>
                        <Input
                          id="editNumber"
                          value={editForm.number}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              number: e.target.value,
                            }))
                          }
                          placeholder="123"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editNeighborhood">Bairro *</Label>
                        <Input
                          id="editNeighborhood"
                          value={editForm.neighborhood}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              neighborhood: e.target.value,
                            }))
                          }
                          placeholder="Nome do bairro"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editCity">Cidade *</Label>
                        <Input
                          id="editCity"
                          value={editForm.city}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                          placeholder="Nome da cidade"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editState">Estado *</Label>
                        <Input
                          id="editState"
                          value={editForm.state}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              state: e.target.value,
                            }))
                          }
                          placeholder="SP"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="editZipCode">CEP *</Label>
                        <Input
                          id="editZipCode"
                          value={editForm.zipCode}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              zipCode: e.target.value,
                            }))
                          }
                          placeholder="00000-000"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pagamento e Dados Bancários</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="editPixKey">
                        Chave PIX ou Endereço USDT *
                      </Label>
                      <Input
                        id="editPixKey"
                        value={editForm.pixKey}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            pixKey: e.target.value,
                          }))
                        }
                        placeholder="Chave PIX (CPF, email, telefone) ou endereço USDT"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editBankName">Banco</Label>
                      <div className="relative">
                        <Input
                          id="editBankName"
                          value={editBankSearchTerm}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditBankSearchTerm(value);
                            setEditForm((prev) => ({
                              ...prev,
                              bankName: value,
                            }));
                            setIsEditBankListOpen(true);
                          }}
                          onFocus={() => setIsEditBankListOpen(true)}
                          onBlur={() => {
                            setTimeout(() => setIsEditBankListOpen(false), 150);
                          }}
                          placeholder={
                            isLoadingBanks ? "Carregando bancos..." : "Digite nome ou código do banco"
                          }
                          disabled={isLoadingBanks}
                        />
                        {isEditBankListOpen && (
                          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md">
                            {isLoadingBanks ? (
                              <div className="p-3 text-sm text-muted-foreground">
                                Carregando bancos...
                              </div>
                            ) : (() => {
                                const filteredBanks = banks.filter((bank) =>
                                  `${bank.code} ${bank.name}`
                                    .toLowerCase()
                                    .includes(editBankSearchTerm.toLowerCase())
                                );
                                if (filteredBanks.length === 0) {
                                  return (
                                    <div className="p-3 text-sm text-muted-foreground">
                                      Nenhum banco encontrado.
                                    </div>
                                  );
                                }
                                return filteredBanks.map((bank) => (
                                  <button
                                    key={bank.code}
                                    type="button"
                                    className={`flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                                      editBankSearchTerm === `${bank.code} - ${bank.name}`
                                        ? "bg-accent/60"
                                        : ""
                                    }`}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      handleSelectEditBank(bank.code);
                                    }}
                                  >
                                    <span className="font-medium">{bank.code}</span>
                                    <span className="text-muted-foreground">{bank.name}</span>
                                  </button>
                                ));
                              })()}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Digite parte do nome ou código para localizar o banco.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editBankBranch">Agência</Label>
                        <Input
                          id="editBankBranch"
                          value={editForm.bankBranch}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              bankBranch: e.target.value,
                            }))
                          }
                          placeholder="0001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editBankAccount">Conta</Label>
                        <Input
                          id="editBankAccount"
                          value={editForm.bankAccount}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              bankAccount: e.target.value,
                            }))
                          }
                          placeholder="000000-0"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditBankSearchTerm("");
                        setIsEditBankListOpen(false);
                      }}
                      disabled={submittingEdit}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submittingEdit}>
                      {submittingEdit ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Aba de Contratos */}
              {editingUser && ('totalInvested' in editingUser || editingUser.user_type === 'investor') && (
                <TabsContent value="contracts">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Contratos do Investidor</h3>

                    {loadingContracts ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Carregando contratos...</p>
                      </div>
                    ) : userContracts.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum contrato encontrado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userContracts.map((contract) => (
                          <Card key={contract.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-blue-500" />
                                  <div>
                                    <p className="font-medium">{contract.contract_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {contract.file_name} • {(contract.file_size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(contract.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadContract(contract)}
                                    title="Baixar contrato"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewContract(contract)}
                                    title="Visualizar contrato"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Aba de Investimentos */}
              {editingUser && ('totalInvested' in editingUser || editingUser.user_type === 'investor') && (
                <TabsContent value="investments">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-lg font-semibold">Investimentos do Investidor</h3>
                      {editingUser?.user_type === 'investor' && (
                        <Button
                          size="sm"
                          onClick={openNewInvestmentModal}
                          className="w-full md:w-auto"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Adicionar investimento
                        </Button>
                      )}
                    </div>
                    {editingUser?.user_type === 'investor' && (
                      <p className="text-sm text-muted-foreground">
                        Cadastre novos aportes para este investidor a qualquer momento.
                      </p>
                    )}
                    
                    {/* Resumo dos investimentos */}
                    {userInvestments.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Investido</p>
                                <p className="text-2xl font-bold">
                                  {formatCurrency(
                                    userInvestments.reduce((sum, inv) => sum + inv.amount, 0)
                                  )}
                                </p>
                              </div>
                              <DollarSign className="h-8 w-8 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Investimentos Ativos</p>
                                <p className="text-2xl font-bold text-green-600">
                                  {userInvestments.filter(inv => inv.status === 'active').length}
                                </p>
                              </div>
                              <TrendingUp className="h-8 w-8 text-green-600" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                  {userInvestments.filter(inv => inv.status === 'pending').length}
                                </p>
                              </div>
                              <Loader2 className="h-8 w-8 text-yellow-600" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Rejeitados</p>
                                <p className="text-2xl font-bold text-red-600">
                                  {userInvestments.filter(inv => inv.status === 'rejected').length}
                                </p>
                              </div>
                              <X className="h-8 w-8 text-red-600" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {loadingInvestments ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Carregando investimentos...</p>
                      </div>
                    ) : userInvestments.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum investimento encontrado</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Este investidor ainda não possui investimentos cadastrados.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {userInvestments.map((investment) => (
                          <Card key={investment.id}>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Valor Investido</p>
                                  <p className="text-lg font-semibold">
                                    {formatCurrency(investment.amount)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Taxa Mensal</p>
                                  <p className="text-lg font-semibold">
                                    {(investment.monthly_return_rate * 100).toFixed(2)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                                  <Badge 
                                    variant={
                                      investment.status === 'active' 
                                        ? 'default' 
                                        : investment.status === 'pending'
                                        ? 'secondary'
                                        : investment.status === 'rejected'
                                        ? 'destructive'
                                        : 'outline'
                                    }
                                  >
                                    {investment.status === 'active' 
                                      ? 'Ativo' 
                                      : investment.status === 'pending'
                                      ? 'Pendente'
                                      : investment.status === 'rejected'
                                      ? 'Rejeitado'
                                      : investment.status === 'withdrawn'
                                      ? 'Resgatado'
                                      : 'Inativo'
                                    }
                                  </Badge>
                                </div>
                              </div>
                              <div className="mt-4 space-y-3">
                                <div className="text-sm text-muted-foreground">
                                  <p>Prazo: {investment.commitment_period} meses</p>
                                  <p>Criado em: {new Date(investment.created_at).toLocaleDateString('pt-BR')}</p>
                                  {investment.updated_at !== investment.created_at && (
                                    <p>Atualizado em: {new Date(investment.updated_at).toLocaleDateString('pt-BR')}</p>
                                  )}
                                </div>
                                
                                {/* Ações de aprovação para investimentos pendentes */}
                                {investment.status === 'pending' && (
                                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-amber-600 mb-2">
                                        ⚠️ Investimento aguardando aprovação
                                      </p>
                                      <p className="text-xs text-muted-foreground mb-3">
                                        Verifique se o investidor possui:
                                      </p>
                                      <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                                        <li>• Data de pagamento registrada</li>
                                        <li>• Comprovante de transferência anexado</li>
                                      </ul>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveInvestment(investment)}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <Check className="w-4 h-4 mr-2" />
                                        Aprovar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleRejectInvestment(investment.id)}
                                        disabled={rejectingInvestment === investment.id}
                                      >
                                        {rejectingInvestment === investment.id ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <X className="w-4 h-4 mr-2" />
                                        )}
                                        Rejeitar
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Status de aprovação para investimentos aprovados/rejeitados */}
                                {investment.status === 'active' && (
                                  <div className="pt-3 border-t space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Check className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-600 font-medium">
                                        Investimento aprovado
                                      </span>
                                    </div>
                                    
                                    {/* Botão para visualizar comprovante */}
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewReceipt(investment.id)}
                                        disabled={loadingReceipt}
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                                      >
                                        {loadingReceipt ? (
                                          <>
                                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
                                            Carregando...
                                          </>
                                        ) : (
                                          <>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Ver Comprovante
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    
                                    {/* Input para observações */}
                                    <div className="space-y-2">
                                      <Label htmlFor={`notes-${investment.id}`} className="text-sm font-medium">
                                        Observações
                                      </Label>
                                      <div className="flex gap-2">
                                        <Input
                                          id={`notes-${investment.id}`}
                                          placeholder="Adicione observações sobre este investimento..."
                                          value={investmentNotes[investment.id] || ''}
                                          onChange={(e) => handleNotesChange(investment.id, e.target.value)}
                                          className="flex-1"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveNotes(investment.id)}
                                          disabled={savingNotes === investment.id}
                                        >
                                          {savingNotes === investment.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Check className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {investment.status === 'rejected' && (
                                  <div className="flex items-center gap-2 pt-3 border-t">
                                    <X className="w-4 h-4 text-red-600" />
                                    <span className="text-sm text-red-600 font-medium">
                                      Investimento rejeitado
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showNewInvestmentModal}
          onOpenChange={(open) => {
            setShowNewInvestmentModal(open);
            if (!open) {
              resetNewInvestmentForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Novo investimento
              </DialogTitle>
              <DialogDescription>
                Configure um novo aporte para o investidor selecionado. Você poderá aprovar o investimento após o pagamento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="newInvestmentAmount">Valor do investimento</Label>
                  <Input
                    id="newInvestmentAmount"
                    value={newInvestmentForm.amount}
                    onChange={(event) =>
                      setNewInvestmentForm((prev) => ({
                        ...prev,
                        amount: formatCurrencyInput(event.target.value),
                      }))
                    }
                    placeholder="R$ 5.000,00"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mínimo de R$ 5.000,00
                  </p>
                </div>

                <div>
                  <Label htmlFor="newInvestmentPeriod">Prazo de investimento</Label>
                  <select
                    id="newInvestmentPeriod"
                    value={newInvestmentForm.commitmentPeriod}
                    onChange={(event) =>
                      setNewInvestmentForm((prev) => ({
                        ...prev,
                        commitmentPeriod: event.target.value,
                        liquidity: "",
                      }))
                    }
                    className="w-full rounded-md border p-2"
                  >
                    <option value="">Selecione o prazo</option>
                    <option value="3">3 meses</option>
                    <option value="6">6 meses</option>
                    <option value="12">12 meses</option>
                    <option value="24">24 meses</option>
                    <option value="36">36 meses</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="newInvestmentLiquidity">Liquidez da rentabilidade</Label>
                  <select
                    id="newInvestmentLiquidity"
                    value={newInvestmentForm.liquidity}
                    onChange={(event) =>
                      setNewInvestmentForm((prev) => ({
                        ...prev,
                        liquidity: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border p-2"
                    disabled={!newInvestmentForm.commitmentPeriod}
                  >
                    <option value="">Selecione a liquidez</option>
                    {getAvailableLiquidityOptions(
                      Number(newInvestmentForm.commitmentPeriod)
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {newInvestmentForm.commitmentPeriod &&
                    newInvestmentForm.liquidity && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Taxa estimada:{" "}
                        {(getRateByPeriodAndLiquidity(
                          Number(newInvestmentForm.commitmentPeriod),
                          newInvestmentForm.liquidity
                        ) * 100).toFixed(2)}
                        % a.m.
                      </p>
                    )}
                </div>
              </div>

              {newInvestmentForm.amount &&
                newInvestmentForm.commitmentPeriod &&
                newInvestmentForm.liquidity &&
                Number.parseFloat(
                  newInvestmentForm.amount.replace(/[^\d,]/g, "").replace(",", ".")
                ) >= 5000 && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <h4 className="mb-2 font-semibold text-emerald-800">
                      Projeção do retorno
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Retorno mensal</p>
                        <p className="text-lg font-semibold text-emerald-700">
                          {formatCurrency(
                            Number.parseFloat(
                              newInvestmentForm.amount.replace(/[^\d,]/g, "").replace(",", ".")
                            ) *
                              getRateByPeriodAndLiquidity(
                                Number(newInvestmentForm.commitmentPeriod),
                                newInvestmentForm.liquidity
                              )
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Retorno total ({newInvestmentForm.commitmentPeriod} meses)
                        </p>
                        <p className="text-lg font-semibold text-emerald-700">
                          {formatCurrency(
                            Number.parseFloat(
                              newInvestmentForm.amount.replace(/[^\d,]/g, "").replace(",", ".")
                            ) *
                              getRateByPeriodAndLiquidity(
                                Number(newInvestmentForm.commitmentPeriod),
                                newInvestmentForm.liquidity
                              ) *
                              Number(newInvestmentForm.commitmentPeriod)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor final estimado</p>
                        <p className="text-lg font-semibold text-emerald-700">
                          {formatCurrency(
                            Number.parseFloat(
                              newInvestmentForm.amount.replace(/[^\d,]/g, "").replace(",", ".")
                            ) +
                              Number.parseFloat(
                                newInvestmentForm.amount.replace(/[^\d,]/g, "").replace(",", ".")
                              ) *
                                getRateByPeriodAndLiquidity(
                                  Number(newInvestmentForm.commitmentPeriod),
                                  newInvestmentForm.liquidity
                                ) *
                                Number(newInvestmentForm.commitmentPeriod)
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-red-600">
                      Resgates antes do prazo têm multa de <strong>20%</strong> e perda da rentabilidade.
                    </p>
                  </div>
                )}

              <div className="flex items-center gap-3 rounded-md border border-muted p-3">
                <Switch
                  id="generatePixAfterCreate"
                  checked={generatePixAfterCreate}
                  onCheckedChange={setGeneratePixAfterCreate}
                />
                <Label
                  htmlFor="generatePixAfterCreate"
                  className="text-sm text-muted-foreground"
                >
                  Gerar QR Code PIX automaticamente após criar o investimento
                </Label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewInvestmentModal(false);
                    resetNewInvestmentForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateInvestmentForInvestor}
                  disabled={createInvestmentLoading}
                >
                  {createInvestmentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Registrar investimento
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Aprovação de Investimento */}
        {selectedInvestment && (
          <ApproveInvestmentModal
            isOpen={approveModalOpen}
            onClose={() => {
              setApproveModalOpen(false)
              setSelectedInvestment(null)
            }}
            investmentId={selectedInvestment.id}
            investmentAmount={selectedInvestment.amount}
            investorName={selectedInvestment.investorName}
            onSuccess={handleApprovalSuccess}
          />
        )}

        {/* Modal para Visualizar Comprovante */}
        <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Comprovante de Pagamento
              </DialogTitle>
              <DialogDescription>
                Visualize o comprovante de pagamento do investimento
              </DialogDescription>
            </DialogHeader>

            {selectedReceipt && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Arquivo: {selectedReceipt.fileName}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedReceipt.receiptUrl, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReceiptModalOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  {selectedReceipt.receiptUrl.endsWith('.pdf') ? (
                    <iframe
                      src={selectedReceipt.receiptUrl}
                      className="w-full h-96"
                      title="Comprovante PDF"
                    />
                  ) : (
                    <img
                      src={selectedReceipt.receiptUrl}
                      alt="Comprovante de pagamento"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal para Visualizar Contrato - Usando a mesma lógica do admin */}
        {contractViewerOpen && selectedContract && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              pointerEvents: 'auto'
            }}
            onClick={() => setContractViewerOpen(false)}
          >
            <div 
              className="w-full max-w-7xl max-h-[90vh] flex items-center justify-center"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <PDFViewer
                contractId={selectedContract.id}
                fileName={selectedContract.file_name}
                fileType={selectedContract.file_type}
                onClose={() => setContractViewerOpen(false)}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
