"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  const fetchInvestments = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("investments").select("*");
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

    const supabase = createClient();

    const { data: investmentData, error: investmentError } = await supabase.rpc(
      "create_investment_for_user",
      {
        p_user_id: user?.id,
        p_amount: Number(depositAmount),
        p_status: "pending",
        p_quota_type: "senior",
        p_monthly_return_rate: getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity),
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

  const getRateByPeriodAndLiquidity = (period: number, liquidity: string): number => {
    const rates: { [key: string]: { [key: string]: number } } = {
      "3": {
        "Mensal": 0.018,
      },
      "6": {
        "Mensal": 0.019,
        "Semestral": 0.02,
      },
      "12": {
        "Mensal": 0.021,
        "Semestral": 0.022,
        "Anual": 0.025,
      },
      "24": {
        "Mensal": 0.023,
        "Semestral": 0.025,
        "Anual": 0.027,
        "Bienal": 0.03,
      },
      "36": {
        "Mensal": 0.024,
        "Semestral": 0.026,
        "Anual": 0.03,
        "Bienal": 0.035,
        "Trienal": 0.035,
      },
    };

    return rates[period.toString()]?.[liquidity] || 0;
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
    getRateByPeriodAndLiquidity,
    getAvailableLiquidityOptions,
    handleCommitmentPeriodChange,
    handleCloseQRModal,
    handleResetForm,
    canContinue,
    router,
  };
}

