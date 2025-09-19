"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { CommissionSimulator } from "./commission-simulator";
import { SalesChart } from "./sales-chart";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserData {
  id: string;
  name: string;
  email: string;
  user_type: string;
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
}

interface QRCodeData {
  qrCode: string;
  paymentString: string;
  originalData: any;
}

export function DistributorDashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [myInvestors, setMyInvestors] = useState<Investor[]>([]);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [investorForm, setInvestorForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    confirmPassword: "",
    investmentValue: "",
    rescueTerm: "",
    profitability: "",
  });

  const [submittingInvestor, setSubmittingInvestor] = useState(false);

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

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
    },
  });

  useEffect(() => {
    if (myInvestors.length === 0) return;

    const totalCaptured = myInvestors.reduce(
      (sum, inv) => sum + inv.totalInvested,
      0
    );

    const advisorShare = totalCaptured * 0.02; // Exemplo
    const officeShare = totalCaptured * 0.01;

    const baseCommissionRate = user?.role === "escritorio" ? 0.01 : 0.03 // 3% monthly
    const monthlyCommission = totalCaptured * baseCommissionRate
    const annualCommission = monthlyCommission * 12

    setDistributorData((prev) => ({
      ...prev,
      totalCaptured,
      monthlyCommission: monthlyCommission, // Exemplo de comissão
      annualCommission: annualCommission, // Exemplo
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
        position: 2, // exemplo estático ou cálculo real
        totalDistributors: 10,
        poolShare: totalCaptured * 0.02,
      },
    }));
  }, [myInvestors]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      fetchMyInvestors(userData.id);
    }
  }, []);

  const fetchMyInvestors = async (distributorId: string) => {
    let profilesWithInvestments: any[] = [];
    try {
      setLoadingInvestors(true);
      const supabase = createClient();

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "investor")
        .eq("parent_id", distributorId)
        .order("created_at", { ascending: false });

      if (!profilesError && profiles.length > 0) {
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

        console.log("AQUI", profilesWithInvestments);
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

        return {
          id: profile.id,
          name: profile.full_name || profile.email.split("@")[0],
          email: profile.email,
          phone: profile.phone,
          cpf: profile.notes?.includes("CPF:")
            ? profile.notes.split("CPF:")[1]?.split("|")[0]?.trim()
            : "",
          totalInvested,
          status: profile.is_active ? "active" : "inactive",
          joinedAt: profile.created_at,
          lastActivity: profile.updated_at || profile.created_at,
        };
      });

      setMyInvestors(transformedInvestors);
    } catch (error) {
      console.error("Erro ao buscar investidores:", error);
    } finally {
      setLoadingInvestors(false);
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

      const supabase = createClient();

      console.log("[v0] Criando usuário no Supabase Auth...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: investorForm.email,
        password: investorForm.password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/dashboard`,
          data: {
            full_name: investorForm.fullName,
            user_type: "investor",
            phone: investorForm.phone,
            parent_id: user?.id || null,
            cpf_cnpj: investorForm.cpf,
            notes: `CPF: ${investorForm.cpf}`,
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
            rescue_type: investorForm.rescueTerm,
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

      console.log("[v0] Criando investimento na tabela investments...");
      const { data: investmentData, error: investmentError } =
        await supabase.rpc("create_investment_for_user", {
          p_user_id: authData.user.id, // ou o id do investidor que o assessor quer criar
          p_amount: Number(investmentValue),
          p_status: "pending",
          p_quota_type: "senior",
          p_monthly_return_rate: 0.03,
          p_commitment_period: 12,
        });

      if (investmentError) {
        console.error("Erro ao criar investimento:", investmentError);
      } else {
        console.log("Investimento criado:", investmentData);
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
        password: "",
        confirmPassword: "",
        investmentValue: "",
        rescueTerm: "",
        profitability: "",
      });
      setShowInvestorModal(false);

      if (user?.id) {
        setTimeout(() => fetchMyInvestors(user.id), 2000);
      }
    } catch (error: any) {
      console.error("Erro ao cadastrar investidor:", error);
      toast({
        title: "Erro ao cadastrar investidor",
        description:
          error.message || "Não foi possível cadastrar o investidor.",
        variant: "destructive",
      });
    } finally {
      setSubmittingInvestor(false);
    }
  };

  
  const generateQRCode = async (value: number, cpf: string) => {
    try {
      setGeneratingQR(true);

      console.log("[v0] Gerando QR Code PIX para:", { value, cpf });

      const response = await fetch("/api/external/generate-qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value, cpf }),
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
        description: "O QR Code para pagamento foi gerado com sucesso.",
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

  const filteredInvestors = myInvestors.filter(
    (investor) =>
      investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
            {user?.role === "escritorio" ? "Dashboard do Escritório" : "Dashboard do Investidor"}
          </h2>
          <p className="text-muted-foreground">
            Acompanhe suas vendas, comissões e performance
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ranking</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                {distributorData.ranking.position > 0
                  ? `#${distributorData.ranking.position}`
                  : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {distributorData.ranking.totalDistributors > 0
                  ? `de ${distributorData.ranking.totalDistributors} distribuidores`
                  : "Aguardando dados"}
              </p>
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
                  <h4 className="font-semibold text-primary">Assessor (75%)</h4>
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
                    Escritório (25%)
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

          {user.email === "felipecamargo222@gmail.com" && (
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
        <Tabs defaultValue="simulator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simulator" className="text-sm">
              Simulador
            </TabsTrigger>
            <TabsTrigger value="investors" className="text-sm">
              Meus Investidores
            </TabsTrigger>
            <TabsTrigger value="register" className="text-sm">
              Cadastrar Investidor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator">
            <CommissionSimulator />
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
                        <TableHead>Telefone</TableHead>
                        <TableHead>Total Investido</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvestors.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell className="font-medium">
                            {investor.name}
                          </TableCell>
                          <TableCell>{investor.email}</TableCell>
                          <TableCell>{investor.phone || "-"}</TableCell>
                          <TableCell>
                            {formatCurrency(investor.totalInvested)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                investor.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {investor.status === "active"
                                ? "Ativo"
                                : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(investor.joinedAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Cadastrar Novo Investidor
                </CardTitle>
                <CardDescription>
                  Cadastre um novo investidor na plataforma. Ele será
                  automaticamente associado a você como assessor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleCreateInvestor}
                  className="space-y-4 max-w-2xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label htmlFor="investmentValue">
                        Valor do Investimento * (mínimo R$ 5.000,00)
                      </Label>
                      <Input
                        id="investmentValue"
                        value={investorForm.investmentValue}
                        onChange={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setInvestorForm((prev) => ({
                            ...prev,
                            investmentValue: formatted,
                          }));
                        }}
                        placeholder="R$ 5.000,00"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="rescueTerm">Prazo de Resgate *</Label>
                      <select
                        id="rescueTerm"
                        value={investorForm.rescueTerm}
                        onChange={(e) => {
                          const term = e.target.value;
                          let profitability = "";
                          switch (term) {
                            case "D+60":
                              profitability = "2% a.m.";
                              break;
                            case "D+90":
                              profitability = "2,5% a.m.";
                              break;
                            case "D+180":
                              profitability = "3% a.m.";
                              break;
                            case "D+360":
                              profitability = "3,5% a.m.";
                              break;
                          }
                          setInvestorForm((prev) => ({
                            ...prev,
                            rescueTerm: term,
                            profitability,
                          }));
                        }}
                        className="w-full border rounded-md p-2"
                        required
                      >
                        <option value="">Selecione o prazo</option>
                        <option value="D+60">D+60</option>
                        <option value="D+90">D+90</option>
                        <option value="D+180">D+180</option>
                        <option value="D+360">D+360</option>
                      </select>
                    </div>

                    {/* Exibir rentabilidade dinâmica */}
                    {/* {investorForm.profitability ? (
                      <p className="mt-2 text-sm text-green-700">
                        Rentabilidade estimada:{" "}
                        <strong>{investorForm.profitability}</strong>
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-red-700">
                        Escolha um prazo de resgate
                      </p>
                    )} */}

                    {/* Aviso de multa */}
                    <p className="mt-1 text-sm text-red-600">
                      Resgates antes do prazo terão multa de{" "}
                      <strong>20%</strong> + perda da rentabilidade.
                    </p>

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

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setInvestorForm({
                          fullName: "",
                          email: "",
                          phone: "",
                          cpf: "",
                          password: "",
                          confirmPassword: "",
                          investmentValue: "",
                          rescueTerm: "",
                          profitability: "",
                        });
                      }}
                      disabled={submittingInvestor}
                      className="bg-transparent"
                    >
                      Limpar
                    </Button>
                    <Button type="submit" disabled={submittingInvestor}>
                      {submittingInvestor ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Cadastrar Investidor
                        </>
                      )}
                    </Button>
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
      </div>
    </div>
  );
}
