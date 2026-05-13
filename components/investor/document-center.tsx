"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  FileText,
  Download,
  Search,
  Calendar,
  Filter,
  ChevronDown,
  Eye,
  Receipt,
  FileCheck,
  FilePieChart,
  Clock,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: "extrato" | "informe" | "contrato" | "comprovante";
  date: string;
  size: string;
  status: "disponivel" | "processando" | "solicitado";
  period?: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Extrato Mensal - Maio 2024",
    type: "extrato",
    date: "2024-05-01",
    size: "245 KB",
    status: "disponivel",
    period: "Maio 2024",
  },
  {
    id: "2",
    name: "Extrato Mensal - Abril 2024",
    type: "extrato",
    date: "2024-04-01",
    size: "238 KB",
    status: "disponivel",
    period: "Abril 2024",
  },
  {
    id: "3",
    name: "Informe de Rendimentos 2023",
    type: "informe",
    date: "2024-02-28",
    size: "156 KB",
    status: "disponivel",
    period: "2023",
  },
  {
    id: "4",
    name: "Contrato de Investimento - CRA Senior",
    type: "contrato",
    date: "2024-01-15",
    size: "1.2 MB",
    status: "disponivel",
  },
  {
    id: "5",
    name: "Comprovante de Deposito - R$ 50.000",
    type: "comprovante",
    date: "2024-03-10",
    size: "98 KB",
    status: "disponivel",
  },
  {
    id: "6",
    name: "Extrato Mensal - Junho 2024",
    type: "extrato",
    date: "2024-06-01",
    size: "-",
    status: "processando",
    period: "Junho 2024",
  },
];

const typeLabels: Record<string, string> = {
  extrato: "Extrato",
  informe: "Informe",
  contrato: "Contrato",
  comprovante: "Comprovante",
};

const typeIcons: Record<string, React.ReactNode> = {
  extrato: <Receipt className="h-5 w-5" />,
  informe: <FilePieChart className="h-5 w-5" />,
  contrato: <FileCheck className="h-5 w-5" />,
  comprovante: <FileText className="h-5 w-5" />,
};

const typeColors: Record<string, string> = {
  extrato: "bg-[#00BC6E]/20 text-[#00BC6E]",
  informe: "bg-cyan-500/20 text-cyan-400",
  contrato: "bg-amber-500/20 text-amber-400",
  comprovante: "bg-violet-500/20 text-violet-400",
};

const statusLabels: Record<string, string> = {
  disponivel: "Disponivel",
  processando: "Processando",
  solicitado: "Solicitado",
};

const statusColors: Record<string, string> = {
  disponivel: "bg-[#00BC6E]/20 text-[#00BC6E]",
  processando: "bg-amber-500/20 text-amber-400",
  solicitado: "bg-cyan-500/20 text-cyan-400",
};

export function DocumentCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    const matchesYear =
      selectedYear === "all" || doc.date.startsWith(selectedYear);
    return matchesSearch && matchesType && matchesYear;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDownload = (doc: Document) => {
    // In real app, this would trigger download
    console.log("Downloading:", doc.name);
  };

  const handleView = (doc: Document) => {
    // In real app, this would open document viewer
    console.log("Viewing:", doc.name);
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-[#00BC6E]" />
        <h1 className="text-2xl font-bold text-white">Central de Documentos</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[10px] text-white/40 block mb-1">Extratos</span>
          <span className="text-lg font-bold text-white">
            {mockDocuments.filter((d) => d.type === "extrato").length}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[10px] text-white/40 block mb-1">Informes</span>
          <span className="text-lg font-bold text-white">
            {mockDocuments.filter((d) => d.type === "informe").length}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[10px] text-white/40 block mb-1">Contratos</span>
          <span className="text-lg font-bold text-white">
            {mockDocuments.filter((d) => d.type === "contrato").length}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[10px] text-white/40 block mb-1">Comprovantes</span>
          <span className="text-lg font-bold text-white">
            {mockDocuments.filter((d) => d.type === "comprovante").length}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        <Button
          variant="ghost"
          className="w-full justify-between text-white/60 hover:text-white hover:bg-white/5 border border-white/10"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              showFilters && "rotate-180"
            )}
          />
        </Button>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-[#01223F] border-white/10">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="extrato">Extratos</SelectItem>
                  <SelectItem value="informe">Informes</SelectItem>
                  <SelectItem value="contrato">Contratos</SelectItem>
                  <SelectItem value="comprovante">Comprovantes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-[#01223F] border-white/10">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10">
            <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhum documento encontrado
            </h3>
            <p className="text-sm text-white/50">
              Tente ajustar os filtros ou termo de busca
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0",
                    typeColors[doc.type]
                  )}
                >
                  {typeIcons[doc.type]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-white truncate">
                      {doc.name}
                    </span>
                    <Badge
                      className={cn("text-[10px] px-1.5 py-0", statusColors[doc.status])}
                    >
                      {statusLabels[doc.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(doc.date)}
                    </span>
                    <span>{doc.size}</span>
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] px-1.5 py-0", typeColors[doc.type])}
                    >
                      {typeLabels[doc.type]}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.status === "disponivel" ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                        onClick={() => handleView(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#00BC6E] hover:text-[#00BC6E] hover:bg-[#00BC6E]/10"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <Clock className="h-3 w-3" />
                      Aguardando
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Request Document */}
      <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-[#00BC6E]/10 to-cyan-500/10 border border-[#00BC6E]/20">
        <h3 className="text-sm font-semibold text-white mb-2">
          Precisa de outro documento?
        </h3>
        <p className="text-xs text-white/60 mb-3">
          Entre em contato com seu consultor para solicitar documentos especificos.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-[#00BC6E]/30 text-[#00BC6E] hover:bg-[#00BC6E]/10"
        >
          Solicitar Documento
        </Button>
      </div>
    </div>
  );
}
