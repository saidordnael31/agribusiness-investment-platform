"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Mail,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AdminRegisterForm } from "./admin-register-form";
import { UserProfileView } from "../user-profile-view";
import { UserProfileEdit } from "../user-profile-edit";
import { useUserManager } from "./useUserManager";

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
    getStatusColor,
    getStatusLabel,
    getTypeLabel,
  } = useUserManager();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gerenciamento de Usuários
          </h2>
          <p className="text-muted-foreground">
            Gerencie investidores e distribuidores da plataforma
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => {
            window.location.href = "/users/create";
          }}
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Usuário
        </Button>
      </div>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
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
                <Button onClick={() => setShowQRModal(false)}>Fechar</Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Usuário</label>
              <select
                value={filterType}
                onChange={(e) => handleTypeFilterChange(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos</option>
                <option value="investor">Investidores</option>
                <option value="distributor">Distribuidores</option>
                <option value="assessor">Assessores</option>
                <option value="gestor">Gestores</option>
                <option value="escritorio">Escritórios</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Usuários
                </p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Investidores
                </p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.type === "investor").length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Distribuidores
                </p>
                <p className="text-2xl font-bold">
                  {
                    users.filter((u) =>
                      [
                        "distributor",
                        "assessor",
                        "gestor",
                        "escritorio",
                      ].includes(u.type)
                    ).length
                  }
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.status === "pending").length}
                </p>
              </div>
              <UserX className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Todos os usuários registrados na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(user.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(user.status) as any}>
                          {getStatusLabel(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.totalInvested &&
                          user.totalInvested > 0 &&
                          formatCurrency(user.totalInvested)}
                        {user.totalCaptured &&
                          user.totalCaptured > 0 &&
                          formatCurrency(user.totalCaptured)}
                        {(!user.totalInvested || user.totalInvested === 0) &&
                          (!user.totalCaptured || user.totalCaptured === 0) &&
                          "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(user.joinedAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {new Date(user.lastActivity).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewProfile(user.id)}
                            title="Ver Perfil"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProfile(user.id)}
                            title="Alterar Perfil"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} ({totalUsers} usuários)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        if (pageNum > totalPages) return null
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal para visualizar perfil */}
      <Dialog open={showProfileViewModal} onOpenChange={setShowProfileViewModal}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] !max-h-[95vh] !h-[95vh] overflow-y-auto p-6 sm:!max-w-[98vw]">
          <DialogHeader>
            <DialogTitle>Perfil do Usuário</DialogTitle>
            <DialogDescription>
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

      {/* Modal para editar perfil */}
      <Dialog open={showProfileEditModal} onOpenChange={setShowProfileEditModal}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] !max-h-[95vh] !h-[95vh] overflow-y-auto p-6 sm:!max-w-[98vw]">
          <DialogHeader>
            <DialogTitle>Editar Perfil do Usuário</DialogTitle>
            <DialogDescription>
              Alterando informações do usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUserId && (
            loadingUserData ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando dados do usuário...</p>
                </div>
              </div>
            ) : selectedUserData ? (
              <UserProfileEdit
                userId={selectedUserId}
                initialData={selectedUserData as any}
                onSave={handleProfileSave}
                onCancel={handleProfileEditClose}
              />
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">Erro ao carregar dados do usuário</p>
                <Button onClick={handleProfileEditClose} variant="outline" className="mt-4">
                  Fechar
                </Button>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


