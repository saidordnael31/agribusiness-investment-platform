"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  MessageSquare,
  User,
  Settings,
  HelpCircle,
  Shield,
  Bell,
  LogOut,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MenuItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  external?: boolean;
}

const menuSections = [
  {
    title: "Conta",
    items: [
      {
        label: "Meu Perfil",
        description: "Dados pessoais e documentos",
        href: "/profile",
        icon: <User className="h-5 w-5" />,
        color: "text-[#00BC6E]",
      },
      {
        label: "Perfil de Investidor",
        description: "Questionario de suitability",
        href: "/investor/suitability",
        icon: <Shield className="h-5 w-5" />,
        color: "text-cyan-400",
      },
      {
        label: "Notificacoes",
        description: "Configurar alertas",
        href: "/investor/notifications",
        icon: <Bell className="h-5 w-5" />,
        color: "text-amber-400",
      },
      {
        label: "Seguranca",
        description: "Senha e autenticacao",
        href: "/newPassword",
        icon: <Lock className="h-5 w-5" />,
        color: "text-violet-400",
      },
    ],
  },
  {
    title: "Documentos",
    items: [
      {
        label: "Central de Documentos",
        description: "Extratos, informes e contratos",
        href: "/investor/documents",
        icon: <FileText className="h-5 w-5" />,
        color: "text-[#00BC6E]",
      },
    ],
  },
  {
    title: "Ajuda",
    items: [
      {
        label: "Falar com Consultor",
        description: "Suporte personalizado",
        href: "/investor/support",
        icon: <MessageSquare className="h-5 w-5" />,
        color: "text-[#00BC6E]",
      },
      {
        label: "Central de Ajuda",
        description: "Perguntas frequentes",
        href: "/investor/help",
        icon: <HelpCircle className="h-5 w-5" />,
        color: "text-cyan-400",
      },
    ],
  },
  {
    title: "Sobre",
    items: [
      {
        label: "Sobre a Akin S.A.",
        description: "Conheca nossa empresa",
        href: "/about",
        icon: <Building2 className="h-5 w-5" />,
        color: "text-white/70",
      },
    ],
  },
];

export function MoreMenu() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast({
      title: "Logout realizado",
      description: "Voce foi desconectado com sucesso.",
    });
    router.push("/");
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mais</h1>
        <p className="text-white/60 text-sm mt-1">
          Configuracoes e opcoes adicionais
        </p>
      </div>

      {/* Menu Sections */}
      <div className="space-y-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs uppercase tracking-wider text-white/40 mb-3 px-1">
              {section.title}
            </h2>
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden divide-y divide-white/5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full bg-white/5",
                      item.color
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-white block">
                      {item.label}
                    </span>
                    <span className="text-xs text-white/50">
                      {item.description}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="mt-8">
        <Button
          variant="outline"
          className="w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da Conta
        </Button>
      </div>

      {/* Contact Info */}
      <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-sm font-medium text-white mb-3">
          Contato Direto
        </h3>
        <div className="space-y-2">
          <a
            href="tel:+5511999999999"
            className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors"
          >
            <Phone className="h-4 w-4" />
            +55 (11) 99999-9999
          </a>
          <a
            href="mailto:investidor@akin.com.br"
            className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors"
          >
            <Mail className="h-4 w-4" />
            investidor@akin.com.br
          </a>
        </div>
      </div>

      {/* Version */}
      <p className="text-center text-xs text-white/30 mt-8">
        Akin Wealth Management v2.0.0
      </p>
    </div>
  );
}
