"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { getRateByPeriodAndLiquidity as getRateFromDB } from "@/lib/rentability-utils";
import { useUserType } from "@/hooks/useUserType";

export interface Investment {
  id: string;
  type: "senior" | "subordinada";
  amount: number;
  currentValue: number;
  monthlyReturn: number;
  createdAt: string;
}

export interface QRCodeData {
  qrCode: string;
  paymentString: string;
  originalData: any;
}

export function useDepositFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<"selection" | "confirmation" | "success">("selection");
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [commitmentPeriod, setCommitmentPeriod] = useState("");
  const [liquidity, setLiquidity] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [allInvestmentsReturn, setAllInvestmentsReturn] = useState(0);
  const [allInvestmentsValue, setAllInvestmentsValue] = useState(0);
  const [isExternalAdvisorInvestor, setIsExternalAdvisorInvestor] = useState(false);
  
  // Usar hook para obter user_type_id
  const { user_type_id } = useUserType(user?.id);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    const checkIfExternalAdvisorInvestor = async () => {
      try {
        if (!user?.id) return;

        const supabase = createClient();

        // Buscar perfil completo do investidor
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, parent_id, assessor_id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          setIsExternalAdvisorInvestor(false);
          return;
        }

        const advisorId = (profile as any).parent_id || (profile as any).assessor_id;
        if (!advisorId) {
          setIsExternalAdvisorInvestor(false);
          return;
        }

        // Validar acesso ao perfil do assessor antes de buscar
        const { validateUserAccess } = await import("@/lib/client-permission-utils");
        const hasAccess = await validateUserAccess(user.id, advisorId);
        
        if (!hasAccess) {
          setIsExternalAdvisorInvestor(false);
          return;
        }

        // Buscar role do assessor responsável
        const { data: advisorProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", advisorId)
          .single();

        if (advisorProfile && advisorProfile.role === "assessor_externo") {
          setIsExternalAdvisorInvestor(true);
        } else {
          setIsExternalAdvisorInvestor(false);
        }
      } catch (error) {
        console.error("Erro ao verificar assessor externo:", error);
        setIsExternalAdvisorInvestor(false);
      }
    };

    checkIfExternalAdvisorInvestor();
  }, [user]);

  const fetchInvestments = async () => {
    if (!user?.id) {
      console.error("[useDepositFlow] Usuário não autenticado");
      return;
    }

    const supabase = createClient();
    
    // Buscar apenas investimentos do usuário logado
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id);
    
    if (error) {
      console.error("[useDepositFlow] Erro ao buscar investimentos:", error);
      return;
    }
    
    if (!data) return;
    
    const allInvestmentsValues = data.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );
    setAllInvestmentsReturn(allInvestmentsValues * 0.03);
    setAllInvestmentsValue(allInvestmentsValues);
    setInvestments(data);
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleDepositConfirm = async () => {
    setIsProcessing(true);

    // Validar se o usuário pode criar investimento para si mesmo
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    const { validateCanCreateInvestmentForUser } = await import("@/lib/client-permission-utils");
    const canCreate = await validateCanCreateInvestmentForUser(user.id, user.id);
    
    if (!canCreate) {
      toast({
        title: "Erro",
        description: "Você não tem permissão para criar este investimento",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    const supabase = createClient();

    // Obter taxa de rentabilidade dinamicamente
    const monthlyRate = await getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity);

    const { data: investmentData, error: investmentError } = await supabase.rpc(
      "create_investment_for_user",
      {
        p_user_id: user.id,
        p_amount: Number(depositAmount),
        p_status: "pending",
        p_quota_type: "senior",
        p_monthly_return_rate: monthlyRate,
        p_commitment_period: Number(commitmentPeriod),
        p_profitability_liquidity: liquidity,
      }
    );

    if (investmentError) {
      console.error("Erro ao criar investimento:", investmentError);
    }

    await generateQRCode(Number(depositAmount), user?.cpf_cnpj);

    toast({
      title: "Depósito processado com sucesso!",
      description:
        "Seu depósito adicional foi registrado e será processado em até 1 dia útil.",
    });

    setIsProcessing(false);
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
          email: user?.email,
          userName: user?.name || user?.full_name
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateNewReturn = (investment: number, additionalAmount: number) => {
    const rate = 0.03;
    const newTotal = investment + additionalAmount;
    return newTotal * rate;
  };

  // Função para obter rentabilidade usando APENAS user_type_id -> rentability_id -> função get
  const getRateByPeriodAndLiquidity = async (period: number, liquidity: string): Promise<number> => {
    if (!user_type_id) {
      console.error("[useDepositFlow] user_type_id não disponível");
      return 0;
    }

    try {
      // Usar função centralizada que busca: user_type_id -> user_types.rentability_id -> get_rentability_config
      const rate = await getRateFromDB(user_type_id, period, liquidity);
      if (rate > 0) {
        return rate;
      }
      
      console.warn("[useDepositFlow] Taxa não encontrada para período", period, "e liquidez", liquidity);
      return 0;
    } catch (error) {
      console.error("[useDepositFlow] Erro ao buscar rentabilidade:", error);
      return 0;
    }
  };

  const getAvailableLiquidityOptions = (period: number): string[] => {
    const options: { [key: string]: string[] } = {
      "3": ["Mensal"],
      "6": ["Mensal", "Semestral"],
      "12": ["Mensal", "Semestral", "Anual"],
      "24": ["Mensal", "Semestral", "Anual", "Bienal"],
      "36": ["Mensal", "Semestral", "Anual", "Bienal", "Trienal"],
    };

    return options[period.toString()] || [];
  };

  const handleCommitmentPeriodChange = (value: string) => {
    setCommitmentPeriod(value);
    setLiquidity("");
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setStep("success");
  };

  const handleResetForm = () => {
    setStep("selection");
    setSelectedInvestment(null);
    setDepositAmount("");
    setCommitmentPeriod("");
    setLiquidity("");
  };

  const canContinue = depositAmount && Number(depositAmount) >= 5000 && commitmentPeriod && liquidity;

  // Cache de taxas carregadas para uso síncrono
  const [rateCache, setRateCache] = useState<Record<string, number>>({});
  
  // Carregar taxa quando commitmentPeriod ou liquidity mudarem
  useEffect(() => {
    if (commitmentPeriod && liquidity && user_type_id) {
      const cacheKey = `${commitmentPeriod}-${liquidity}`;
      if (!rateCache[cacheKey]) {
        getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity).then((rate) => {
          setRateCache((prev) => ({ ...prev, [cacheKey]: rate }));
        }).catch((error) => {
          console.warn("[useDepositFlow] Erro ao carregar taxa:", error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitmentPeriod, liquidity, user_type_id]);
  
  // Wrapper síncrono com cache para compatibilidade com código existente
  const getRateByPeriodAndLiquiditySync = (period: number, liquidity: string): number => {
    const cacheKey = `${period}-${liquidity}`;
    return rateCache[cacheKey] || 0;
  };

  return {
    user,
    step,
    selectedInvestment,
    depositAmount,
    commitmentPeriod,
    liquidity,
    isProcessing,
    showQRModal,
    qrCodeData,
    generatingQR,
    investments,
    allInvestmentsReturn,
    allInvestmentsValue,
    setStep,
    setSelectedInvestment,
    setDepositAmount,
    setCommitmentPeriod,
    setLiquidity,
    setShowQRModal,
    handleDepositConfirm,
    copyPixCode,
    formatCurrency,
    calculateNewReturn,
    getRateByPeriodAndLiquidity: getRateByPeriodAndLiquiditySync, // Versão síncrona para compatibilidade
    getRateByPeriodAndLiquidityAsync: getRateByPeriodAndLiquidity, // Versão assíncrona para novos usos
    getAvailableLiquidityOptions,
    handleCommitmentPeriodChange,
    handleCloseQRModal,
    handleResetForm,
    canContinue,
    router,
  };
}

