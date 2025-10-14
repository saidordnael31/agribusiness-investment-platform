"use client";

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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, X, Upload, TrendingUp } from "lucide-react";
import { ContractUpload } from "./contract-upload";
import { ContractList } from "./contract-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserInvestmentsList } from "./user-investments-list";

interface UserProfileData {
  id: string;
  email: string;
  name: string | null;
  full_name?: string | null; // Para compatibilidade com dados do UserManager
  phone: string | null;
  address: string | null;
  cnpj: string | null;
  rg: string | null;
  profession: string | null;
  marital_status: string | null;
  nationality: string | null;
  pix_usdt_key: string | null;
  user_type: string;
  type?: string; // Para compatibilidade com dados do UserManager
  role: string | null;
  status?: string; // Para compatibilidade com dados do UserManager
  is_active?: boolean; // Campo real no banco de dados
  created_at: string;
  updated_at: string;
}

interface UserProfileEditProps {
  userId: string;
  initialData?: UserProfileData;
  onSave: (data: UserProfileData) => void;
  onCancel: () => void;
}

const MARITAL_STATUS_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
];


const USER_TYPE_OPTIONS = [
  { value: "investor", label: "Investidor" },
  { value: "distributor", label: "Distribuidor" },
  { value: "assessor", label: "Assessor" },
  { value: "gestor", label: "Gestor" },
  { value: "escritorio", label: "Escritório" },
  { value: "lider", label: "Líder" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "pending", label: "Pendente" },
];

