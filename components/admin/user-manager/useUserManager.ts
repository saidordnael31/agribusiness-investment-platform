"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

export interface User {
  id: string;
  name: string;
  email: string;
  type: "investor" | "distributor" | "assessor" | "gestor" | "escritorio";
  status: "active" | "inactive" | "pending";
  totalInvested?: number;
  totalCaptured?: number;
  joinedAt: string;
  lastActivity: string;
}

export interface QRCodeData {
  qrCode: string;
  paymentString: string;
  originalData: any;
}

interface InvestorForm {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  assessorId: string;
  password: string;
  confirmPassword: string;
  investmentValue: string;
}

const ITEMS_PER_PAGE = 10;

export function useUserManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "investor" | "distributor" | "assessor" | "gestor" | "escritorio"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive" | "pending"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [investorForm, setInvestorForm] = useState<InvestorForm>({
    fullName: "",
    email: "",
    phone: "",
    cpf: "",
    assessorId: "",
    password: "",
    confirmPassword: "",
    investmentValue: "",
  });
  const [submittingInvestor, setSubmittingInvestor] = useState(false);
  const [assessors, setAssessors] = useState<User[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [showProfileViewModal, setShowProfileViewModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<User | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const fetchAssessors = async () => {
    try {
      const supabase = createClient();
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "assessor")
        .eq("is_active", true);

      if (error) throw error;

      const transformedAssessors: User[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.email.split("@")[0],
        email: profile.email,
        type: profile.user_type || "assessor",
        status: profile.is_active ? "active" : "inactive",
        joinedAt: profile.created_at,
        lastActivity: profile.updated_at || profile.created_at,
      }));

      setAssessors(transformedAssessors);
    } catch (error) {
      console.error("Erro ao buscar assessores:", error);
    }
  };

  const fetchUsers = async (page: number = 1, search: string = "", typeFilter: string = "all", statusFilter: string = "all") => {
    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("profiles")
        .select("*", { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (typeFilter !== "all") {
        query = query.eq("user_type", typeFilter);
      }

      if (statusFilter !== "all") {
        if (statusFilter === "active") {
          query = query.eq("is_active", true);
        } else if (statusFilter === "inactive") {
          query = query.eq("is_active", false);
        } else if (statusFilter === "pending") {
          query = query.eq("is_active", false);
        }
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);
      query = query.order("created_at", { ascending: false });

      const { data: profiles, error, count } = await query;

      if (error) {
        console.error("Erro ao buscar usuários:", error);
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive",
        });
        return;
      }

      const transformedUsers: User[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.email.split("@")[0],
        email: profile.email,
        type: profile.user_type || "investor",
        status: profile.is_active ? "active" : "inactive",
        totalInvested: profile.total_invested || 0,
        totalCaptured: profile.total_captured || 0,
        joinedAt: profile.created_at,
        lastActivity: profile.updated_at || profile.created_at,
      }));

      setUsers(transformedUsers);
      setTotalUsers(count || 0);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    fetchUsers(1, value, filterType, filterStatus);
  };

  const handleTypeFilterChange = (value: string) => {
    setFilterType(value as any);
    setCurrentPage(1);
    fetchUsers(1, searchTerm, value, filterStatus);
  };

  const handleStatusFilterChange = (value: string) => {
    setFilterStatus(value as any);
    setCurrentPage(1);
    fetchUsers(1, searchTerm, filterType, value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers(page, searchTerm, filterType, filterStatus);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "inactive":
        return "Inativo";
      case "pending":
        return "Pendente";
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "investor":
        return "Investidor";
      case "distributor":
        return "Distribuidor";
      case "assessor":
        return "Assessor";
      case "gestor":
        return "Gestor";
      case "escritorio":
        return "Escritório";
      default:
        return type;
    }
  };

  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !investorForm.fullName ||
      !investorForm.email ||
      !investorForm.password ||
      !investorForm.investmentValue
    ) {
      toast({
        title: "Campos obrigatórios",
        description:
          "Preencha todos os campos obrigatórios incluindo o valor do investimento.",
        variant: "destructive",
      });
      return;
    }

    const investmentValue = Number.parseFloat(
      investorForm.investmentValue.replace(/[^\d,]/g, "").replace(",", ".")
    );
    if (investmentValue < 5000) {
      toast({
        title: "Valor mínimo não atingido",
        description: "O valor mínimo de investimento é R$ 5.000,00.",
        variant: "destructive",
      });
      return;
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

      const [firstName, ...lastNameParts] = investorForm.fullName
        .trim()
        .split(" ");
      const lastName = lastNameParts.join(" ") || firstName;

      const registrationData = {
        firstName,
        lastName,
        email: investorForm.email,
        password: investorForm.password,
        phone: investorForm.phone,
        cpf: investorForm.cpf,
        rg: "",
        assessorId: investorForm.assessorId || null,
      };

      const response = await fetch("/api/external/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || "Erro ao cadastrar investidor na API externa"
        );
      }

      const supabase = createClient();
      const { error: localError } = await supabase.from("profiles").insert([
        {
          email: investorForm.email,
          full_name: investorForm.fullName,
          user_type: "investor",
          phone: investorForm.phone,
          cpf: investorForm.cpf,
          assessor_id: investorForm.assessorId || null,
          status: "active",
          external_id: result.data?.id || null,
        },
      ]);

      if (localError) {
        console.warn(
          "[v0] Erro ao salvar no Supabase local (mas cadastro externo foi bem-sucedido):",
          localError
        );
      }

      toast({
        title: "Investidor cadastrado!",
        description: `${investorForm.fullName} foi cadastrado com sucesso. Gerando QR Code PIX...`,
      });

      await generateQRCode(investmentValue, investorForm.cpf);

      setInvestorForm({
        fullName: "",
        email: "",
        phone: "",
        cpf: "",
        assessorId: "",
        password: "",
        confirmPassword: "",
        investmentValue: "",
      });
      setShowInvestorModal(false);

      setTimeout(() => fetchUsers(), 2000);
    } catch (error: any) {
      console.error("Erro ao cadastrar investidor:", error);
      toast({
        title: "Erro ao cadastrar investidor",
        description:
          error.message ||
          "Não foi possível cadastrar o investidor na API externa.",
        variant: "destructive",
      });
    } finally {
      setSubmittingInvestor(false);
    }
  };

  const generateQRCode = async (value: number, cpf: string) => {
    try {
      setGeneratingQR(true);

      const response = await fetch("/api/external/generate-qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          value, 
          cpf,
          email: "admin@agrinvest.com",
          userName: "Administrador"
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao gerar QR Code PIX");
      }

      setQRCodeData({
        qrCode: result.qrCode,
        paymentString: result.paymentString,
        originalData: result.originalData,
      });
      setShowQRModal(true);

      toast({
        title: "QR Code PIX gerado!",
        description: "O QR Code para pagamento foi gerado com sucesso. Um email com o código PIX foi enviado para você.",
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

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, "");
    const formattedValue = (Number.parseInt(numericValue) / 100).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
    return formattedValue;
  };

  const fetchUserCompleteData = async (userId: string) => {
    try {
      setLoadingUserData(true);
      const response = await fetch(`/api/profile?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Erro ao carregar dados do usuário');
      }
    } catch (error) {
      console.error('Erro ao buscar dados completos do usuário:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoadingUserData(false);
    }
  };

  const handleViewProfile = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUserData(user);
      setSelectedUserId(userId);
      setShowProfileViewModal(true);
    }
  };

  const handleEditProfile = async (userId: string) => {
    setSelectedUserId(userId);
    setShowProfileEditModal(true);
    
    const completeUserData = await fetchUserCompleteData(userId);
    if (completeUserData) {
      setSelectedUserData(completeUserData as any);
    }
  };

  const handleProfileSave = (updatedData: any) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === selectedUserId ? { ...user, ...updatedData } : user
      )
    );
    setShowProfileEditModal(false);
    setSelectedUserId(null);
    setSelectedUserData(null);
  };

  const handleProfileViewClose = () => {
    setShowProfileViewModal(false);
    setSelectedUserId(null);
    setSelectedUserData(null);
  };

  const handleProfileEditClose = () => {
    setShowProfileEditModal(false);
    setSelectedUserId(null);
    setSelectedUserData(null);
  };

  const handleEditFromView = () => {
    setShowProfileViewModal(false);
    setShowProfileEditModal(true);
  };

  useEffect(() => {
    fetchUsers(1, "", "all", "all");
    fetchAssessors();
  }, []);

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  return {
    users,
    loading,
    searchTerm,
    filterType,
    filterStatus,
    currentPage,
    totalPages,
    totalUsers,
    showInvestorModal,
    showCreateUserModal,
    investorForm,
    submittingInvestor,
    assessors,
    showQRModal,
    qrCodeData,
    generatingQR,
    showProfileViewModal,
    showProfileEditModal,
    selectedUserId,
    selectedUserData,
    loadingUserData,
    setShowInvestorModal,
    setShowCreateUserModal,
    setInvestorForm,
    setShowQRModal,
    setShowProfileViewModal,
    setShowProfileEditModal,
    handleSearchChange,
    handleTypeFilterChange,
    handleStatusFilterChange,
    handlePageChange,
    handleCreateInvestor,
    formatCurrencyInput,
    copyPixCode,
    handleViewProfile,
    handleEditProfile,
    handleProfileSave,
    handleProfileViewClose,
    handleProfileEditClose,
    handleEditFromView,
    formatCurrency,
    getStatusColor,
    getStatusLabel,
    getTypeLabel,
  };
}


