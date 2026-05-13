"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Bell,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  Settings,
  ChevronRight,
} from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "alert";
  title: string;
  message: string;
  date: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Rendimento Creditado",
    message: "Seu rendimento mensal de R$ 1.250,00 foi creditado na sua conta.",
    date: "2024-06-01T10:30:00",
    read: false,
  },
  {
    id: "2",
    type: "warning",
    title: "Investimento Proximo do Vencimento",
    message:
      "Seu CRA Senior vence em 15 dias. Considere renovar para manter sua rentabilidade.",
    date: "2024-05-28T14:00:00",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "Novo Produto Disponivel",
    message:
      "O FIAGRO Premium Akin esta disponivel para investimento. Confira as condicoes.",
    date: "2024-05-25T09:00:00",
    read: true,
  },
  {
    id: "4",
    type: "success",
    title: "Deposito Confirmado",
    message: "Seu deposito de R$ 50.000,00 foi confirmado e ja esta rendendo.",
    date: "2024-05-20T16:45:00",
    read: true,
  },
  {
    id: "5",
    type: "alert",
    title: "Atualize seus Dados",
    message:
      "Seus dados cadastrais estao desatualizados. Atualize para continuar operando.",
    date: "2024-05-15T11:00:00",
    read: true,
  },
];

const typeIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  alert: <Bell className="h-5 w-5" />,
};

const typeColors: Record<string, string> = {
  success: "bg-[#00BC6E]/20 text-[#00BC6E]",
  warning: "bg-amber-500/20 text-amber-400",
  info: "bg-cyan-500/20 text-cyan-400",
  alert: "bg-red-500/20 text-red-400",
};

export function NotificationsCenter() {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    rendimentos: true,
    vencimentos: true,
    novidades: true,
    alertas: true,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return `Hoje, ${date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    if (diffDays === 1) {
      return "Ontem";
    }
    if (diffDays < 7) {
      return `${diffDays} dias atras`;
    }
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  if (showSettings) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#00BC6E]" />
            <h1 className="text-2xl font-bold text-white">
              Configurar Notificacoes
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setShowSettings(false)}
          >
            Voltar
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <span className="text-sm font-medium text-white block">
                Rendimentos
              </span>
              <span className="text-xs text-white/50">
                Notificacoes de credito de rendimentos
              </span>
            </div>
            <Switch
              checked={settings.rendimentos}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, rendimentos: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <span className="text-sm font-medium text-white block">
                Vencimentos
              </span>
              <span className="text-xs text-white/50">
                Alertas de investimentos proximos do vencimento
              </span>
            </div>
            <Switch
              checked={settings.vencimentos}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, vencimentos: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <span className="text-sm font-medium text-white block">
                Novos Produtos
              </span>
              <span className="text-xs text-white/50">
                Informacoes sobre novos produtos disponiveis
              </span>
            </div>
            <Switch
              checked={settings.novidades}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, novidades: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <span className="text-sm font-medium text-white block">
                Alertas Importantes
              </span>
              <span className="text-xs text-white/50">
                Alertas de seguranca e atualizacoes cadastrais
              </span>
            </div>
            <Switch
              checked={settings.alertas}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, alertas: checked })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-[#00BC6E]" />
          <h1 className="text-2xl font-bold text-white">Notificacoes</h1>
          {unreadCount > 0 && (
            <Badge className="bg-[#00BC6E] text-[#003F28] text-xs">
              {unreadCount} nova(s)
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="flex gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-white/60 hover:text-white hover:bg-white/10"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Marcar todas como lidas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
            onClick={clearAll}
          >
            Limpar todas
          </Button>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10">
          <Bell className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Nenhuma notificacao
          </h3>
          <p className="text-sm text-white/50">
            Voce esta em dia com todas as atualizacoes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "p-4 rounded-xl border transition-colors cursor-pointer",
                notification.read
                  ? "bg-white/5 border-white/10"
                  : "bg-white/10 border-white/20"
              )}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0",
                    typeColors[notification.type]
                  )}
                >
                  {typeIcons[notification.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "font-medium",
                        notification.read ? "text-white/80" : "text-white"
                      )}
                    >
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-[#00BC6E]" />
                    )}
                  </div>
                  <p className="text-sm text-white/60 mb-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-white/40">
                    {formatDate(notification.date)}
                  </span>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-red-400/10 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
