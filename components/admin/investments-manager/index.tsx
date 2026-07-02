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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadReceiptModal } from "../upload-receipt-modal";
import { ReceiptViewer } from "../receipt-viewer";
import { EditInvestmentModal } from "../edit-investment-modal";
import {
  Search,
  Download,
  RefreshCw,
  Upload,
  Eye,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AdminSectionCard,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminActionButton,
  AdminStatusBadge,
  AdminDataTable,
  AdminTable,
  AdminTableHeader,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminInvestorCell,
  AdminMoney,
  adminTokens,
} from "@/components/admin/ui";
import { useInvestmentsManager } from "./useInvestmentsManager";

const formatDateSafe = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  if (typeof dateString === "string" && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [datePart] = dateString.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  }
  return "N/A";
};

function investmentStatusTone(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "cancelled":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

export function InvestmentsManager() {
  const {
    investments,
    loading,
    currentPage,
    totalPages,
    totalInvestments,
    uploadModalOpen,
    selectedInvestmentForUpload,
    exportModalOpen,
    isExporting,
    exportOptions,
    receiptViewerOpen,
    selectedReceipt,
    filters,
    setExportModalOpen,
    setExportOptions,
    handleFilterChange,
    handlePageChange,
    clearFilters,
    handleUploadReceipt,
    handleViewReceipt,
    handleApprovalSuccess,
    handleEditInvestment,
    editModalOpen,
    selectedInvestmentForEdit,
    closeEditModal,
    handleEditSuccess,
    getStatusBadge,
    getQuotaTypeBadge,
    exportInvestments,
    handleExport,
    formatCurrency,
    closeUploadModal,
    closeReceiptViewer,
    fetchInvestments,
  } = useInvestmentsManager();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F3F5F4]">Investimentos</h2>
          <p className="mt-0.5 text-sm text-[#A5B3AC]">
            Gerencie todos os investimentos da plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminSecondaryButton onClick={exportInvestments}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </AdminSecondaryButton>
          <AdminSecondaryButton
            onClick={() => fetchInvestments(currentPage, filters)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </AdminSecondaryButton>
        </div>
      </div>

      <AdminSectionCard title="Filtros" variant="muted">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Status</label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange({ status: value })}
            >
              <SelectTrigger className={adminTokens.input}>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent className={adminTokens.selectContent}>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="withdrawn">Resgatado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Tipo de Quota</label>
            <Select
              value={filters.quotaType}
              onValueChange={(value) => handleFilterChange({ quotaType: value })}
            >
              <SelectTrigger className={adminTokens.input}>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className={adminTokens.selectContent}>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="subordinate">Subordinada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7C74]" />
              <Input
                placeholder="Nome ou email..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className={cn(adminTokens.input, "pl-10")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Data Inicial</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              className={adminTokens.input}
            />
          </div>
          <div className="space-y-1.5">
            <label className={adminTokens.label}>Data Final</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              className={adminTokens.input}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <AdminSecondaryButton size="sm" onClick={clearFilters}>
            Limpar Filtros
          </AdminSecondaryButton>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Lista de Investimentos"
        description={`${totalInvestments} investimento(s) encontrado(s)`}
        variant="card"
        noPadding
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[#A5B3AC]">
            <RefreshCw className="h-5 w-5 animate-spin text-[#22C55E]" />
            Carregando investimentos...
          </div>
        ) : investments.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#6B7C74]">
            Nenhum investimento encontrado com os filtros aplicados.
          </p>
        ) : (
          <>
            <AdminDataTable embedded maxHeight={false}>
              <AdminTable>
                <AdminTableHeader>
                  <TableRow className="border-white/[0.04] hover:bg-transparent">
                    <AdminTableHead>Investidor</AdminTableHead>
                    <AdminTableHead align="right">Valor</AdminTableHead>
                    <AdminTableHead>Tipo</AdminTableHead>
                    <AdminTableHead>Status</AdminTableHead>
                    <AdminTableHead>Comprovantes</AdminTableHead>
                    <AdminTableHead align="right">Taxa</AdminTableHead>
                    <AdminTableHead>Prazo</AdminTableHead>
                    <AdminTableHead>Data</AdminTableHead>
                    <AdminTableHead align="right">Ações</AdminTableHead>
                  </TableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {investments.map((investment) => {
                    const statusBadge = getStatusBadge(investment.status);
                    const quotaBadge = getQuotaTypeBadge(investment.quota_type);

                    return (
                      <AdminTableRow key={investment.id}>
                        <AdminTableCell>
                          <AdminInvestorCell
                            name={investment.profiles?.full_name || "N/A"}
                            email={investment.profiles?.email || "N/A"}
                          />
                        </AdminTableCell>
                        <AdminTableCell align="right">
                          <AdminMoney
                            value={formatCurrency(investment.amount)}
                            emphasis
                            className="text-[#22C55E]"
                          />
                        </AdminTableCell>
                        <AdminTableCell>
                          <AdminStatusBadge tone="info">
                            {quotaBadge.label}
                          </AdminStatusBadge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <AdminStatusBadge
                            tone={investmentStatusTone(investment.status)}
                          >
                            {statusBadge.label}
                          </AdminStatusBadge>
                        </AdminTableCell>
                        <AdminTableCell>
                          {investment.receipts && investment.receipts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {investment.receipts.map((receipt) => (
                                <AdminActionButton
                                  key={receipt.id}
                                  size="sm"
                                  tone="success"
                                  onClick={() => handleViewReceipt(receipt)}
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  Ver
                                </AdminActionButton>
                              ))}
                            </div>
                          ) : (
                            <AdminActionButton
                              size="sm"
                              tone="neutral"
                              onClick={() => handleUploadReceipt(investment)}
                            >
                              <Upload className="mr-1 h-3 w-3" />
                              Upload
                            </AdminActionButton>
                          )}
                        </AdminTableCell>
                        <AdminTableCell align="right">
                          <span className="text-[13px] font-medium tabular-nums text-[#22C55E]">
                            {(investment.monthly_return_rate * 100).toFixed(2)}% a.m.
                          </span>
                        </AdminTableCell>
                        <AdminTableCell secondary>
                          {investment.commitment_period} meses
                        </AdminTableCell>
                        <AdminTableCell secondary>
                          {investment.payment_date
                            ? formatDateSafe(investment.payment_date)
                            : "Não depositado"}
                        </AdminTableCell>
                        <AdminTableCell align="right">
                          <AdminActionButton
                            size="sm"
                            tone="neutral"
                            onClick={() => handleEditInvestment(investment)}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Editar
                          </AdminActionButton>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </AdminTableBody>
              </AdminTable>
            </AdminDataTable>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                <span className="text-xs text-[#6B7C74]">
                  Página {currentPage} de {totalPages} ({totalInvestments}{" "}
                  investimentos)
                </span>
                <div className="flex gap-2">
                  <AdminSecondaryButton
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </AdminSecondaryButton>
                  <AdminSecondaryButton
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </AdminSecondaryButton>
                </div>
              </div>
            )}
          </>
        )}
      </AdminSectionCard>

      {selectedInvestmentForUpload && (
        <UploadReceiptModal
          isOpen={uploadModalOpen}
          onClose={closeUploadModal}
          investmentId={selectedInvestmentForUpload.id}
          investmentAmount={selectedInvestmentForUpload.amount}
          investorName={selectedInvestmentForUpload.investorName}
          onSuccess={handleApprovalSuccess}
        />
      )}

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className={cn(adminTokens.dialog, "max-w-md")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#F3F5F4]">
              <Download className="h-5 w-5 text-[#22C55E]" />
              Exportar Investimentos
            </DialogTitle>
            <DialogDescription className="text-[#A5B3AC]">
              Escolha quais dados incluir no arquivo de exportação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-[#A5B3AC]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.includePersonalData}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    includePersonalData: e.target.checked,
                  }))
                }
                className="rounded border-white/20 bg-[#161F1B]"
              />
              Incluir dados pessoais (nome e email)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportOptions.includeReceipts}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    includeReceipts: e.target.checked,
                  }))
                }
                className="rounded border-white/20 bg-[#161F1B]"
              />
              Incluir dados de comprovantes
            </label>
            <div className="space-y-2">
              <p className={adminTokens.label}>Formato do arquivo</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportOptions.format === "csv"}
                    onChange={() =>
                      setExportOptions((prev) => ({ ...prev, format: "csv" }))
                    }
                  />
                  CSV
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={exportOptions.format === "excel"}
                    onChange={() =>
                      setExportOptions((prev) => ({ ...prev, format: "excel" }))
                    }
                  />
                  Excel
                </label>
              </div>
            </div>
            <div className={adminTokens.dialogPanel}>
              <p className="text-[#F3F5F4]">
                <strong>Total:</strong> {totalInvestments} investimentos
              </p>
              <p className="mt-1 text-xs text-[#6B7C74]">
                Todos os investimentos serão exportados, incluindo outras páginas.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <AdminSecondaryButton
              onClick={() => setExportModalOpen(false)}
              disabled={isExporting}
            >
              Cancelar
            </AdminSecondaryButton>
            <AdminPrimaryButton onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </>
              )}
            </AdminPrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedReceipt && (
        <ReceiptViewer
          receipt={selectedReceipt}
          isOpen={receiptViewerOpen}
          onClose={closeReceiptViewer}
        />
      )}

      <EditInvestmentModal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        investment={selectedInvestmentForEdit}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
