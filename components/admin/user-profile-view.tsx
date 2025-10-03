'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Mail, Phone, MapPin, Briefcase, Heart, Globe, CreditCard, Calendar, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface UserProfileData {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  address: string | null
  cnpj: string | null
  rg: string | null
  profession: string | null
  marital_status: string | null
  nationality: string | null
  pix_usdt_key: string | null
  user_type: string
  role: string | null
  status?: string
  is_active?: boolean
  created_at: string
  updated_at: string
  total_invested?: number
  total_captured?: number
}

interface UserProfileViewProps {
  userId: string
  onEdit: () => void
  onClose: () => void
}

const MARITAL_STATUS_LABELS: Record<string, string> = {
  'solteiro': 'Solteiro(a)',
  'casado': 'Casado(a)',
  'divorciado': 'Divorciado(a)',
  'viuvo': 'Viúvo(a)',
  'uniao_estavel': 'União Estável',
}


const USER_TYPE_LABELS: Record<string, string> = {
  'investor': 'Investidor',
  'distributor': 'Distribuidor',
  'assessor': 'Assessor',
  'gestor': 'Gestor',
  'escritorio': 'Escritório',
  'lider': 'Líder',
}

const STATUS_LABELS: Record<string, string> = {
  'active': 'Ativo',
  'inactive': 'Inativo',
  'pending': 'Pendente',
}

const STATUS_COLORS: Record<string, string> = {
  'active': 'bg-green-100 text-green-800 border-green-200',
  'inactive': 'bg-red-100 text-red-800 border-red-200',
  'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

export function UserProfileView({ userId, onEdit, onClose }: UserProfileViewProps) {
  const { toast } = useToast()
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [userId])

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/profile?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setProfileData(result.data)
      } else {
        throw new Error(result.error || 'Erro ao carregar perfil do usuário')
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error)
      setError(error instanceof Error ? error.message : 'Erro inesperado')
      toast({
        title: "Erro ao carregar perfil",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando perfil do usuário...</p>
        </div>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="text-center p-8">
        <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar perfil</h3>
        <p className="text-muted-foreground mb-4">{error || 'Perfil não encontrado'}</p>
        <Button onClick={onClose} variant="outline">
          Fechar
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Perfil do Usuário</h1>
            <p className="text-muted-foreground">Visualizando dados de {profileData.full_name || profileData.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} variant="outline">
            Editar Perfil
          </Button>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-lg font-medium">{profileData.full_name || 'Não informado'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-lg">{profileData.email}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <p className="text-lg">{profileData.phone || 'Não informado'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Usuário</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {USER_TYPE_LABELS[profileData.user_type] || profileData.user_type}
                  </Badge>
                  <Badge className={STATUS_COLORS[profileData.status || (profileData.is_active ? 'active' : 'inactive')]}>
                    {STATUS_LABELS[profileData.status || (profileData.is_active ? 'active' : 'inactive')] || (profileData.is_active ? 'Ativo' : 'Inativo')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">CPF / CNPJ</label>
                <p className="text-lg font-mono">{profileData.cnpj || 'Não informado'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">RG</label>
                <p className="text-lg font-mono">{profileData.rg || 'Não informado'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Profissão</label>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <p className="text-lg">{profileData.profession || 'Não informado'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado Civil</label>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <p className="text-lg">
                    {profileData.marital_status ? MARITAL_STATUS_LABELS[profileData.marital_status] : 'Não informado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Informações Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nacionalidade</label>
                <p className="text-lg">
                  {profileData.nationality || 'Não informado'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <p className="text-lg">{profileData.address || 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Chave PIX / USDT</label>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <p className="text-lg font-mono break-all">
                    {profileData.pix_usdt_key || 'Não informado'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Cargo / Função</label>
                <p className="text-lg">{profileData.role || 'Não informado'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Financeiras */}
      {(profileData.total_invested || profileData.total_captured) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profileData.total_invested && profileData.total_invested > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Investido</label>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(profileData.total_invested)}
                  </p>
                </div>
              )}

              {profileData.total_captured && profileData.total_captured > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Captado</label>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(profileData.total_captured)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
              <p className="text-lg">{formatDate(profileData.created_at)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
              <p className="text-lg">{formatDate(profileData.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
