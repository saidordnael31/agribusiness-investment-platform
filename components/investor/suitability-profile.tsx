"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Shield,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Wallet,
  BarChart3,
} from "lucide-react";

interface Question {
  id: string;
  text: string;
  options: {
    value: string;
    label: string;
    score: number;
  }[];
}

const questions: Question[] = [
  {
    id: "experience",
    text: "Qual e sua experiencia com investimentos?",
    options: [
      { value: "none", label: "Nenhuma experiencia", score: 1 },
      { value: "basic", label: "Ja investi em poupanca e CDB", score: 2 },
      { value: "intermediate", label: "Tenho experiencia com renda fixa e variavel", score: 3 },
      { value: "advanced", label: "Investidor experiente com diversos ativos", score: 4 },
    ],
  },
  {
    id: "objective",
    text: "Qual seu principal objetivo de investimento?",
    options: [
      { value: "preserve", label: "Preservar meu patrimonio", score: 1 },
      { value: "income", label: "Gerar renda mensal", score: 2 },
      { value: "growth", label: "Crescimento de longo prazo", score: 3 },
      { value: "aggressive", label: "Maximizar retornos mesmo com riscos", score: 4 },
    ],
  },
  {
    id: "horizon",
    text: "Qual seu horizonte de investimento?",
    options: [
      { value: "short", label: "Ate 1 ano", score: 1 },
      { value: "medium", label: "1 a 3 anos", score: 2 },
      { value: "long", label: "3 a 5 anos", score: 3 },
      { value: "very_long", label: "Mais de 5 anos", score: 4 },
    ],
  },
  {
    id: "risk",
    text: "Como voce reagiria a uma queda de 20% no valor dos seus investimentos?",
    options: [
      { value: "sell", label: "Venderia tudo imediatamente", score: 1 },
      { value: "sell_part", label: "Venderia uma parte para reduzir risco", score: 2 },
      { value: "wait", label: "Manteria e esperaria a recuperacao", score: 3 },
      { value: "buy", label: "Aproveitaria para comprar mais", score: 4 },
    ],
  },
  {
    id: "income",
    text: "Qual porcentagem do seu patrimonio voce pretende investir?",
    options: [
      { value: "low", label: "Ate 10%", score: 1 },
      { value: "medium", label: "10% a 25%", score: 2 },
      { value: "high", label: "25% a 50%", score: 3 },
      { value: "very_high", label: "Mais de 50%", score: 4 },
    ],
  },
];

type ProfileType = "conservador" | "moderado" | "arrojado" | "agressivo";

const profileData: Record<
  ProfileType,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
    recommendations: string[];
  }
> = {
  conservador: {
    label: "Conservador",
    description:
      "Voce prioriza a seguranca do seu capital e prefere investimentos de baixo risco com retornos preveis.",
    color: "text-[#00BC6E]",
    bgColor: "bg-[#00BC6E]/20",
    icon: <Shield className="h-8 w-8" />,
    recommendations: [
      "CRA Senior com liquidez mensal",
      "LCA com garantia FGC",
      "Titulos publicos (Tesouro Direto)",
    ],
  },
  moderado: {
    label: "Moderado",
    description:
      "Voce busca equilibrio entre seguranca e rentabilidade, aceitando riscos moderados para obter melhores retornos.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
    icon: <BarChart3 className="h-8 w-8" />,
    recommendations: [
      "FIAGRO Premium",
      "Debentures incentivadas",
      "CRA com liquidez semestral",
    ],
  },
  arrojado: {
    label: "Arrojado",
    description:
      "Voce esta disposto a assumir riscos maiores em busca de rentabilidade superior, com visao de longo prazo.",
    color: "text-amber-400",
    bgColor: "bg-amber-400/20",
    icon: <TrendingUp className="h-8 w-8" />,
    recommendations: [
      "CRA Subordinada",
      "COE Agro Protegido",
      "Fundos de investimento alternativos",
    ],
  },
  agressivo: {
    label: "Agressivo",
    description:
      "Voce busca maximizar retornos e aceita volatilidade significativa em seus investimentos.",
    color: "text-orange-400",
    bgColor: "bg-orange-400/20",
    icon: <Target className="h-8 w-8" />,
    recommendations: [
      "Cotas subordinadas com participacao",
      "Operacoes estruturadas",
      "Private equity no agronegocio",
    ],
  },
};

export function SuitabilityProfile() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const calculateProfile = (): ProfileType => {
    const totalScore = Object.values(answers).reduce((acc, answer) => {
      const question = questions.find((q) =>
        q.options.some((o) => o.value === answer)
      );
      const option = question?.options.find((o) => o.value === answer);
      return acc + (option?.score || 0);
    }, 0);

    const maxScore = questions.length * 4;
    const percentage = (totalScore / maxScore) * 100;

    if (percentage <= 30) return "conservador";
    if (percentage <= 50) return "moderado";
    if (percentage <= 75) return "arrojado";
    return "agressivo";
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const calculatedProfile = calculateProfile();
      setProfile(calculatedProfile);
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleRetake = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
    setProfile(null);
  };

  if (showResult && profile) {
    const profileInfo = profileData[profile];

    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={cn(
              "inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
              profileInfo.bgColor,
              profileInfo.color
            )}
          >
            {profileInfo.icon}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Seu Perfil: {profileInfo.label}
          </h1>
          <p className="text-white/60">{profileInfo.description}</p>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Produtos Recomendados
          </h2>
          <div className="space-y-3">
            {profileInfo.recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
              >
                <CheckCircle2 className={cn("h-5 w-5", profileInfo.color)} />
                <span className="text-white">{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#00BC6E]/10 to-cyan-500/10 border border-[#00BC6E]/20 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Importante
              </h3>
              <p className="text-xs text-white/60">
                O perfil de investidor e uma referencia baseada nas suas
                respostas. Consulte sempre seu assessor antes de tomar decisoes
                de investimento.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={handleRetake}
          >
            Refazer Questionario
          </Button>
          <Button
            className="bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28]"
            onClick={() => router.push("/investor/products")}
          >
            Ver Produtos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-[#00BC6E]" />
        <h1 className="text-2xl font-bold text-white">Perfil de Investidor</h1>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-white/60 mb-2">
          <span>
            Pergunta {currentStep + 1} de {questions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/10" />
      </div>

      {/* Question */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">
          {currentQuestion.text}
        </h2>

        <RadioGroup
          value={answers[currentQuestion.id] || ""}
          onValueChange={handleSelectAnswer}
          className="space-y-3"
        >
          {currentQuestion.options.map((option) => (
            <div key={option.value}>
              <Label
                htmlFor={option.value}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  answers[currentQuestion.id] === option.value
                    ? "bg-[#00BC6E]/10 border-[#00BC6E]/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="border-white/30 text-[#00BC6E]"
                />
                <span className="text-white">{option.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <Button
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}
        <Button
          className={cn(
            "flex-1 bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28]",
            currentStep === 0 && "w-full"
          )}
          onClick={handleNext}
          disabled={!answers[currentQuestion.id]}
        >
          {currentStep < questions.length - 1 ? (
            <>
              Proximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          ) : (
            <>
              Ver Resultado
              <CheckCircle2 className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
