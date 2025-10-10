"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  Shield,
  Clock,
  Loader2,
  Copy,
  QrCode,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Investment {
  id: string;
  type: "senior" | "subordinada";
  amount: number;
  currentValue: number;
  monthlyReturn: number;
  createdAt: string;
}

interface QRCodeData {
  qrCode: string;
  paymentString: string;
  originalData: any;
}

export function DepositFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<"selection" | "confirmation" | "success">(
    "selection"
  );
  const [selectedInvestment, setSelectedInvestment] =
    useState<Investment | null>(null);
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

  // Mock data - em produção viria de API
  // const investments: Investment[] = [
  //   {
  //     id: "1",
  //     type: "senior",
  //     amount: 25000,
  //     currentValue: 27500,
  //     monthlyReturn: 750,
  //     createdAt: "2024-01-15",
  //   },
  //   {
  //     id: "2",
  //     type: "subordinada",
  //     amount: 50000,
  //     currentValue: 55250,
  //     monthlyReturn: 1750,
  //     createdAt: "2024-02-01",
  //   },
  // ]

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

    // Simular processamento
    // await new Promise((resolve) => setTimeout(resolve, 2000));

    // setIsProcessing(false);
    // setStep("success");

    const supabase = createClient();

    const { data: investmentData, error: investmentError } = await supabase.rpc(
      "create_investment_for_user",
      {
        p_user_id: user?.id, // ou o id do investidor que o assessor quer criar
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

    // setStep("success");
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

  // Função para obter a taxa baseada no prazo e liquidez
  const getRateByPeriodAndLiquidity = (period: number, liquidity: string): number => {
    const rates: { [key: string]: { [key: string]: number } } = {
      "3": {
        "Mensal": 0.018, // 1.8%
      },
      "6": {
        "Mensal": 0.019, // 1.9%
        "Semestral": 0.02, // 2%
      },
      "12": {
        "Mensal": 0.021, // 2.1%
        "Semestral": 0.022, // 2.2%
        "Anual": 0.025, // 2.5%
      },
      "24": {
        "Mensal": 0.023, // 2.3%
        "Semestral": 0.025, // 2.5%
        "Anual": 0.027, // 2.7%
        "Bienal": 0.03, // 3%
      },
      "36": {
        "Mensal": 0.024, // 2.4%
        "Semestral": 0.026, // 2.6%
        "Anual": 0.03, // 3%
        "Bienal": 0.035, // 3.5%
        "Trienal": 0.035, // 3.5% (igual ao bienal)
      },
    };

    return rates[period.toString()]?.[liquidity] || 0;
  };

  // Função para obter opções de liquidez disponíveis baseadas no prazo
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

  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-emerald-200">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-emerald-800">
              Depósito Realizado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-emerald-50 p-6 rounded-lg">
              <h3 className="font-semibold text-emerald-800 mb-4">
                Detalhes do Depósito
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Protocolo:</span>
                  <span className="font-mono text-sm">DEP-{Date.now()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Depósito:</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(depositAmount))}
                  </span>
                </div>
                {/* <div className="flex justify-between">
                  <span className="text-gray-600">Novo Retorno Mensal:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(
                      calculateNewReturn(
                        allInvestmentsReturn,
                        Number(depositAmount)
                      )
                    )}
                  </span>
                </div> */}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Processamento
                  </p>
                  <p className="text-sm text-blue-600">
                    Seu depósito será processado em até 1 dia útil. Os
                    rendimentos serão iniciados 30 dias após a data do depósito.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => router.push("/investor")}
                className="flex-1"
              >
                Voltar ao Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("selection");
                  setSelectedInvestment(null);
                  setDepositAmount("");
                  setCommitmentPeriod("");
                  setLiquidity("");
                }}
                className="flex-1"
              >
                Novo Depósito
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirmation") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("selection")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Confirmar Depósito
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Confirmação de Depósito Adicional</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Resumo do Depósito</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Depósito:</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(depositAmount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Mínimo:</span>
                  <span className="text-emerald-600 font-semibold">
                    R$ 5.000,00 ✓
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-4">
                Condições do Investimento
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Prazo de Investimento:</span>
                  <Badge variant="secondary">{commitmentPeriod} meses</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Liquidez da Rentabilidade:</span>
                  <Badge variant="outline">{liquidity}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxa Mensal:</span>
                  <span className="font-semibold text-blue-600">
                    {(getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity) * 100).toFixed(1)}% a.m.
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 p-6 rounded-lg">
              <h3 className="font-semibold text-emerald-800 mb-4">
                Projeção de Retorno
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Retorno Mensal:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(Number(depositAmount) * getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retorno Total ({commitmentPeriod} meses):</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(Number(depositAmount) * getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity) * Number(commitmentPeriod))}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Valor Final:</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(
                        Number(depositAmount) + (Number(depositAmount) * getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity) * Number(commitmentPeriod))
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleDepositConfirm}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? "Processando..." : "Confirmar Depósito"}
            </Button>
          </CardContent>
        </Card>

        <Dialog
          open={showQRModal}
          onOpenChange={() => {
            setShowQRModal(false);
            setStep("success");
          }}
        >
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
                  <Button
                    onClick={() => {
                      setShowQRModal(false);
                      setStep("success");
                    }}
                  >
                    Fechar
                  </Button>
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
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/investor")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Depósito Adicional</h1>
      </div>

      <div className="grid gap-6">
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Selecione o Investimento</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className={`p-6 border rounded-lg cursor-pointer transition-all ${
                    selectedInvestment?.id === investment.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedInvestment(investment)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={
                          investment.type === "senior" ? "secondary" : "default"
                        }
                      >
                        Cota{" "}
                        {investment.type === "senior"
                          ? "Sênior"
                          : "Subordinada"}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        {investment.type === "senior" ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                        <span>
                          {investment.type === "senior"
                            ? "3% a.m."
                            : "3,5% a.m."}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Investimento Inicial</p>
                      <p className="font-semibold">
                        {formatCurrency(investment.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Valor Atual</p>
                      <p className="font-semibold">
                        {formatCurrency(investment.currentValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Retorno Mensal</p>
                      <p className="font-semibold text-emerald-600">
                        {formatCurrency(investment.monthlyReturn)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card> */}

        {/* {selectedInvestment && ( */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Depósito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Valor a Depositar</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="Ex: 10000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="5000"
                step="5000"
              />
              <p className="text-sm text-gray-600 mt-1">
                Valor mínimo: R$ 5.000,00
              </p>
            </div>

            <div>
              <Label htmlFor="commitment-period">Prazo de Investimento</Label>
              <Select
                value={commitmentPeriod}
                onValueChange={(value) => {
                  setCommitmentPeriod(value);
                  setLiquidity(""); // Reset liquidez quando mudar o prazo
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prazo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                  <SelectItem value="36">36 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="liquidity">Liquidez da Rentabilidade</Label>
              <Select
                value={liquidity}
                onValueChange={setLiquidity}
                disabled={!commitmentPeriod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a liquidez" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableLiquidityOptions(Number(commitmentPeriod)).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {commitmentPeriod && (
                <p className="text-sm text-gray-600 mt-1">
                  Taxa: {(getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity) * 100).toFixed(1)}% a.m.
                </p>
              )}
            </div>


            {/* {depositAmount && Number(depositAmount) >= 5000 && (
              <div className="bg-emerald-50 p-4 rounded-lg">
                <h4 className="font-semibold text-emerald-800 mb-2">
                  Projeção do Novo Retorno
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Retorno Mensal Adicional:</span>
                    <span className="font-semibold text-emerald-600">
                      +{formatCurrency(Number(depositAmount) * 0.03)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                      <span>Novo Retorno Total:</span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(
                          calculateNewReturn(
                            allInvestmentsReturn,
                            Number(depositAmount)
                          )
                        )}
                      </span>
                    </div>
                </div>
              </div>
            )} */}

            {depositAmount && Number(depositAmount) >= 5000 && commitmentPeriod && liquidity && (
              <div className="bg-emerald-50 p-4 rounded-lg">
                <h4 className="font-semibold text-emerald-800 mb-2">
                  Projeção do Retorno
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Retorno Mensal:</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(Number(depositAmount) * getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retorno Total ({commitmentPeriod} meses):</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(Number(depositAmount) * getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity) * Number(commitmentPeriod))}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Valor Final:</span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(
                          Number(depositAmount) + (Number(depositAmount) * getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity) * Number(commitmentPeriod))
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep("confirmation")}
              disabled={!depositAmount || Number(depositAmount) < 5000 || !commitmentPeriod || !liquidity}
              className="w-full"
              size="lg"
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
        {/* )} */}
      </div>
    </div>
  );
}
