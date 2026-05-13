"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PatrimonySummaryProps {
  totalPatrimony: number;
  totalInvested: number;
  totalReturn: number;
  monthlyReturn: number;
  returnPercentage: number;
  monthlyReturnPercentage: number;
  loading?: boolean;
}

export function PatrimonySummary({
  totalPatrimony,
  totalInvested,
  totalReturn,
  monthlyReturn,
  returnPercentage,
  monthlyReturnPercentage,
  loading = false,
}: PatrimonySummaryProps) {
  const [showValues, setShowValues] = useState(true);

  const formatCurrency = (value: number) => {
    if (!showValues) return "R$ ••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    if (!showValues) return "••••%";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/2 mb-4" />
        <div className="h-12 bg-white/10 rounded w-3/4 mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-white/10 rounded" />
          <div className="h-16 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00BC6E]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Patrimonio Total</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-white/40" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#01223F] border-white/20 text-white">
                <p>Soma de todos os seus investimentos + rendimentos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => setShowValues(!showValues)}
        >
          {showValues ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Total Patrimony */}
      <div className="relative mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          {formatCurrency(totalPatrimony)}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          {returnPercentage >= 0 ? (
            <TrendingUp className="h-4 w-4 text-[#00BC6E]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              returnPercentage >= 0 ? "text-[#00BC6E]" : "text-red-400"
            )}
          >
            {formatPercentage(returnPercentage)} total
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative grid grid-cols-2 gap-4">
        {/* Total Invested */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
            Total Investido
          </span>
          <span className="text-base font-semibold text-white">
            {formatCurrency(totalInvested)}
          </span>
        </div>

        {/* Total Return */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
            Rendimentos
          </span>
          <span
            className={cn(
              "text-base font-semibold",
              totalReturn >= 0 ? "text-[#00BC6E]" : "text-red-400"
            )}
          >
            {formatCurrency(totalReturn)}
          </span>
        </div>

        {/* Monthly Return */}
        <div className="col-span-2 p-3 rounded-xl bg-gradient-to-r from-[#00BC6E]/10 to-cyan-500/10 border border-[#00BC6E]/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                Rendimento este mes
              </span>
              <span className="text-lg font-bold text-[#00BC6E]">
                {formatCurrency(monthlyReturn)}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00BC6E]/20">
              <TrendingUp className="h-3 w-3 text-[#00BC6E]" />
              <span className="text-xs font-medium text-[#00BC6E]">
                {formatPercentage(monthlyReturnPercentage)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
