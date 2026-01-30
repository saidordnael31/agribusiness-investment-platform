"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const REGISTRATION_STEPS = ["Gerais", "Endereço", "Dados Bancários"];

interface AdminRegisterFormProps {
  closeModal: () => void;
}

interface FormData {
  name: string;
  email: string;
  type: string;
  role: string;
  parentId: string;
  officeId: string;
  cpfCnpj: string;
  phone: string;
  rg: string;
  nationality: string;
  maritalStatus: string;
  profession: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  pixKey: string;
  bankCode: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  notes: string;
}

export function AdminRegisterForm({ closeModal }: AdminRegisterFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isBankListOpen, setIsBankListOpen] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [parentOptions, setParentOptions] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);
  const [officeOptions, setOfficeOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [advisorOptions, setAdvisorOptions] = useState<
    Array<{ id: string; name: string; office_id: string | null; distributor_id: string | null }>
  >([]);
  const [distributorOptions, setDistributorOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    type: "investor",
    role: "investor",
    parentId: "",
    officeId: "",
    cpfCnpj: "",
    phone: "",
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
    notes: "",
  });

  // Removida a validação de email pessoal - agora aceitamos qualquer domínio de email válido.

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
    setFormData((prev) => ({ ...prev, zipCode: formatted }));
  };

  const fetchAddressByCep = async () => {
    const cepDigits = sanitizeCep(formData.zipCode);
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
      setFormData((prev) => ({
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

      setFormData((prev) => ({
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

  const buildFullAddress = () => {
    const { street, number, complement, neighborhood, city, state, zipCode } = formData;
    const parts = [street, number, complement, neighborhood, city, state, zipCode]
      .map((part) => (part || "").trim())
      .filter((part) => part.length > 0);

    return parts.join(", ");
  };

  const handleSelectBank = (bankCode: string) => {
    const bank = banks.find((item) => item.code === bankCode);
    setFormData((prev) => ({
      ...prev,
      bankCode,
      bankName: bank?.name || "",
    }));
    setBankSearchTerm(bank ? `${bank.code} - ${bank.name}` : "");
    setIsBankListOpen(false);
  };

  const getProfiles = async () => {
    try {
      // Validar se é admin
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        console.error("[AdminRegisterForm] Usuário não autenticado");
        return;
      }

      const loggedUser = JSON.parse(userStr);
      const { validateAdminAccess } = await import("@/lib/client-permission-utils");
      const isAdmin = await validateAdminAccess(loggedUser.id);
      
      if (!isAdmin) {
        console.error("[AdminRegisterForm] Acesso negado: apenas administradores");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("*");
      if (!data) return;
      setParentOptions(
        data.map((item) => ({
          id: item.id,
          name: item.full_name,
          role: item.role,
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar perfis:", error);
    }
  };

  const getOffices = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_type", "distributor")
        .eq("role", "escritorio");
      
      if (error) {
        console.error("Erro ao buscar escritórios:", error);
        return;
      }
      
      if (data) {
        setOfficeOptions(
          data.map((item) => ({
            id: item.id,
            name: item.full_name || "Escritório sem nome",
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao carregar escritórios:", error);
    }
  };

  const getAdvisors = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, office_id, distributor_id")
        .eq("user_type", "distributor")
        .in("role", ["assessor", "assessor_externo"]);
      
      if (error) {
        console.error("Erro ao buscar assessores:", error);
        return;
      }
      
      if (data) {
        setAdvisorOptions(
          data.map((item) => ({
            id: item.id,
            name: item.full_name || "Assessor sem nome",
            office_id: item.office_id || null,
            distributor_id: item.distributor_id || null,
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao carregar assessores:", error);
    }
  };

  const getDistributors = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_type", "distributor")
        .eq("role", "distribuidor");
      
      if (error) {
        console.error("Erro ao buscar distribuidores:", error);
        return;
      }
      
      if (data) {
        setDistributorOptions(
          data.map((item) => ({
            id: item.id,
            name: item.full_name || "Distribuidor sem nome",
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao carregar distribuidores:", error);
    }
  };


  useEffect(() => {
    if (formData.type === "assessor" || formData.type === "assessor_externo") {
      getOffices();
      setAdvisorOptions([]);
      setDistributorOptions([]);
      setFormData((prev) => ({ ...prev, parentId: "" }));
    } else if (formData.type === "investor") {
      getAdvisors();
      setOfficeOptions([]);
      setDistributorOptions([]);
      setFormData((prev) => ({ ...prev, officeId: "", parentId: "" }));
    } else if (formData.type === "escritorio") {
      getDistributors();
      setOfficeOptions([]);
      setAdvisorOptions([]);
      setFormData((prev) => ({ ...prev, officeId: "", parentId: "" }));
    } else {
      setOfficeOptions([]);
      setAdvisorOptions([]);
      setDistributorOptions([]);
      setFormData((prev) => ({ ...prev, officeId: "", parentId: "" }));
    }
  }, [formData.type]);

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
      } finally {
        setIsLoadingBanks(false);
      }
    };

    loadBanks();
  }, []);

  useEffect(() => {
    if (!formData.bankCode) return;
    const selected = banks.find((bank) => bank.code === formData.bankCode);
    if (selected) {
      setBankSearchTerm(`${selected.code} - ${selected.name}`);
    }
  }, [formData.bankCode, banks]);

  const validateStep = (stepIndex: number) => {
    const missing: string[] = [];

    switch (stepIndex) {
      case 0: {
        if (!formData.name) missing.push("Nome completo");
        if (!formData.email) missing.push("Email");
        if (!formData.type) missing.push("Tipo de usuário");
        if (!formData.cpfCnpj) missing.push(formData.type === "escritorio" ? "CNPJ" : "CPF");
        if (formData.type === "assessor" || formData.type === "assessor_externo" || formData.type === "investor") {
          if (!formData.rg) missing.push("RG");
          if (!formData.nationality) missing.push("Nacionalidade");
          if (!formData.maritalStatus) missing.push("Estado civil");
          if (!formData.profession) missing.push("Profissão");
        }
        if (formData.type === "assessor" || formData.type === "assessor_externo") {
          if (!formData.officeId || !formData.parentId) missing.push("Escritório Responsável");
        }
        if (formData.type === "investor") {
          if (!formData.parentId) missing.push("Assessor Responsável");
        }
        if (formData.type === "escritorio") {
          if (!formData.parentId) missing.push("Distribuidor Responsável");
        }
        break;
      }
      case 1: {
        if (!formData.street) missing.push("Rua");
        if (!formData.number) missing.push("Número");
        if (!formData.neighborhood) missing.push("Bairro");
        if (!formData.city) missing.push("Cidade");
        if (!formData.state) missing.push("Estado");
        if (!formData.zipCode) {
          missing.push("CEP");
        } else if (sanitizeCep(formData.zipCode).length !== 8) {
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
        const hasPix = Boolean(formData.pixKey?.trim());
        const hasBankData =
          Boolean(formData.bankCode) ||
          Boolean(formData.agency) ||
          Boolean(formData.accountNumber);

        if (!hasPix && !hasBankData) {
          missing.push("Chave PIX ou dados bancários");
        }

        if (hasBankData) {
          const bankMissing: string[] = [];
          if (!formData.bankCode) bankMissing.push("Banco");
          if (!formData.agency) bankMissing.push("Agência");
          if (!formData.accountNumber) bankMissing.push("Conta");

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
    setCurrentStep((prev) => Math.min(prev + 1, REGISTRATION_STEPS.length - 1));
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    if (currentStep < REGISTRATION_STEPS.length - 1) {
      handleNextStep();
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { generateTemporaryPassword } = await import("@/lib/password-utils");
      const temporaryPassword = generateTemporaryPassword(12);

      // Mapear formData.type para user_type na tabela user_types
      let userTypeName = formData.type;
      
      // Mapear tipos específicos para user_type correto
      switch (formData.type) {
        case "escritorio":
          userTypeName = "office";
          break;
        case "assessor":
        case "assessor_externo":
          userTypeName = "advisor";
          break;
        default:
          // "distributor", "investor", "admin" já estão corretos
          break;
      }

      // Buscar user_type_id da tabela user_types
      const { data: userTypeData, error: userTypeError } = await supabase
        .from("user_types")
        .select("id, user_type")
        .eq("user_type", userTypeName)
        .limit(1);

      if (userTypeError || !userTypeData || userTypeData.length === 0) {
        throw new Error(`Tipo de usuário '${userTypeName}' não encontrado na tabela user_types`);
      }

      const userTypeId = userTypeData[0].id;

      // Manter userType e userRole para compatibilidade com auth metadata (se necessário)
      let userType = formData.type;
      let userRole = formData.type;

      switch (formData.type) {
        case "distributor":
          userType = "distributor";
          userRole = "distribuidor";
          break;
        case "escritorio":
          userType = "distributor";
          userRole = "escritorio";
          break;
        case "assessor":
          userType = "distributor";
          userRole = "assessor";
          break;
        case "assessor_externo":
          userType = "distributor";
          userRole = "assessor_externo";
          break;
        case "investor":
          userType = "investor";
          userRole = "investidor";
          break;
        case "admin":
        default:
          userType = "admin";
          userRole = "gestor";
          break;
      }

      let distributorId: string | null = null;
      let finalOfficeId: string | null = null;
      let finalParentId: string | null = null;
      
      // Definir parent_id e relacionamentos conforme a hierarquia
      if (formData.type === "escritorio" && formData.parentId) {
        // Escritório: parent_id = distribuidor, distributor_id = distribuidor
        finalParentId = formData.parentId;
        distributorId = formData.parentId;
        finalOfficeId = null;
      } else if ((formData.type === "assessor" || formData.type === "assessor_externo") && formData.officeId) {
        // Assessor (interno ou externo): parent_id = escritório, office_id = escritório
        finalParentId = formData.officeId;
        finalOfficeId = formData.officeId;
        
        // Buscar distributor_id do escritório
        const { data: officeProfile } = await supabase
          .from("profiles")
          .select("distributor_id")
          .eq("id", formData.officeId)
          .single();
        
        if (officeProfile) {
          distributorId = officeProfile.distributor_id || null;
        }
      } else if (formData.type === "investor" && formData.parentId) {
        // Investidor: parent_id = assessor
        finalParentId = formData.parentId;
        
        // Buscar office_id e distributor_id do assessor
        const { data: advisorProfile } = await supabase
          .from("profiles")
          .select("distributor_id, office_id, role, user_type")
          .eq("id", formData.parentId)
          .single();

        if (advisorProfile) {
          finalOfficeId = advisorProfile.office_id || null;
          distributorId = advisorProfile.distributor_id || null;
        }
      } else {
        // Para outros tipos, usar valores do formData
        finalParentId = formData.parentId || null;
        finalOfficeId = formData.officeId || null;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: temporaryPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: formData.name,
            user_type: userType,
            role: userRole,
            parent_id: finalParentId || null,
            cpf_cnpj: formData.cpfCnpj,
            phone: formData.phone,
            notes: formData.notes,
            is_pass_temp: true,
          },
        },
      });

      if (authError) throw authError;

      // Validar permissão para criar perfil
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        throw new Error("Usuário não autenticado");
      }

      const loggedUser = JSON.parse(userStr);
      const { validateCanCreateProfile, validateAdminAccess } = await import("@/lib/client-permission-utils");
      const isAdmin = await validateAdminAccess(loggedUser.id);
      
      // Se não for admin, verificar se tem permissão para criar o tipo específico
      if (!isAdmin) {
        const canCreate = await validateCanCreateProfile(loggedUser.id, formData.type);
        if (!canCreate) {
          throw new Error(`Você não tem permissão para criar perfis do tipo ${formData.type}`);
        }
      }

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user.id,
          email: formData.email,
          full_name: formData.name,
          user_type_id: userTypeId, // Usar user_type_id em vez de user_type
          user_type: userType, // Manter para compatibilidade
          role: userRole, // Manter para compatibilidade
          parent_id: finalParentId,
          office_id: finalOfficeId,
          distributor_id: distributorId,
          phone: formData.phone,
          cnpj: formData.cpfCnpj,
          rg: formData.rg || null,
          nationality: formData.nationality || null,
          marital_status: formData.maritalStatus || null,
          profession: formData.profession || null,
          address: buildFullAddress(),
          pix_usdt_key: formData.pixKey || null,
          bank_name: formData.bankName || null,
          bank_branch: formData.agency || null,
          bank_account: formData.accountNumber || null,
          notes: formData.notes || null,
          is_active: true,
          is_pass_temp: true,
        },
      ]);

      if (profileError) throw profileError;

      await fetch("/api/auth/send-temporary-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          userName: formData.name,
          password: temporaryPassword,
        }),
      });

      await fetch("/api/auth/verify-email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          userId: authData.user.id,
        }),
      });

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Senha temporária e código de verificação enviados para o email.",
      });

      closeModal();
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&userId=${encodeURIComponent(authData.user.id)}`);
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro durante o cadastro.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                  formData.type === "investor"
                    ? "Nome completo do investidor"
                    : (formData.type === "assessor" || formData.type === "assessor_externo")
                    ? "Nome completo do assessor"
                    : "Nome completo"
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="cpfCnpj">
                {formData.type === "escritorio" ? "CNPJ *" : "CPF *"}
              </Label>
              <Input
                id="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={(e) =>
                  setFormData({ ...formData, cpfCnpj: e.target.value })
                }
                placeholder={
                  formData.type === "escritorio"
                    ? "00.000.000/0001-00"
                    : "000.000.000-00"
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            {formData.type === "escritorio" && (
              <div className="md:col-span-2">
                <Label htmlFor="parentId">Distribuidor Responsável *</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o distribuidor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributorOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.type === "assessor" || formData.type === "assessor_externo" || formData.type === "investor") && (
              <>
                <div>
                  <Label htmlFor="rg">RG *</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) =>
                      setFormData({ ...formData, rg: e.target.value })
                    }
                    placeholder="00.000.000-0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nationality">Nacionalidade *</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) =>
                      setFormData({ ...formData, nationality: e.target.value })
                    }
                    placeholder="Brasileira"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="maritalStatus">Estado Civil *</Label>
                  <select
                    id="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, maritalStatus: e.target.value })
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
                    value={formData.profession}
                    onChange={(e) =>
                      setFormData({ ...formData, profession: e.target.value })
                    }
                    placeholder="Ex: Engenheiro, Médico, Advogado..."
                    required
                  />
                </div>
              </>
            )}

            {(formData.type === "assessor" || formData.type === "assessor_externo") && (
              <div className="md:col-span-2">
                <Label htmlFor="officeId">Escritório Responsável *</Label>
                <Select
                  value={formData.officeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, officeId: value, parentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o escritório" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === "investor" && (
              <div className="md:col-span-2">
                <Label htmlFor="parentId">Assessor Responsável *</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => {
                    const selectedAdvisor = advisorOptions.find(opt => opt.id === value);
                    setFormData({
                      ...formData,
                      parentId: value,
                      officeId: selectedAdvisor?.office_id || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o assessor" />
                  </SelectTrigger>
                  <SelectContent>
                    {advisorOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Mail className="h-4 w-4" />
                <p className="text-sm">
                  Uma senha temporária será gerada automaticamente e enviada por email ao usuário.
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
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                placeholder="Nome da rua"
                required
              />
            </div>

            <div>
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
                placeholder="123"
                required
              />
            </div>

            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) =>
                  setFormData({ ...formData, complement: e.target.value })
                }
                placeholder="Apartamento, sala, bloco..."
              />
            </div>

            <div>
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) =>
                  setFormData({ ...formData, neighborhood: e.target.value })
                }
                placeholder="Nome do bairro"
                required
              />
            </div>

            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Nome da cidade"
                required
              />
            </div>

            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
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
                  value={formData.zipCode}
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
          `${bank.code} ${bank.name}`
            .toLowerCase()
            .includes(bankSearchTerm.toLowerCase())
        );

        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX ou Endereço USDT</Label>
              <Input
                id="pixKey"
                value={formData.pixKey}
                onChange={(e) =>
                  setFormData({ ...formData, pixKey: e.target.value })
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
                    setFormData({ ...formData, bankCode: "", bankName: "" });
                    setIsBankListOpen(true);
                  }}
                  onFocus={() => setIsBankListOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsBankListOpen(false), 150);
                  }}
                  placeholder={
                    isLoadingBanks
                      ? "Carregando bancos..."
                      : "Digite nome ou código do banco"
                  }
                  disabled={isLoadingBanks}
                />
                {isBankListOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md">
                    {isLoadingBanks ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        Carregando bancos...
                      </div>
                    ) : filteredBanks.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        Nenhum banco encontrado.
                      </div>
                    ) : (
                      filteredBanks.map((bank) => (
                        <button
                          key={bank.code}
                          type="button"
                          className={`flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                            formData.bankCode === bank.code
                              ? "bg-accent/60"
                              : ""
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
                  value={formData.agency}
                  onChange={(e) =>
                    setFormData({ ...formData, agency: e.target.value })
                  }
                  placeholder="Ex: 0001"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Conta</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
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

  const isLastStep = currentStep === REGISTRATION_STEPS.length - 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="rounded-xl border border-[#C7F3E1] bg-white/80 p-4">
        <Label className="mb-3 block text-base font-semibold text-[#064E3B]">
          Tipo de Usuário *
        </Label>
        <RadioGroup
          value={formData.type}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              type: value,
              role: value,
              parentId: "",
              officeId: "",
            })
          }
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="admin" id="admin" />
            <Label htmlFor="admin" className="cursor-pointer">
              Administrador
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="distributor" id="distributor" />
            <Label htmlFor="distributor" className="cursor-pointer">
              Distribuidor
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="escritorio" id="escritorio" />
            <Label htmlFor="escritorio" className="cursor-pointer">
              Escritório
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="assessor" id="assessor" />
            <Label htmlFor="assessor" className="cursor-pointer">
              Assessor
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="assessor_externo" id="assessor_externo" />
            <Label htmlFor="assessor_externo" className="cursor-pointer">
              Assessor (Externo)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="investor" id="investor" />
            <Label htmlFor="investor" className="cursor-pointer">
              Investidor
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="min-h-[400px]">{renderStepContent()}</div>

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between border-t">
        <div className="flex flex-wrap gap-2">
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              "Cadastrar Usuário"
            )}
          </Button>
        ) : (
          <Button type="button" onClick={handleNextStep} disabled={isLoading}>
            Avançar
          </Button>
        )}
      </div>
    </form>
  );
}

