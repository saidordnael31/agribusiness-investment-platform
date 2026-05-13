"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Send,
  HelpCircle,
  User,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const faqItems = [
  {
    question: "Como faco para investir na Agrinvest?",
    answer:
      "Para investir, acesse a secao 'Investir' no menu, escolha o produto desejado, defina o valor e siga as instrucoes para realizar o deposito via PIX ou TED.",
  },
  {
    question: "Qual o prazo para resgate dos investimentos?",
    answer:
      "O prazo de resgate varia de acordo com o produto escolhido. CRAs Senior possuem liquidez mensal, enquanto produtos subordinados podem ter prazos maiores. Consulte os detalhes do seu investimento.",
  },
  {
    question: "Como funciona a rentabilidade dos CRAs?",
    answer:
      "Os CRAs oferecem rentabilidade atrelada ao CDI ou IPCA, com spreads que variam conforme o tipo de cota (senior ou subordinada) e prazo de carencia escolhido.",
  },
  {
    question: "Os investimentos possuem garantia do FGC?",
    answer:
      "CRAs nao possuem cobertura do FGC, porem contam com garantias proprias como alienacao fiduciaria de recebiveis agricolas. LCAs possuem garantia do FGC ate R$ 250 mil.",
  },
  {
    question: "Como obtenho o informe de rendimentos para IR?",
    answer:
      "Os informes de rendimentos sao disponibilizados anualmente na Central de Documentos ate o final de fevereiro. Voce tambem pode solicitar diretamente ao seu consultor.",
  },
];

const contactChannels = [
  {
    icon: <MessageSquare className="h-5 w-5" />,
    label: "WhatsApp",
    value: "+55 (11) 99999-9999",
    href: "https://wa.me/5511999999999",
    color: "bg-[#00BC6E]/20 text-[#00BC6E]",
  },
  {
    icon: <Phone className="h-5 w-5" />,
    label: "Telefone",
    value: "+55 (11) 3333-3333",
    href: "tel:+551133333333",
    color: "bg-cyan-500/20 text-cyan-400",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    label: "E-mail",
    value: "suporte@akin.com.br",
    href: "mailto:suporte@akin.com.br",
    color: "bg-amber-500/20 text-amber-400",
  },
];

export function SupportCenter() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: "Mensagem enviada",
      description: "Nossa equipe retornara em ate 24 horas uteis.",
    });

    setSubject("");
    setMessage("");
    setCategory("");
    setSending(false);
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6 text-[#00BC6E]" />
        <h1 className="text-2xl font-bold text-white">Central de Suporte</h1>
      </div>

      {/* Quick Contact */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-white/60 mb-3">
          Canais de Atendimento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {contactChannels.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  channel.color
                )}
              >
                {channel.icon}
              </div>
              <div>
                <span className="text-sm font-medium text-white block">
                  {channel.label}
                </span>
                <span className="text-xs text-white/50">{channel.value}</span>
              </div>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
          <Clock className="h-3 w-3" />
          <span>Atendimento de segunda a sexta, das 9h as 18h</span>
        </div>
      </div>

      {/* Contact Form */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Enviar Mensagem
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Categoria</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#01223F] border-white/10">
                <SelectItem value="investment">Investimentos</SelectItem>
                <SelectItem value="withdrawal">Resgates</SelectItem>
                <SelectItem value="documents">Documentos</SelectItem>
                <SelectItem value="account">Minha Conta</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">Assunto</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Digite o assunto"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">Mensagem</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva sua duvida ou solicitacao..."
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28] font-semibold"
            disabled={!category || !subject || !message || sending}
          >
            {sending ? (
              "Enviando..."
            ) : (
              <>
                Enviar Mensagem
                <Send className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-[#00BC6E]" />
          <h2 className="text-lg font-semibold text-white">
            Perguntas Frequentes
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl bg-white/5 border border-white/10 px-4"
            >
              <AccordionTrigger className="text-sm text-white hover:no-underline py-4">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-white/60 pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Advisor Contact */}
      <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-[#00BC6E]/10 to-cyan-500/10 border border-[#00BC6E]/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#00BC6E]/20">
            <User className="h-6 w-6 text-[#00BC6E]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              Seu Consultor Exclusivo
            </h3>
            <p className="text-xs text-white/60">
              Atendimento personalizado para suas necessidades
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#00BC6E]/30 text-[#00BC6E] hover:bg-[#00BC6E]/10"
          >
            Agendar
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