export function UserProfileEdit({
  userId,
  initialData,
  onSave,
  onCancel,
}: UserProfileEditProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingContract, setExistingContract] = useState<any>(null);
   const [formData, setFormData] = useState<Partial<UserProfileData>>({
     name: "",
     email: "",
     phone: "",
     address: "",
     profession: "",
     marital_status: "",
     nationality: "",
     pix_usdt_key: "",
     user_type: "",
     status: "",
     role: "",
     cnpj: "",
     rg: "",
   });

  useEffect(() => {
    if (initialData) {
      console.log("Initial data received:", initialData);
      const mappedData = {
        name: initialData.name || initialData.full_name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        profession: initialData.profession || "",
        marital_status: initialData.marital_status || "",
        nationality: initialData.nationality || "",
        pix_usdt_key: initialData.pix_usdt_key || "",
        user_type: initialData.user_type || initialData.type || "",
        status: initialData.status || (initialData.is_active ? "active" : "inactive"),
        role: initialData.role || "",
        cnpj: initialData.cnpj || "",
        rg: initialData.rg || "",
      };
      console.log("Mapped form data:", mappedData);
      setFormData(mappedData);
    }
  }, [initialData]);

  // Buscar contratos existentes
  useEffect(() => {
    const fetchExistingContract = async () => {
      try {
        const response = await fetch(`/api/contracts?investorId=${userId}`);
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setExistingContract(data.data[0]); // Pegar o primeiro contrato
        }
      } catch (error) {
        console.error("Error fetching contracts:", error);
      }
    };

    if (userId) {
      fetchExistingContract();
    }
  }, [userId]);

  const validateField = (
    field: keyof UserProfileData,
    value: string
  ): string => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Nome completo é obrigatório";
        if (value.trim().length < 2)
          return "Nome deve ter pelo menos 2 caracteres";
        return "";

      case "phone":
        if (value && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value)) {
          return "Telefone deve estar no formato (11) 99999-9999";
        }
        return "";

       case "pix_usdt_key":
         if (value && value.length < 10) {
           return "Chave PIX/USDT deve ter pelo menos 10 caracteres";
         }
         return "";

       case "email":
         if (!value.trim()) return "E-mail é obrigatório";
         if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
           return "E-mail deve ter um formato válido";
         }
         return "";

       case "cnpj":
         if (!value.trim()) return "CPF/CNPJ é obrigatório";
         const cleanCnpj = value.replace(/\D/g, "");
         if (cleanCnpj.length !== 11 && cleanCnpj.length !== 14) {
           return "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos";
         }
         return "";

       default:
         return "";
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

     // Validar campos obrigatórios
     const requiredFields: (keyof UserProfileData)[] = [
       "name",
       "email",
       "cnpj",
       "status",
     ];

    requiredFields.forEach((field) => {
      const value = formData[field as keyof UserProfileData];
      const stringValue = typeof value === 'string' ? value : String(value || "");
      const error = validateField(field, stringValue);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Validar campos opcionais que têm valor
    Object.keys(formData).forEach((field) => {
      const value = formData[field as keyof UserProfileData];
      const stringValue = typeof value === 'string' ? value : String(value || "");
      if (stringValue && !requiredFields.includes(field as keyof UserProfileData)) {
        const error = validateField(field as keyof UserProfileData, stringValue);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserProfileData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    // Validar formulário antes de salvar
    if (!validateForm()) {
      toast({
        title: "Dados inválidos",
        description: "Por favor, corrija os erros antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/profile?userId=${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Perfil atualizado",
          description: "Os dados do usuário foram salvos com sucesso.",
        });

        onSave(result.data);
      } else {
        throw new Error(result.error || "Erro ao salvar perfil");
      }
    } catch (error) {
      console.log("Erro ao salvar perfil:", error);
      toast({
        title: "Erro ao salvar",
        description:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando perfil...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Editar Perfil do Usuário</h1>
            <p className="text-muted-foreground">
              Alterando dados de {initialData?.name || initialData?.email}
            </p>
          </div>
        </div>
        <Button onClick={onCancel} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nome Completo */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Digite o nome completo"
            className={errors.name ? "border-destructive" : ""}
          />
           {errors.name && (
             <p className="text-sm text-destructive">{errors.name}</p>
           )}
        </div>

         {/* E-mail */}
         <div className="space-y-2">
           <Label htmlFor="email">E-mail *</Label>
           <Input
             id="email"
             value={formData.email || initialData?.email || ""}
             onChange={(e) => handleInputChange("email", e.target.value)}
             placeholder="Digite o e-mail"
             type="email"
             className={errors.email ? "border-destructive" : ""}
           />
           {errors.email && (
             <p className="text-sm text-destructive">{errors.email}</p>
           )}
         </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone || ""}
            onChange={(e) =>
              handleInputChange("phone", formatPhone(e.target.value))
            }
            placeholder="(11) 99999-9999"
            maxLength={15}
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

         {/* Tipo de Usuário */}
         <div className="space-y-2">
           <Label htmlFor="user_type">Tipo de Usuário</Label>
           <Input
             id="user_type"
             value={formData.user_type ? USER_TYPE_OPTIONS.find(opt => opt.value === formData.user_type)?.label || formData.user_type : ""}
             disabled
             className="bg-muted"
           />
           <p className="text-xs text-muted-foreground">
             O tipo de usuário não pode ser alterado
           </p>
         </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status || ""}
            onValueChange={(value) => handleInputChange("status", value)}
          >
            <SelectTrigger
              className={errors.status ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-destructive">{errors.status}</p>
          )}
        </div>

        {/* Cargo/Função */}
        <div className="space-y-2">
          <Label htmlFor="role">Cargo / Função</Label>
          <Input
            id="role"
            value={formData.role || ""}
            onChange={(e) => handleInputChange("role", e.target.value)}
            placeholder="Digite o cargo ou função"
          />
        </div>

         {/* CPF/CNPJ */}
         <div className="space-y-2">
           <Label htmlFor="cnpj">CPF / CNPJ *</Label>
           <Input
             id="cnpj"
             value={formData.cnpj || initialData?.cnpj || ""}
             onChange={(e) => handleInputChange("cnpj", e.target.value)}
             placeholder="Digite o CPF ou CNPJ"
             className={errors.cnpj ? "border-destructive" : ""}
           />
           {errors.cnpj && (
             <p className="text-sm text-destructive">{errors.cnpj}</p>
           )}
         </div>

         {/* RG */}
         <div className="space-y-2">
           <Label htmlFor="rg">RG</Label>
           <Input
             id="rg"
             value={formData.rg || initialData?.rg || ""}
             onChange={(e) => handleInputChange("rg", e.target.value)}
             placeholder="Digite o RG"
           />
         </div>

        {/* Profissão */}
        <div className="space-y-2">
          <Label htmlFor="profession">Profissão</Label>
          <Input
            id="profession"
            value={formData.profession || ""}
            onChange={(e) => handleInputChange("profession", e.target.value)}
            placeholder="Digite a profissão"
          />
        </div>

        {/* Estado Civil */}
        <div className="space-y-2">
          <Label htmlFor="marital_status">Estado Civil</Label>
          <Select
            value={formData.marital_status || ""}
            onValueChange={(value) =>
              handleInputChange("marital_status", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estado civil" />
            </SelectTrigger>
            <SelectContent>
              {MARITAL_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

         {/* Nacionalidade */}
         <div className="space-y-2">
           <Label htmlFor="nationality">Nacionalidade</Label>
           <Input
             id="nationality"
             value={formData.nationality || ""}
             onChange={(e) => handleInputChange("nationality", e.target.value)}
             placeholder="Digite a nacionalidade"
           />
         </div>
      </div>

      {/* Endereço */}
      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={(e) => handleInputChange("address", e.target.value)}
          placeholder="Digite o endereço completo"
        />
      </div>

      {/* PIX/USDT Key */}
      <div className="space-y-2">
        <Label htmlFor="pix_usdt_key">Chave PIX / USDT</Label>
        <Input
          id="pix_usdt_key"
          value={formData.pix_usdt_key || ""}
          onChange={(e) => handleInputChange("pix_usdt_key", e.target.value)}
          placeholder="Digite a chave PIX ou USDT"
          className={errors.pix_usdt_key ? "border-destructive" : ""}
        />
        {errors.pix_usdt_key && (
          <p className="text-sm text-destructive">{errors.pix_usdt_key}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Use esta chave para receber pagamentos e resgates
        </p>
      </div>

      {/* Seção de Contratos e Investimentos - Apenas para investidores */}
      {(formData.user_type === 'investor' || initialData?.user_type === 'investor') && (
        <div className="space-y-6 pt-6 border-t">
          <div>
            <h3 className="text-lg font-semibold mb-4">Contratos do Investidor</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Gerencie os contratos e documentos do investidor. Apenas administradores podem fazer upload e gerenciar contratos.
            </p>
          </div>
          
          <Tabs defaultValue="contracts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="contracts" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload de Contrato
              </TabsTrigger>
              <TabsTrigger value="investments" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Investimentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contracts" className="mt-6">
              <ContractUpload 
                investorId={userId}
                investorName={formData.name || initialData?.name || initialData?.email || "Usuário"}
                existingContract={existingContract}
                onUploadSuccess={() => {
                  // Recarregar a lista de contratos se necessário
                  window.location.reload();
                }}
              />
            </TabsContent>

            <TabsContent value="investments" className="mt-6">
              <UserInvestmentsList 
                userId={userId}
                userName={formData.name || initialData?.name || initialData?.email || "Usuário"}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-6">
        <Button onClick={onCancel} variant="outline" disabled={isSaving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
