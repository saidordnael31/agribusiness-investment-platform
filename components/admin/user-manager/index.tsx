"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users,
  Search,
  Filter,
  UserX,
  DollarSign,
  Loader2,
  UserPlus,
  QrCode,
  Copy,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AdminSectionCard,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminGhostButton,
  AdminStatusBadge,
  AdminDataTable,
  AdminTable,
  AdminTableHeader,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminMoney,
  FintechMetricCard,
  FintechMetricGrid,
  adminTokens,
} from "@/components/admin/ui";
import { AdminRegisterForm } from "./admin-register-form";
import { UserProfileView } from "../user-profile-view";
import { UserProfileEdit } from "../user-profile-edit";
import { useUserManager } from "./useUserManager";

function statusTone(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "inactive":
      return "muted" as const;
    case "pending":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function UserManager() {
  const {
    users,
    loading,
    searchTerm,
    filterType,
    filterStatus,
    currentPage,
    totalPages,
    totalUsers,
    showCreateUserModal,
    showQRModal,
    qrCodeData,
    generatingQR,
    showProfileViewModal,
    showProfileEditModal,
    selectedUserId,
    selectedUserData,
    loadingUserData,
    setShowCreateUserModal,
    setShowQRModal,
    setShowProfileViewModal,
    setShowProfileEditModal,
    handleSearchChange,
    handleTypeFilterChange,
    handleStatusFilterChange,
    handlePageChange,
    copyPixCode,
    handleViewProfile,
    handleEditProfile,
    handleProfileSave,
    handleProfileViewClose,
    handleProfileEditClose,
    handleEditFromView,
    formatCurrency,
    getStatusLabel,
    getTypeLabel,
  } = useUserManager();

  const distributorCount = users.filter((u) =>
    ["distributor", "assessor", "gestor", "escritorio"].includes(u.type),
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#F3F5F4]">
            <Users className="h-5 w-5 text-[#22C55E]" />
            Gerenciamento de Usuários
          </h2>
          <p className="mt-0.5 text-sm text-[#A5B3AC]">
            Gerencie investidores e distribuidores da plataforma
          </p>
        </div>
        <AdminPrimaryButton
          className="h-10"
          onClick={() => setShowCreateUserModal(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Cadastrar Usuário
        </AdminPrimaryButton>
      </div>

      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent
          className={cn(
            adminTokens.dialog,
            "flex max-h-[90vh] flex-col overflow-hidden sm:max-w-6xl",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-[#F3F5F4]">Cadastrar Novo Usuário</DialogTitle>
            <DialogDescription className="text-[#A5B3AC]">
              Cadastre um novo usuário na plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {showCreateUserModal && (
              <AdminRegisterForm closeModal={() => setShowCreateUserModal(false)} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className={cn(adminTokens.dialog, "sm:max-w-md")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#F3F5F4]">
              <QrCode className="h-5 w-5 text-[#22C55E]" />
              QR Code PIX Gerado
            </DialogTitle>
            <DialogDescription className="text-[#A5B3AC]">
              Use o QR Code abaixo ou copie o código PIX para realizar o pagamento.
            </DialogDescription>
          </DialogHeader>

          {qrCodeData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={qrCodeData.qrCode || "/placeholder.svg"}
                  alt="QR Code PIX"
                  className="h-64 w-64 rounded-xl border border-white/[0.08]"
                />
              </div>

              {qrCodeData.paymentString && (
                <div className="space-y-2">
                  <Label className={adminTokens.label}>Código PIX (Copia e Cola)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={qrCodeData.paymentString}
                      readOnly
                      className={cn(adminTokens.input, "font-mono text-xs")}
                    />
                    <AdminSecondaryButton
                      size="sm"
                      onClick={copyPixCode}
                      className="h-9 shrink-0 px-3"
                    >
                      <Copy className="h-4 w-4" />
                    </AdminSecondaryButton>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <AdminSecondaryButton onClick={() => setShowQRModal(false)}>
                  Fechar
                </AdminSecondaryButton>
              </div>
            </div>
          )}

          {generatingQR && (
            <div className="flex items-center justify-center py-8 text-[#A5B3AC]">
              <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
              <span className="ml-2">Gerando QR Code...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AdminSectionCard title="Filtros" variant="muted">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7C74]" />
              <Input
                placeholder="Nome ou email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={cn(adminTokens.input, "pl-10")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Tipo de Usuário</label>
            <Select value={filterType} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className={adminTokens.input}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className={adminTokens.selectContent}>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="investor">Investidores</SelectItem>
                <SelectItem value="distributor">Distribuidores</SelectItem>
                <SelectItem value="assessor">Assessores</SelectItem>
                <SelectItem value="gestor">Gestores</SelectItem>
                <SelectItem value="escritorio">Escritórios</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Status</label>
            <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className={adminTokens.input}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className={adminTokens.selectContent}>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminSectionCard>

      <FintechMetricGrid>
        <FintechMetricCard
          label="Total de Usuários"
          value={String(totalUsers)}
          icon={Users}
          tone="forest"
          surface="featured"
        />
        <FintechMetricCard
          label="Investidores"
          value={String(users.filter((u) => u.type === "investor").length)}
          icon={DollarSign}
          tone="emerald"
          surface="soft"
        />
        <FintechMetricCard
          label="Distribuidores"
          value={String(distributorCount)}
          icon={UserCheck}
          tone="sky"
          surface="card"
        />
        <FintechMetricCard
          label="Pendentes"
          value={String(users.filter((u) => u.status === "pending").length)}
          icon={UserX}
          tone="amber"
          surface="soft"
          badge={
            users.filter((u) => u.status === "pending").length > 0
              ? "Ação"
              : undefined
          }
        />
      </FintechMetricGrid>

      <AdminSectionCard
        title="Lista de Usuários"
        description="Todos os usuários registrados na plataforma"
        variant="card"
        noPadding
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#22C55E]" />
            <p className="text-sm text-[#6B7C74]">Carregando usuários...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="mb-3 h-10 w-10 text-[#6B7C74]" />
            <p className="text-sm text-[#6B7C74]">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            <AdminDataTable embedded maxHeight={false}>
              <AdminTable>
                <AdminTableHeader>
                  <TableRow className="border-white/[0.04] hover:bg-transparent">
                    <AdminTableHead>Nome</AdminTableHead>
                    <AdminTableHead>Email</AdminTableHead>
                    <AdminTableHead>Tipo</AdminTableHead>
                    <AdminTableHead>Status</AdminTableHead>
                    <AdminTableHead align="right">Valor</AdminTableHead>
                    <AdminTableHead>Cadastro</AdminTableHead>
                    <AdminTableHead>Última Atividade</AdminTableHead>
                    <AdminTableHead align="right">Ações</AdminTableHead>
                  </TableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {users.map((user) => (
                    <AdminTableRow key={user.id}>
                      <AdminTableCell>
                        <span className="font-medium text-[#F3F5F4]">{user.name}</span>
                      </AdminTableCell>
                      <AdminTableCell secondary>{user.email}</AdminTableCell>
                      <AdminTableCell>
                        <AdminStatusBadge tone="info">
                          {getTypeLabel(user.type)}
                        </AdminStatusBadge>
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminStatusBadge tone={statusTone(user.status)}>
                          {getStatusLabel(user.status)}
                        </AdminStatusBadge>
                      </AdminTableCell>
                      <AdminTableCell align="right">
                        <AdminMoney
                          value={
                            user.totalInvested && user.totalInvested > 0
                              ? formatCurrency(user.totalInvested)
                              : user.totalCaptured && user.totalCaptured > 0
                                ? formatCurrency(user.totalCaptured)
                                : "—"
                          }
                          emphasis={
                            !!(user.totalInvested && user.totalInvested > 0) ||
                            !!(user.totalCaptured && user.totalCaptured > 0)
                          }
                          className={
                            user.totalInvested || user.totalCaptured
                              ? "text-[#22C55E]"
                              : undefined
                          }
                        />
                      </AdminTableCell>
                      <AdminTableCell secondary>
                        {new Date(user.joinedAt).toLocaleDateString("pt-BR")}
                      </AdminTableCell>
                      <AdminTableCell secondary>
                        {new Date(user.lastActivity).toLocaleDateString("pt-BR")}
                      </AdminTableCell>
                      <AdminTableCell align="right">
                        <div className="flex justify-end gap-1">
                          <AdminGhostButton
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewProfile(user.id)}
                            title="Ver Perfil"
                          >
                            <Eye className="h-4 w-4" />
                          </AdminGhostButton>
                          <AdminGhostButton
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditProfile(user.id)}
                            title="Alterar Perfil"
                          >
                            <Edit className="h-4 w-4" />
                          </AdminGhostButton>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </AdminDataTable>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-[#6B7C74]">
                  Página {currentPage} de {totalPages} ({totalUsers} usuários)
                </span>
                <div className="flex items-center gap-1">
                  <AdminSecondaryButton
                    size="sm"
                    className="h-8"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </AdminSecondaryButton>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum =
                      Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <AdminSecondaryButton
                        key={pageNum}
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0",
                          pageNum === currentPage &&
                            "border-emerald-500/30 bg-emerald-500/10 text-[#22C55E]",
                        )}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </AdminSecondaryButton>
                    );
                  })}
                  <AdminSecondaryButton
                    size="sm"
                    className="h-8"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </AdminSecondaryButton>
                </div>
              </div>
            )}
          </>
        )}
      </AdminSectionCard>

      <Dialog open={showProfileViewModal} onOpenChange={setShowProfileViewModal}>
        <DialogContent
          className={cn(
            adminTokens.dialog,
            "!max-h-[95vh] !h-[95vh] !max-w-[98vw] !w-[98vw] overflow-y-auto p-6",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-[#F3F5F4]">Perfil do Usuário</DialogTitle>
            <DialogDescription className="text-[#A5B3AC]">
              Visualizando informações detalhadas do usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUserId && (
            <UserProfileView
              userId={selectedUserId}
              onEdit={handleEditFromView}
              onClose={handleProfileViewClose}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showProfileEditModal} onOpenChange={setShowProfileEditModal}>
        <DialogContent
          className={cn(
            adminTokens.dialog,
            "!max-h-[95vh] !h-[95vh] !max-w-[98vw] !w-[98vw] overflow-y-auto p-6",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-[#F3F5F4]">Editar Perfil do Usuário</DialogTitle>
            <DialogDescription className="text-[#A5B3AC]">
              Alterando informações do usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUserId &&
            (loadingUserData ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
                <span className="ml-2 text-[#A5B3AC]">Carregando dados...</span>
              </div>
            ) : selectedUserData ? (
              <UserProfileEdit
                userId={selectedUserId}
                initialData={selectedUserData as any}
                onSave={handleProfileSave}
                onCancel={handleProfileEditClose}
              />
            ) : (
              <div className="p-8 text-center">
                <p className="text-[#6B7C74]">Erro ao carregar dados do usuário</p>
                <AdminSecondaryButton
                  onClick={handleProfileEditClose}
                  className="mt-4"
                >
                  Fechar
                </AdminSecondaryButton>
              </div>
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
