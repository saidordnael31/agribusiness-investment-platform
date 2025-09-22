"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Mail, Copy, Eye } from "lucide-react";

interface EmailData {
  fileName: string;
  email: string;
  name: string;
  value: string;
  cpf: string;
  pixCode: string;
  content: string;
  createdAt: string;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email/list');
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails);
      }
    } catch (error) {
      console.error('Erro ao carregar emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando emails...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">📧 Emails PIX Salvos</h1>
          <p className="text-muted-foreground">
            Visualize todos os emails com códigos PIX gerados
          </p>
        </div>
        <Button onClick={fetchEmails} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {emails.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum email encontrado</h3>
            <p className="text-muted-foreground">
              Gere um código PIX para ver os emails salvos aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {emails.map((email, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{email.name}</CardTitle>
                    <CardDescription>{email.email}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {formatDate(email.createdAt)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor</p>
                    <p className="text-lg font-semibold text-green-600">{email.value}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CPF</p>
                    <p className="font-mono text-sm">{email.cpf}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Código PIX</p>
                    <p className="font-mono text-xs break-all">{email.pixCode}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(email.content)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para visualizar email completo */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Completo</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmail(null)}
                >
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
                {selectedEmail.content}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
