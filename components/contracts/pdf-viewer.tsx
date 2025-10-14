"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, X, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PDFViewerProps {
  contractId: string;
  fileName: string;
  fileType: string;
  onClose?: () => void;
}

export function PDFViewer({ contractId, fileName, fileType, onClose }: PDFViewerProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (contractId) {
      loadUrls();
    }
  }, [contractId]);

  const loadUrls = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Carregar URL de visualização
      const viewResponse = await fetch(`/api/contracts/view?contractId=${contractId}`);
      const viewData = await viewResponse.json();

      if (!viewData.success) {
        throw new Error(viewData.error || "Erro ao carregar visualização");
      }

      setViewUrl(viewData.data.viewUrl);

      // Carregar URL de download
      const downloadResponse = await fetch(`/api/contracts/download?contractId=${contractId}`);
      const downloadData = await downloadResponse.json();

      if (downloadData.success) {
        setDownloadUrl(downloadData.data.downloadUrl);
      }

    } catch (err: any) {
      console.error("Error loading PDF:", err);
      setError(err.message);
      toast({
        title: "Erro ao carregar PDF",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isPDF = fileType.includes('pdf');

  if (!isPDF) {
    return (
      <Card className="w-full max-w-6xl mx-auto relative z-[10000]" style={{ pointerEvents: 'auto' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {fileName}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Este arquivo não pode ser visualizado no navegador.</p>
              <p className="text-sm">Apenas arquivos PDF podem ser visualizados.</p>
              {downloadUrl && (
                <Button onClick={handleDownload} className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arquivo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto relative z-[10000]" style={{ pointerEvents: 'auto' }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {fileName}
        </CardTitle>
        <div className="flex gap-2">
          {downloadUrl && (
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center p-8 text-destructive">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>{error}</p>
              <Button onClick={loadUrls} className="mt-4" variant="outline">
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {viewUrl && !isLoading && !error && (
          <div className="w-full">
            <iframe
              src={viewUrl}
              className="w-full h-[70vh] min-h-[500px] border rounded-lg"
              title={`Visualização de ${fileName}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
