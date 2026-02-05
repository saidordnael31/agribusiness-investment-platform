"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft, Eye, EyeOff, ChevronRight, Info, ExternalLink } from "lucide-react";
import { getUserTypeFromId } from "@/lib/user-type-utils";
import { getRentabilityConfig, type RentabilityConfig } from "@/lib/rentability-utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REGISTRATION_STEPS = ["Tipo de Usuário", "Dados Gerais", "Endereço", "Dados Bancários"];
const STEPS_SEM_TIPO = ["Dados Gerais", "Endereço", "Dados Bancários"];

interface UserTypeRelation {
  child_user_type_id: number;
  child_user_type: string;
  child_display_name: string;
  role: string;
}

interface FormData {
  selectedUserTypeId: number | null;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  pixKey: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  notes: string;
}

export function UserRegistrationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRelations, setIsLoadingRelations] = useState(true);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userTypeId, setUserTypeId] = useState<number | null>(null);
  const [availableRelations, setAvailableRelations] = useState<UserTypeRelation[]>([]);
  const [selectedRelation, setSelectedRelation] = useState<UserTypeRelation | null>(null);
  const [rentabilityConfig, setRentabilityConfig] = useState<RentabilityConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [viewingConfigFor, setViewingConfigFor] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUserTypes, setAllUserTypes] = useState<any[]>([]);
  const [userTypesWithConfig, setUserTypesWithConfig] = useState<Map<number, { config: RentabilityConfig | null; conditions: any[]; userType: any }>>(new Map());
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isBankListOpen, setIsBankListOpen] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState("");

  const [formData, setFormData] = useState<FormData>({
    selectedUserTypeId: null,
    name: "",
    email: "",
    cpfCnpj: "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    pixKey: "",
    bankName: "",
    agency: "",
    accountNumber: "",
    notes: "",
  });

  // Carregar usuário logado
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  // Carregar lista de bancos
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

  // Verificar se é admin e buscar user_type_id
  useEffect(() => {
    const checkAdminAndLoadUserType = async () => {
      if (!user?.id) return;

      try {
        const { validateAdminAccess } = await import("@/lib/client-permission-utils");
        const admin = await validateAdminAccess(user.id);
        setIsAdmin(admin);

        if (admin) {
          // Admin pode criar qualquer tipo - buscar todos os user_types
          const supabase = createClient();
          const { data: userTypes, error } = await supabase
            .from("user_types")
            .select("id, name, display_name, user_type")
            .order("display_name");

          if (!error && userTypes) {
            setAllUserTypes(userTypes);
            setIsLoadingRelations(false);
            return;
          }
        }

        // Buscar user_type_id do usuário logado
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type_id")
          .eq("id", user.id)
          .single();

        if (profile?.user_type_id) {
          setUserTypeId(profile.user_type_id);
        }
      } catch (error) {
        console.error("Erro ao verificar admin/user_type:", error);
        setIsLoadingRelations(false);
      }
    };

    checkAdminAndLoadUserType();
  }, [user]);

  // Buscar relações disponíveis
  useEffect(() => {
    const fetchRelations = async () => {
      if (!userTypeId && !isAdmin) {
        setIsLoadingRelations(false);
        return;
      }

      try {
        setIsLoadingRelations(true);
        const supabase = createClient();

        if (isAdmin) {
          // Admin pode criar qualquer tipo - já temos allUserTypes
          setIsLoadingRelations(false);
          return;
        }

        // Buscar relações onde o usuário logado é pai
        const { data: relations, error } = await supabase.rpc(
          "get_user_type_relations_all",
          { p_user_type_id: userTypeId }
        );

        if (error) {
          console.error("Erro ao buscar relações:", error);
          toast({
            title: "Erro",
            description: "Erro ao buscar tipos de usuários disponíveis.",
            variant: "destructive",
          });
          setIsLoadingRelations(false);
          return;
        }

        // Filtrar relações onde o usuário é pai (role: "parent")
        const childRelations = (relations || []).filter(
          (rel: any) => rel.role === "parent"
        ) as UserTypeRelation[];

        setAvailableRelations(childRelations);

        // Se houver apenas uma relação, selecionar automaticamente e pular etapa de seleção
        if (childRelations.length === 1) {
          setSelectedRelation(childRelations[0]);
          setFormData((prev) => ({
            ...prev,
            selectedUserTypeId: childRelations[0].child_user_type_id,
          }));
          await loadRentabilityConfig(childRelations[0].child_user_type_id);
          setCurrentStep(1); // Ir direto para Dados Gerais
        }
      } catch (error) {
        console.error("Erro ao buscar relações:", error);
        toast({
          title: "Erro",
          description: "Erro ao buscar tipos de usuários disponíveis.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingRelations(false);
      }
    };

    if (userTypeId || isAdmin) {
      fetchRelations();
    }
  }, [userTypeId, isAdmin]);

  // Carregar configuração de rentabilidade e condições para um tipo
  const loadRentabilityConfigAndConditions = async (userTypeId: number) => {
    try {
      const supabase = createClient();
      const userType = await getUserTypeFromId(userTypeId);
      
      let config: RentabilityConfig | null = null;
      let conditions: any[] = [];

      if (userType?.rentability_id) {
        config = await getRentabilityConfig(userType.rentability_id);
      }

      // Buscar condições do user_type
      const { data: conditionsData } = await supabase
        .from("user_type_conditions")
        .select("condition_id, conditions(*)")
        .eq("user_type_id", userTypeId);

      if (conditionsData) {
        conditions = conditionsData.map((item: any) => item.conditions).filter(Boolean);
      }

      setUserTypesWithConfig(prev => {
        const newMap = new Map(prev);
        newMap.set(userTypeId, { config, conditions, userType });
        return newMap;
      });

      return { config, conditions, userType };
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      return { config: null, conditions: [], userType: null };
    }
  };

  // Carregar configuração de rentabilidade (para compatibilidade)
  const loadRentabilityConfig = async (userTypeId: number) => {
    const result = await loadRentabilityConfigAndConditions(userTypeId);
    setRentabilityConfig(result.config);
  };

  // Carregar todas as configurações quando relações são carregadas
  useEffect(() => {
    const loadAllConfigs = async () => {
      if (isLoadingRelations) return;

      const typesToLoad: number[] = [];
      
      if (isAdmin && allUserTypes.length > 0) {
        typesToLoad.push(...allUserTypes.map(ut => ut.id));
      } else if (availableRelations.length > 0) {
        typesToLoad.push(...availableRelations.map(rel => rel.child_user_type_id));
      }

      for (const typeId of typesToLoad) {
        await loadRentabilityConfigAndConditions(typeId);
      }
    };

    loadAllConfigs();
  }, [isLoadingRelations, isAdmin, allUserTypes, availableRelations]);

  // Quando há apenas 1 tipo (admin ou escritório), pular etapa de seleção
  useEffect(() => {
    if (isLoadingRelations) return;
    const singleType =
      (!isAdmin && availableRelations.length === 1) ||
      (isAdmin && allUserTypes.length === 1);
    if (singleType) {
      if (isAdmin && allUserTypes.length === 1) {
        const ut = allUserTypes[0];
        setSelectedRelation({
          child_user_type_id: ut.id,
          child_user_type: ut.user_type || ut.name,
          child_display_name: ut.display_name,
          role: "parent",
        });
        setFormData((prev) => ({ ...prev, selectedUserTypeId: ut.id }));
        loadRentabilityConfig(ut.id);
      }
      setCurrentStep(1);
    }
  }, [isLoadingRelations, isAdmin, availableRelations, allUserTypes]);

  // Abrir modal de detalhes
  const handleViewDetails = async (userTypeId: number) => {
    setViewingConfigFor(userTypeId);
    
    // Se ainda não tiver carregado, carregar agora
    if (!userTypesWithConfig.has(userTypeId)) {
      await loadRentabilityConfigAndConditions(userTypeId);
    }
    
    const typeData = userTypesWithConfig.get(userTypeId);
    if (typeData) {
      setRentabilityConfig(typeData.config);
    }
    
    setShowConfigModal(true);
  };

  // Selecionar tipo de usuário
  const handleSelectUserType = async (relation: UserTypeRelation | null, userTypeId?: number) => {
    if (isAdmin && userTypeId) {
      // Admin selecionando diretamente um user_type_id
      const userType = allUserTypes.find((ut) => ut.id === userTypeId);
      if (userType) {
        setSelectedRelation({
          child_user_type_id: userType.id,
          child_user_type: userType.user_type || userType.name,
          child_display_name: userType.display_name,
          role: "parent",
        });
        setFormData((prev) => ({
          ...prev,
          selectedUserTypeId: userType.id,
        }));
        await loadRentabilityConfig(userType.id);
      }
    } else if (relation) {
      setSelectedRelation(relation);
      setFormData((prev) => ({
        ...prev,
        selectedUserTypeId: relation.child_user_type_id,
      }));
      await loadRentabilityConfig(relation.child_user_type_id);
    }
  };

  // Validação de CEP
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

  const handleSelectBank = (bankCode: string) => {
    const bank = banks.find((item) => item.code === bankCode);
    const displayName = bank ? `${bank.code} - ${bank.name}` : "";
    setFormData((prev) => ({
      ...prev,
      bankName: displayName,
    }));
    setBankSearchTerm(displayName);
    setIsBankListOpen(false);
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
      if (data.erro) {
        throw new Error("CEP não encontrado.");
      }

      setFormData((prev) => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch (error: any) {
      toast({
        title: "Erro ao buscar CEP",
        description: error.message || "Não foi possível buscar o endereço.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingCep(false);
    }
  };

  // Validação de passo
  const validateStep = (step: number): boolean => {
    if (step === 0) {
      if (!formData.selectedUserTypeId) {
        toast({
          title: "Tipo de usuário obrigatório",
          description: "Selecione o tipo de usuário a ser criado.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (step === 1) {
      const missing: string[] = [];
      if (!formData.name) missing.push("Nome");
      if (!formData.email) missing.push("Email");
      if (!formData.cpfCnpj) missing.push("CPF/CNPJ");

      if (missing.length > 0) {
        toast({
          title: "Campos obrigatórios",
          description: `Preencha os campos: ${missing.join(", ")}.`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, REGISTRATION_STEPS.length - 1));
  };

  const hasSingleType =
    (!isAdmin && availableRelations.length === 1) ||
    (isAdmin && allUserTypes.length === 1);
  const effectiveSteps = hasSingleType ? STEPS_SEM_TIPO : REGISTRATION_STEPS;

  const handlePreviousStep = () => {
    if (hasSingleType && currentStep === 1) return;
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Só criar usuário se estiver no último passo
    if (currentStep !== REGISTRATION_STEPS.length - 1) {
      return;
    }

    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { generateTemporaryPassword } = await import("@/lib/password-utils");
      const temporaryPassword = generateTemporaryPassword(12);

      // Buscar informações do user_type selecionado
      const selectedUserType = await getUserTypeFromId(formData.selectedUserTypeId);
      if (!selectedUserType) {
        throw new Error("Tipo de usuário não encontrado");
      }

      // Determinar parent_id, distributor_id e office_id baseado na hierarquia
      let finalParentId: string | null = user?.id || null;
      let distributorId: string | null = null;
      let officeId: string | null = null;

      // Buscar perfil do usuário logado para determinar hierarquia
      if (user?.id) {
        const { data: loggedUserProfile } = await supabase
          .from("profiles")
          .select("id, user_type_id, distributor_id, office_id, role")
          .eq("id", user.id)
          .single();

        if (loggedUserProfile) {
          // Determinar hierarquia baseado no tipo de usuário sendo criado
          const userTypeName = selectedUserType.user_type || selectedUserType.name;

          if (userTypeName === "office") {
            // Escritório: parent_id = distribuidor, distributor_id = distribuidor
            distributorId = loggedUserProfile.id;
            officeId = null;
          } else if (userTypeName === "advisor") {
            // Assessor: parent_id = escritório, office_id = escritório, distributor_id do escritório
            officeId = loggedUserProfile.id;
            finalParentId = loggedUserProfile.id;
            distributorId = loggedUserProfile.distributor_id || null;
          } else if (userTypeName === "investor") {
            // Investidor: parent_id = assessor, buscar office_id e distributor_id do assessor
            // Se o usuário logado for assessor, usar seus dados
            if (loggedUserProfile.role === "assessor" || loggedUserProfile.role === "assessor_externo") {
              officeId = loggedUserProfile.office_id || null;
              distributorId = loggedUserProfile.distributor_id || null;
            } else {
              // Se for escritório ou distribuidor, usar seus dados
              distributorId = loggedUserProfile.distributor_id || loggedUserProfile.id;
              if (loggedUserProfile.role === "escritorio") {
                officeId = loggedUserProfile.id;
              }
            }
          } else {
            // Para outros tipos, usar valores padrão
            distributorId = loggedUserProfile.distributor_id || loggedUserProfile.id;
            officeId = loggedUserProfile.office_id || null;
          }
        }
      }

      // Determinar role baseado no user_type
      // O role pode ser diferente do user_type (ex: user_type="distributor", role="escritorio")
      let role = selectedUserType.user_type || selectedUserType.name;
      // Se o name for diferente do user_type, usar o name como role (para compatibilidade)
      if (selectedUserType.name && selectedUserType.name !== selectedUserType.user_type) {
        // Mapear alguns casos específicos
        if (selectedUserType.user_type === "office") {
          role = "escritorio";
        } else if (selectedUserType.user_type === "advisor") {
          // Se o name contém "externo", usar "assessor_externo", senão "assessor"
          role = selectedUserType.name.toLowerCase().includes("externo") ? "assessor_externo" : "assessor";
        } else if (selectedUserType.user_type === "distributor") {
          role = "distribuidor";
        } else {
          role = selectedUserType.name;
        }
      }

      // Mapear user_type para valores permitidos pela constraint CHECK
      // A constraint só permite: 'investor', 'distributor', 'admin'
      // Como user_type é apenas fallback, mapeamos para os valores permitidos
      let userTypeForConstraint = selectedUserType.user_type || selectedUserType.name;
      if (userTypeForConstraint === "office" || userTypeForConstraint === "advisor") {
        userTypeForConstraint = "distributor"; // Office e advisor são tipos de distribuidor
      } else if (userTypeForConstraint !== "investor" && userTypeForConstraint !== "admin") {
        // Se não for nenhum dos valores permitidos, usar 'distributor' como padrão
        userTypeForConstraint = "distributor";
      }

      // Criar endereço completo
      const fullAddress = [
        formData.street,
        formData.number,
        formData.complement,
        formData.neighborhood,
        formData.city,
        formData.state,
        formData.zipCode,
      ]
        .filter(Boolean)
        .join(", ");

      // Criar usuário via API route (usa service role, não afeta sessão atual)
      const createUserResponse = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: temporaryPassword,
          name: formData.name,
          selectedUserTypeId: formData.selectedUserTypeId,
          userType: userTypeForConstraint,
          role: role,
          parentId: finalParentId,
          distributorId: distributorId,
          officeId: officeId,
          phone: formData.phone || null,
          cpfCnpj: formData.cpfCnpj || null,
          address: fullAddress || null,
          pixKey: formData.pixKey || null,
          bankName: formData.bankName || null,
          bankBranch: formData.agency || null,
          bankAccount: formData.accountNumber || null,
          notes: formData.notes || null,
        }),
      });

      const createUserData = await createUserResponse.json();

      if (!createUserData.success) {
        throw new Error(createUserData.error || "Erro ao criar usuário");
      }

      // Enviar senha temporária por email
      try {
        const sendPasswordResponse = await fetch("/api/auth/send-temporary-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            userName: formData.name,
            password: temporaryPassword,
          }),
        });

        const sendPasswordData = await sendPasswordResponse.json();
        if (!sendPasswordData.success) {
          console.error("Erro ao enviar senha temporária:", sendPasswordData.error);
        }
      } catch (error) {
        console.error("Erro ao enviar senha temporária:", error);
      }

      toast({
        title: "Usuário criado com sucesso!",
        description: "As credenciais foram enviadas por email.",
      });

      // Resetar formulário
      setFormData({
        selectedUserTypeId: null,
        name: "",
        email: "",
        cpfCnpj: "",
        phone: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
        pixKey: "",
        bankName: "",
        agency: "",
        accountNumber: "",
        notes: "",
      });
      setCurrentStep(hasSingleType ? 1 : 0);

      // Não redirecionar, apenas fechar o modal ou resetar o formulário
      // O usuário logado permanece na mesma página
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro ao criar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar passo atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Tipo de Usuário
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white text-lg font-semibold mb-4 block">
                Selecione o tipo de usuário
              </Label>
              {isLoadingRelations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00BC6E]" />
                </div>
              ) : isAdmin ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allUserTypes.map((userType, index) => {
                    const typeData = userTypesWithConfig.get(userType.id);
                    return (
                      <Card
                        key={userType.id}
                        className={`transition-all ${
                          formData.selectedUserTypeId === userType.id
                            ? "border-[#00BC6E] bg-[#00BC6E]/10"
                            : "border-[#003562] bg-[#01223F] hover:border-[#00BC6E]/50"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div 
                            className="cursor-pointer"
                            onClick={() => handleSelectUserType(null, userType.id)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-white font-semibold">{userType.display_name}</h3>
                                <p className="text-gray-400 text-sm">{userType.user_type || userType.name}</p>
                                {typeData?.config && (
                                  <p className="text-[#00BC6E] text-xs mt-1">
                                    Configuração {index + 1}
                                  </p>
                                )}
                                {typeData?.conditions && typeData.conditions.length > 0 && (
                                  <p className="text-blue-400 text-xs mt-1">
                                    {typeData.conditions.length} condição(ões)
                                  </p>
                                )}
                              </div>
                              {formData.selectedUserTypeId === userType.id && (
                                <div className="w-6 h-6 rounded-full bg-[#00BC6E] flex items-center justify-center">
                                  <ChevronRight className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(userType.id);
                            }}
                            className="w-full border-[#003562] bg-[#01223F] text-white hover:bg-[#003562] hover:border-[#00BC6E] text-xs mt-2"
                          >
                            <Info className="h-3 w-3 mr-2" />
                            Ver Detalhes
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : availableRelations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableRelations.map((relation, index) => {
                    const typeData = userTypesWithConfig.get(relation.child_user_type_id);
                    return (
                      <Card
                        key={relation.child_user_type_id}
                        className={`transition-all ${
                          formData.selectedUserTypeId === relation.child_user_type_id
                            ? "border-[#00BC6E] bg-[#00BC6E]/10"
                            : "border-[#003562] bg-[#01223F] hover:border-[#00BC6E]/50"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div 
                            className="cursor-pointer"
                            onClick={() => handleSelectUserType(relation)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-white font-semibold">{relation.child_display_name}</h3>
                                <p className="text-gray-400 text-sm">{relation.child_user_type}</p>
                                {typeData?.config && (
                                  <p className="text-[#00BC6E] text-xs mt-1">
                                    Configuração {index + 1}
                                  </p>
                                )}
                                {typeData?.conditions && typeData.conditions.length > 0 && (
                                  <p className="text-blue-400 text-xs mt-1">
                                    {typeData.conditions.length} condição(ões)
                                  </p>
                                )}
                              </div>
                              {formData.selectedUserTypeId === relation.child_user_type_id && (
                                <div className="w-6 h-6 rounded-full bg-[#00BC6E] flex items-center justify-center">
                                  <ChevronRight className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(relation.child_user_type_id);
                            }}
                            className="w-full border-[#003562] bg-[#01223F] text-white hover:bg-[#003562] hover:border-[#00BC6E] text-xs mt-2"
                          >
                            <Info className="h-3 w-3 mr-2" />
                            Ver Detalhes
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>Nenhum tipo de usuário disponível para criação.</p>
                </div>
              )}

              {formData.selectedUserTypeId && (
                <div className="mt-6 flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const typeId = formData.selectedUserTypeId;
                      if (typeId) {
                        handleViewDetails(typeId);
                      }
                    }}
                    className="border-[#003562] bg-[#01223F] text-white hover:bg-[#003562] hover:border-[#00BC6E]"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Ver Configuração
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 1: // Dados Gerais
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">
                Nome Completo *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="cpfCnpj" className="text-white">
                CPF/CNPJ *
              </Label>
              <Input
                id="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={(e) => setFormData((prev) => ({ ...prev, cpfCnpj: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-white">
                Telefone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-white">
                Observações
              </Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="Observações adicionais"
              />
            </div>
          </div>
        );

      case 2: // Endereço
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="zipCode" className="text-white">
                  CEP
                </Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleZipChange(e.target.value)}
                  onBlur={fetchAddressByCep}
                  className="bg-[#01223F] border-[#003562] text-white"
                  placeholder="00000-000"
                  disabled={isFetchingCep}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={fetchAddressByCep}
                  disabled={isFetchingCep}
                  className="w-full bg-[#003562] text-white hover:bg-[#00BC6E]"
                >
                  {isFetchingCep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Buscar"
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="street" className="text-white">
                Rua
              </Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="Nome da rua"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="number" className="text-white">
                  Número
                </Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, number: e.target.value }))}
                  className="bg-[#01223F] border-[#003562] text-white"
                  placeholder="123"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="complement" className="text-white">
                  Complemento
                </Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData((prev) => ({ ...prev, complement: e.target.value }))}
                  className="bg-[#01223F] border-[#003562] text-white"
                  placeholder="Apto, Bloco, etc."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="neighborhood" className="text-white">
                Bairro
              </Label>
              <Input
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) => setFormData((prev) => ({ ...prev, neighborhood: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="Nome do bairro"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-white">
                  Cidade
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  className="bg-[#01223F] border-[#003562] text-white"
                  placeholder="Nome da cidade"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-white">
                  Estado
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  className="bg-[#01223F] border-[#003562] text-white"
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        );

      case 3: // Dados Bancários
        const filteredBanks = banks.filter((bank) =>
          `${bank.code} ${bank.name}`.toLowerCase().includes(bankSearchTerm.toLowerCase())
        );

        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pixKey" className="text-white">
                Chave PIX
              </Label>
              <Input
                id="pixKey"
                value={formData.pixKey}
                onChange={(e) => setFormData((prev) => ({ ...prev, pixKey: e.target.value }))}
                className="bg-[#01223F] border-[#003562] text-white"
                placeholder="Chave PIX ou USDT"
              />
            </div>
            <div>
              <Label className="text-white">Banco</Label>
              <div className="relative">
                <Input
                  value={bankSearchTerm}
                  onChange={(e) => {
                    setBankSearchTerm(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
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
                  className="bg-[#01223F] border-[#003562] text-white"
                />
                {isBankListOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[#003562] bg-[#01223F] shadow-md">
                    {isLoadingBanks ? (
                      <div className="p-3 text-sm text-gray-400">Carregando bancos...</div>
                    ) : filteredBanks.length === 0 ? (
                      <div className="p-3 text-sm text-gray-400">Nenhum banco encontrado.</div>
                    ) : (
                      filteredBanks.map((bank) => (
                        <button
                          key={bank.code}
                          type="button"
                          className={`flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-[#003562] ${
                            formData.bankName === `${bank.code} - ${bank.name}` ? "bg-[#003562]" : ""
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectBank(bank.code);
                          }}
                        >
                          <span className="font-medium text-white">{bank.code}</span>
                          <span className="text-gray-400">{bank.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Lista oficial (BACEN/Febraban). Digite parte do nome ou código para filtrar o banco.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agency" className="text-white">
                  Agência
                </Label>
                <Input
                  id="agency"
                  value={formData.agency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, agency: e.target.value }))}
                  className="bg-[#01223F] border-[#003562] text-white"
                  placeholder="0001"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber" className="text-white">
                  Conta
                </Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  className="bg-[#01223F] border-[#003562] text-white"
                  placeholder="123456-7"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Card className="bg-[#01223F] border-[#003562] text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl font-bold">Cadastrar Novo Usuário</CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                {hasSingleType ? (effectiveSteps[currentStep - 1] ?? effectiveSteps[0]) : REGISTRATION_STEPS[currentStep]}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-white hover:bg-[#003562]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#003562]">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === 0 || isLoading}
                className="border-[#003562] text-white hover:bg-[#003562]"
              >
                Anterior
              </Button>
              <div className="flex gap-2">
                {currentStep < REGISTRATION_STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNextStep();
                    }}
                    disabled={isLoading}
                    className="bg-[#00BC6E] text-white hover:bg-[#00BC6E]/80"
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmit(e as any);
                    }}
                    disabled={isLoading}
                    className="bg-[#00BC6E] text-white hover:bg-[#00BC6E]/80"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Usuário"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal de Configuração */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="bg-[#01223F] border-[#003562] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {(() => {
                const typeId = viewingConfigFor || formData.selectedUserTypeId;
                const typeData = typeId ? userTypesWithConfig.get(typeId) : null;
                if (typeData?.userType) {
                  return `Configuração de ${typeData.userType.display_name}`;
                }
                if (selectedRelation) {
                  return `Configuração de ${selectedRelation.child_display_name}`;
                }
                return "Configuração de Tipo de Usuário";
              })()}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Detalhes da configuração de rentabilidade e comissões
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const typeId = viewingConfigFor || formData.selectedUserTypeId;
            const typeData = typeId ? userTypesWithConfig.get(typeId) : null;
            const config = typeData?.config || rentabilityConfig;
            const conditions = typeData?.conditions || [];
            const userType = typeData?.userType;

            return config ? (
            <div className="space-y-4 mt-4">
              {userType && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Tipo de Usuário</h4>
                  <p className="text-gray-300">{userType.display_name} ({userType.user_type || userType.name})</p>
                </div>
              )}
               <div>
                 <h4 className="text-white font-semibold mb-2">Configuração de Rentabilidade</h4>
                 <p className="text-[#00BC6E] font-medium">
                   {(() => {
                     const typeId = viewingConfigFor || formData.selectedUserTypeId;
                     if (isAdmin) {
                       const index = allUserTypes.findIndex(ut => ut.id === typeId);
                       return `Configuração ${index >= 0 ? index + 1 : ''}`;
                     } else {
                       const index = availableRelations.findIndex(rel => rel.child_user_type_id === typeId);
                       return `Configuração ${index >= 0 ? index + 1 : ''}`;
                     }
                   })()}
                 </p>
               </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Tipo de Taxa</h4>
                <Badge className={config.is_fixed ? "bg-green-500" : "bg-blue-500"}>
                  {config.is_fixed ? "Taxa Fixa" : "Taxa Variável"}
                </Badge>
              </div>
              {config.is_fixed && config.fixed_rate !== null && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Taxa Fixa</h4>
                  <p className="text-[#00BC6E] text-2xl font-bold">
                    {config.fixed_rate}%
                  </p>
                </div>
              )}
              {config.payout_start_days !== null && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Dias para Início do Pagamento</h4>
                  <p className="text-gray-300">D+{config.payout_start_days}</p>
                </div>
              )}
              {!config.is_fixed && config.periods && config.periods.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Taxas por Período</h4>
                  <div className="space-y-2">
                    {config.periods.map((period, idx) => (
                      <div key={idx} className="bg-[#003562] p-4 rounded-lg">
                        <p className="text-white font-semibold mb-2">{period.months} meses</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {period.rates.monthly && (
                            <div>
                              <span className="text-gray-400">Mensal:</span>{" "}
                              <span className="text-[#00BC6E]">{period.rates.monthly}%</span>
                            </div>
                          )}
                          {period.rates.semiannual && (
                            <div>
                              <span className="text-gray-400">Semestral:</span>{" "}
                              <span className="text-[#00BC6E]">{period.rates.semiannual}%</span>
                            </div>
                          )}
                          {period.rates.annual && (
                            <div>
                              <span className="text-gray-400">Anual:</span>{" "}
                              <span className="text-[#00BC6E]">{period.rates.annual}%</span>
                            </div>
                          )}
                          {period.rates.biennial && (
                            <div>
                              <span className="text-gray-400">Bienal:</span>{" "}
                              <span className="text-[#00BC6E]">{period.rates.biennial}%</span>
                            </div>
                          )}
                          {period.rates.triennial && (
                            <div>
                              <span className="text-gray-400">Trienal:</span>{" "}
                              <span className="text-[#00BC6E]">{period.rates.triennial}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {conditions.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Condições Aplicáveis</h4>
                  <div className="space-y-2">
                    {conditions.map((condition: any, idx: number) => (
                      <div key={idx} className="bg-[#003562] p-3 rounded-lg">
                        <p className="text-white font-medium">{condition.name || condition.title || `Condição ${idx + 1}`}</p>
                        {condition.description && (
                          <p className="text-gray-400 text-sm mt-1">{condition.description}</p>
                        )}
                        {condition.rentability_id && (
                          <p className="text-[#00BC6E] text-xs mt-1">
                            Possui rentabilidade específica
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhuma configuração disponível para este tipo de usuário.</p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

