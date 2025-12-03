"use client";

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
  Loader2,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDepositFlow } from "./useDepositFlow";

export function DepositFlow() {
  const {
    step,
    depositAmount,
    commitmentPeriod,
    liquidity,
    isProcessing,
    showQRModal,
    qrCodeData,
    generatingQR,
    setStep,
    setDepositAmount,
    setCommitmentPeriod,
    setLiquidity,
    handleDepositConfirm,
    copyPixCode,
    formatCurrency,
    getRateByPeriodAndLiquidity,
    getAvailableLiquidityOptions,
    handleCommitmentPeriodChange,
    handleCloseQRModal,
    handleResetForm,
    canContinue,
    router,
  } = useDepositFlow();

  const getLiquidityCycleMonths = (liquidityLabel: string): number => {
    switch (liquidityLabel) {
      case "Mensal":
        return 1;
      case "Semestral":
        return 6;
      case "Anual":
        return 12;
      case "Bienal":
        return 24;
      case "Trienal":
        return 36;
      default:
        return 1;
    }
  };

  const calculateReturnsWithLiquidity = (
    principal: number,
    periodMonths: number,
    monthlyRate: number,
    liquidityLabel: string
  ) => {
    if (!principal || !periodMonths || !monthlyRate) {
      return {
        totalReturn: 0,
        finalValue: principal || 0,
      };
    }

    const cycleMonths = getLiquidityCycleMonths(liquidityLabel);

    // Se por algum motivo não tivermos ciclo, cair para juros compostos normais
    if (!cycleMonths || cycleMonths <= 0) {
      const finalValue = principal * Math.pow(1 + monthlyRate, periodMonths);
      return {
        totalReturn: finalValue - principal,
        finalValue,
      };
    }

    const fullCycles = Math.floor(periodMonths / cycleMonths);
    const remainingMonths = periodMonths % cycleMonths;

    let totalReturn = 0;

    if (fullCycles > 0) {
      const cycleFactor = Math.pow(1 + monthlyRate, cycleMonths);
      totalReturn += principal * (cycleFactor - 1) * fullCycles;
    }

    if (remainingMonths > 0) {
      const remainingFactor = Math.pow(1 + monthlyRate, remainingMonths);
      totalReturn += principal * (remainingFactor - 1);
    }

    const finalValue = principal + totalReturn;

    return {
      totalReturn,
      finalValue,
    };
  };

  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003562] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-[#00A568] rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">
              Depósito Realizado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#D9D9D9] p-6 rounded-lg">
              <h3 className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px] mb-4">
                Detalhes do Depósito
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Protocolo:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] font-mono">DEP-{Date.now()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor do Depósito:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                    {formatCurrency(Number(depositAmount))}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#D9D9D9] p-6 rounded-lg">
              <h3 className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px] mb-4">
                Processamento:
              </h3>
              <p className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                Seu depósito será processado em até um dia útil. Os rendimentos serão iniciados 30 dias após a data do depósito.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => router.push("/investor")}
                className="flex-1 text-white font-ibm-plex-sans font-bold text-lg"
                style={{ 
                  backgroundColor: '#00A568',
                  borderRadius: '11px'
                }}
              >
                Voltar ao Dashboard
              </Button>
              <Button
                onClick={handleResetForm}
                className="flex-1 text-[#003F28] font-ibm-plex-sans font-bold text-lg bg-[#D9D9D9] hover:bg-[#D9D9D9]/80"
                style={{ borderRadius: '11px' }}
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
    const monthlyRate = getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity);

    const principal = Number(depositAmount);
    const periodMonths = Number(commitmentPeriod);

    const { totalReturn, finalValue } =
      principal && monthlyRate && periodMonths && liquidity
        ? calculateReturnsWithLiquidity(principal, periodMonths, monthlyRate, liquidity)
        : { totalReturn: 0, finalValue: 0 };

    // Retorno mensal mostrado deve ser juros simples (principal * taxa mensal)
    const monthlyReturn = principal && monthlyRate ? principal * monthlyRate : 0;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("selection")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-white">
            Confirmar Depósito
          </h1>
        </div>

        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#00A568] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader>
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">
              Confirmação de Depósito Adicional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#D9D9D9] p-6 rounded-lg">
              <h3 className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px] mb-4">Resumo do Depósito</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                    {formatCurrency(Number(depositAmount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Valor Mínimo:</span>
                  <span className="text-[#00A568] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                    R$ 5.000,00 ✓
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#003562] p-6 rounded-lg">
              <h3 className="text-white font-urbanist font-bold text-[25px] leading-[28px] mb-4">
                Condições do Investimento
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Prazo do Investimento:</span>
                  <Badge className="bg-[#00A568] text-[#003F28]">{commitmentPeriod} meses</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-white font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Liquidez da Rentabilidade:</span>
                  <Badge variant="outline" className="border-white text-white">{liquidity}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-white font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Taxa Mensal:</span>
                  <span className="text-white font-ibm-plex-sans font-normal text-[20px] leading-[28px]">
                    {(monthlyRate * 100).toFixed(1)}% a.m
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#00A568] p-6 rounded-lg">
              <h3 className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px] mb-4">
                Projeção do Retorno
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Retorno Mensal:</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-right">
                    {formatCurrency(monthlyReturn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Retorno Total ({commitmentPeriod} meses):</span>
                  <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-right">
                    {formatCurrency(totalReturn)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#00BC6E] p-6 rounded-lg">
              <div className="flex justify-between">
                <span className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px]">Valor Final:</span>
                <span className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px]">
                  {formatCurrency(finalValue)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleDepositConfirm}
              disabled={isProcessing}
              className="w-full text-white font-ibm-plex-sans font-bold text-lg"
              style={{ 
                backgroundColor: '#012544',
                borderRadius: '11px'
              }}
            >
              {isProcessing ? "Processando..." : "Continuar"}
            </Button>
          </CardContent>
        </Card>

        <Dialog
          open={showQRModal}
          onOpenChange={handleCloseQRModal}
        >
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px] text-center">
                QR Code PIX Gerado
              </DialogTitle>
              <DialogDescription className="text-[#003F28] font-ibm-plex-sans font-normal text-lg text-center">
                Use o QR Code abaixo ou copie o código PIX para realizar o pagamento.
              </DialogDescription>
            </DialogHeader>

            {qrCodeData && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="border-4 border-[#00A568] rounded-lg p-2">
                    <img
                      src={qrCodeData.qrCode || "/placeholder.svg"}
                      alt="QR Code PIX"
                      className="w-64 h-64"
                    />
                  </div>
                </div>

                {qrCodeData.paymentString && (
                  <div className="space-y-3">
                    <Label className="text-[#003F28] font-ibm-plex-sans font-normal text-lg">Código PIX (Copia e Cola)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={qrCodeData.paymentString}
                        readOnly
                        className="font-mono text-sm bg-[#00A568]/20 border-[#00A568] text-[#003F28]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyPixCode}
                        className="shrink-0 bg-transparent border-[#00A568] text-[#003F28] hover:bg-[#00A568]/10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleCloseQRModal}
                    className="text-white font-ibm-plex-sans font-bold text-lg"
                    style={{ 
                      backgroundColor: '#012544',
                      borderRadius: '11px'
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

  const monthlyRate =
    commitmentPeriod && liquidity
      ? getRateByPeriodAndLiquidity(Number(commitmentPeriod), liquidity)
      : 0;

  let monthlyReturn = 0;
  let totalReturn = 0;
  let finalValue = 0;

  if (depositAmount && monthlyRate && commitmentPeriod && liquidity) {
    const principal = Number(depositAmount);
    const periodMonths = Number(commitmentPeriod);

    const result = calculateReturnsWithLiquidity(
      principal,
      periodMonths,
      monthlyRate,
      liquidity
    );
    finalValue = result.finalValue;
    totalReturn = result.totalReturn;
    // Retorno mensal exibido: juros simples (principal * taxa mensal)
    monthlyReturn = principal * monthlyRate;
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
        <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#00A568] border-0" style={{ borderRadius: '15px' }}>
          <CardHeader>
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">Configuração do Depósito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount" className="text-[#003F28] font-ibm-plex-sans font-normal text-lg">Valor a Depositar</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="Ex: 10000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="5000"
                step="5000"
                className="bg-[#D9D9D9] border-[#D9D9D9] text-[#003F28] font-ibm-plex-sans font-normal text-lg"
                style={{ width: '214px' }}
              />
              <p className="text-sm text-[#00A568] font-ibm-plex-sans font-normal mt-1">
                Valor mínimo: R$ 5.000,00
              </p>
            </div>

            <div className="flex gap-[175px]">
              <div>
                <Label htmlFor="commitment-period" className="text-[#003F28] font-ibm-plex-sans font-normal text-lg">Prazo de Investimento</Label>
                <Select
                  value={commitmentPeriod}
                  onValueChange={handleCommitmentPeriodChange}
                >
                  <SelectTrigger className="bg-[#D9D9D9] border-[#D9D9D9] text-[#003F28] font-ibm-plex-sans font-normal text-lg" style={{ width: '214px' }}>
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
                <Label htmlFor="liquidity" className="text-[#003F28] font-ibm-plex-sans font-normal text-lg">Liquidez da Rentabilidade</Label>
                <Select
                  value={liquidity}
                  onValueChange={setLiquidity}
                  disabled={!commitmentPeriod}
                >
                  <SelectTrigger className="bg-[#D9D9D9] border-[#D9D9D9] text-[#003F28] font-ibm-plex-sans font-normal text-lg" style={{ width: '214px' }}>
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
                {commitmentPeriod && liquidity && (
                  <p className="text-sm text-[#00A568] font-ibm-plex-sans font-normal mt-1">
                    Taxa: {(monthlyRate * 100).toFixed(1)}% a.m.
                  </p>
                )}
              </div>
            </div>

            {canContinue && (
              <>
                <div className="bg-[#D9D9D9] p-4 rounded-lg">
                  <h4 className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px] mb-4">
                    Projeção do Retorno
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Retorno Mensal:</span>
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-right">
                        {formatCurrency(monthlyReturn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px]">Retorno Total ({commitmentPeriod} meses):</span>
                      <span className="text-[#003F28] font-ibm-plex-sans font-normal text-[20px] leading-[28px] text-right">
                        {formatCurrency(totalReturn)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#D9D9D9] p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px]">Valor Final:</span>
                    <span className="text-[#003F28] font-urbanist font-bold text-[25px] leading-[28px]">
                      {formatCurrency(finalValue)}
                    </span>
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={() => setStep("confirmation")}
              disabled={!canContinue}
              className="w-full text-white font-ibm-plex-sans font-bold text-lg"
              style={{ 
                backgroundColor: '#012544',
                borderRadius: '11px'
              }}
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

