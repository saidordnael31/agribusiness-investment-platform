"use client";

import type React from "react";
import { Suspense, useState, useEffect } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createServerClient } from "@/lib/supabase/server";
import { apiClient } from "@/lib/api";
import { useApi, useAuth } from "@/hooks/use-api";

function RegisterFormContent({closeModal}: {closeModal: () => void}) {
  const auth = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    type: "distributor",
    role: "",
    parentId: "",
    cpfCnpj: "",
    phone: "",
    notes: "",
  });
  const [parentOptions, setParentOptions] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (formData.role && formData.role !== "escritorio") {
      loadParentOptions();
    }
  }, [formData.role]);

  const validatePersonalEmail = (email: string) => {
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "uol.com.br",
      "terra.com.br",
      "bol.com.br",
    ];
    const domain = email.split("@")[1]?.toLowerCase();

    if (!domain) return false;

    const isPersonal = personalDomains.includes(domain);
    const corporateKeywords = [
      "empresa",
      "escritorio",
      "consultoria",
      "investimentos",
      "financeira",
      "capital",
    ];
    const isCorporate = corporateKeywords.some((keyword) =>
      domain.includes(keyword)
    );

    return isPersonal && !isCorporate;
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });

    if (email && !validatePersonalEmail(email)) {
      setEmailError(
        "Use apenas email pessoal (Gmail, Yahoo, Outlook, etc.). Emails corporativos não são aceitos."
      );
    } else {
      setEmailError("");
    }
  };

  const loadParentOptions = async () => {
    const mockParentOptions = {
      escritorio: [
        { id: "1", name: "Escritório Principal", role: "escritorio" },
        { id: "2", name: "Escritório Regional", role: "escritorio" },
      ],
      gestor: [
        { id: "3", name: "João Silva", role: "gestor" },
        { id: "4", name: "Maria Santos", role: "gestor" },
      ],
      lider: [
        { id: "5", name: "Pedro Costa", role: "lider" },
        { id: "6", name: "Ana Oliveira", role: "lider" },
      ],
    };

    let parentRole = "";
    switch (formData.role) {
      case "gestor":
        parentRole = "escritorio";
        break;
      case "lider":
        parentRole = "gestor";
        break;
      case "assessor":
        parentRole = "lider";
        break;
    }

    // if (parentRole && mockParentOptions[parentRole as keyof typeof mockParentOptions]) {
    //   setParentOptions(mockParentOptions[parentRole as keyof typeof mockParentOptions])
    // }
  };

  const getProfiles = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("profiles").select("*");
    console.log(data, error);
    if (!data) return;
    setParentOptions(
      data.map((item) => ({
        id: item.id,
        name: item.full_name,
        role: item.role,
      }))
    );
  };

  useEffect(() => {
    getProfiles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log("[v0] Iniciando processo de registro");
    console.log("[v0] Dados do formulário:", formData);

    if (emailError) {
      toast({
        title: "Erro no cadastro",
        description: "Corrija o email antes de continuar.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.role !== "escritorio" && !formData.parentId) {
      toast({
        title: "Erro no cadastro",
        description: "Selecione o responsável hierárquico.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log("[v0] Registrando usuário no Supabase");

      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: formData.name,
            user_type: formData.type,
            role: formData.role,
            parent_id: formData.parentId || null,
            cpf_cnpj: formData.cpfCnpj,
            phone: formData.phone,
            notes: formData.notes,
          },
        },
      });

      if (authError) {
        console.log("[v0] Erro no Supabase:", authError);
        throw authError;
      }

      console.log("[v0] Usuário registrado com sucesso no Supabase:", authData);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata.full_name,
            user_type: authData.user.user_metadata.user_type,
            role: "investidor",
            parent_id: authData.user.user_metadata.parent_id || null,
            phone: authData.user.user_metadata.phone || null,
            cnpj: authData.user.user_metadata.cpf_cnpj || null,
            notes: "Cadastro de profile via login",
            hierarchy_level: "advisor",
            is_active: true,
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
        title: "Cadastro realizado com sucesso!",
        description: `Peça a ${formData.name} para verificar o email e confirmar a conta antes de fazer login.`,
      });

      closeModal();
    } catch (error: any) {
      console.log("[v0] Erro no registro:", error);
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro durante o cadastro.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      escritorio: "Escritório (CNPJ)",
      assessor: "Assessor",
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getParentLabel = (role: string) => {
    const labels = {
      gestor: "Escritório Responsável",
      lider: "Gestor Responsável",
      assessor: "Escritório Responsável",
    };
    return labels[role as keyof typeof labels] || "Responsável";
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold">Cadastro de Investidores</h3>
        </div>
        <p className="text-sm text-amber-700 mt-2">
          Investidores não podem se cadastrar diretamente. Apenas assessores e escritórios podem cadastrar investidores
          através do dashboard.
        </p>
      </div> */}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            placeholder="Seu nome completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Pessoal</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@gmail.com"
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            required
            className={emailError ? "border-destructive" : ""}
          />
          {emailError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {emailError}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Apenas emails pessoais são aceitos (Gmail, Yahoo, Outlook, etc.)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Tipo de Usuário</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({ ...formData, type: value, role: "", parentId: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Distribuidor/Assessor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distributor">Distribuidor/Assessor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Investidores são cadastrados pelos assessores no dashboard
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Nível Hierárquico</Label>
          <Select
            value={formData.role}
            onValueChange={(value) =>
              setFormData({ ...formData, role: value, parentId: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o nível hierárquico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="escritorio">Escritório (CNPJ)</SelectItem>
              <SelectItem value="assessor">Assessor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.role && formData.role !== "escritorio" && (
          <div className="space-y-2">
            <Label htmlFor="parentId">{getParentLabel(formData.role)}</Label>
            <Select
              value={formData.parentId}
              onValueChange={(value) =>
                setFormData({ ...formData, parentId: value })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={`Selecione ${getParentLabel(
                    formData.role
                  ).toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cpfCnpj">
            {formData.role === "escritorio" ? "CNPJ" : "CPF"}
          </Label>
          <Input
            id="cpfCnpj"
            placeholder={
              formData.role === "escritorio"
                ? "00.000.000/0001-00"
                : "000.000.000-00"
            }
            value={formData.cpfCnpj}
            onChange={(e) =>
              setFormData({ ...formData, cpfCnpj: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            placeholder="(11) 99999-9999"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
          />
        </div>

        {(formData.role === "assessor" || formData.role === "escritorio") && (
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              placeholder="Notas sobre perfil, potencial, observações..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Visível para follow-up e gestão de relacionamento
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !!emailError}
        >
          {isLoading ? "Cadastrando..." : "Criar Conta"}
        </Button>
      </form>
    </div>
  );
}

export function RegisterForm({closeModal}: {closeModal: () => void}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      }
    >
      <RegisterFormContent closeModal={closeModal} />
    </Suspense>
  );
}
