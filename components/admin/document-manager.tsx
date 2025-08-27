"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Trash2, Edit, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Document {
  id: string
  name: string
  type: string
  category: string
  uploadDate: string
  size: string
  description: string
}

export function DocumentManager() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "regulamento_clube_2024.pdf",
      type: "PDF",
      category: "compliance",
      uploadDate: "2024-01-15",
      size: "2.5 MB",
      description: "Regulamento oficial do clube de investimentos",
    },
    {
      id: "2",
      name: "materiais_vendas.zip",
      type: "ZIP",
      category: "distribuidor",
      uploadDate: "2024-01-14",
      size: "15.2 MB",
      description: "Materiais promocionais para distribuidores",
    },
  ])

  const [newDocument, setNewDocument] = useState({
    name: "",
    category: "",
    description: "",
  })

  const handleUpload = () => {
    if (!newDocument.name || !newDocument.category) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    const document: Document = {
      id: Date.now().toString(),
      name: newDocument.name,
      type: newDocument.name.split(".").pop()?.toUpperCase() || "PDF",
      category: newDocument.category,
      uploadDate: new Date().toISOString().split("T")[0],
      size: "0 MB",
      description: newDocument.description,
    }

    setDocuments([document, ...documents])
    setNewDocument({ name: "", category: "", description: "" })

    toast({
      title: "Sucesso",
      description: "Documento adicionado com sucesso",
    })
  }

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id))
    toast({
      title: "Documento removido",
      description: "O documento foi removido com sucesso",
    })
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      compliance: "Compliance",
      auditoria: "Auditoria",
      laminas: "Lâminas",
      distribuidor: "Distribuidores",
    }
    return labels[category] || category
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Documentos
          </CardTitle>
          <CardDescription>Adicione novos documentos para investidores e distribuidores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="docName">Nome do Arquivo</Label>
              <Input
                id="docName"
                placeholder="documento.pdf"
                value={newDocument.name}
                onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={newDocument.category}
                onValueChange={(value) => setNewDocument({ ...newDocument, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="auditoria">Auditoria</SelectItem>
                  <SelectItem value="laminas">Lâminas de Investimento</SelectItem>
                  <SelectItem value="distribuidor">Distribuidores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição do documento..."
              value={newDocument.description}
              onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
            />
          </div>

          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Arraste arquivos aqui ou clique para selecionar</p>
            <Button variant="outline" className="mb-2 bg-transparent">
              Selecionar Arquivos
            </Button>
            <p className="text-xs text-muted-foreground">Formatos aceitos: PDF, ZIP, DOC, DOCX (máx. 50MB)</p>
          </div>

          <Button onClick={handleUpload} className="w-full">
            Fazer Upload
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Gerenciados</CardTitle>
          <CardDescription>Lista de todos os documentos disponíveis na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-medium">{doc.name}</h4>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span>Categoria: {getCategoryLabel(doc.category)}</span>
                      <span>Tamanho: {doc.size}</span>
                      <span>Upload: {new Date(doc.uploadDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
