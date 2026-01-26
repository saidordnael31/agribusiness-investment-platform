'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Mail, Phone, MapPin, Briefcase, Heart, Globe, CreditCard, Calendar, Shield, FileText, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ContractList } from './contract-list'
import { UserInvestmentsList } from './user-investments-list'

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
  bank_name?: string | null
  bank_branch?: string | null
  bank_account?: string | null
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

      if (!userId) {
        throw new Error('ID do usuário não fornecido')
      }

      console.log('🔍 [DEBUG] Buscando perfil para userId:', userId)
      const response = await fetch(`/api/profile?userId=${userId}`)
      const result = await response.json()

      console.log('🔍 [DEBUG] Resposta da API:', { success: result.success, userId: result.data?.id, email: result.data?.email })

      if (result.success) {
        // Verificar se o perfil retornado corresponde ao userId solicitado
        if (result.data?.id !== userId) {
          console.warn('⚠️ [WARNING] Perfil retornado não corresponde ao userId solicitado:', {
            requested: userId,
            returned: result.data?.id
          })
        }
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

  const formatCpf = (digits: string) => {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatCnpj = (digits: string) => {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatCpfCnpj = (value?: string | null) => {
    if (!value) return 'Não informado'
    const digits = value.replace(/\D/g, '')
    if (digits.length === 11) return formatCpf(digits)
    if (digits.length === 14) return formatCnpj(digits)
    return value
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
    <div className="w-full space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Perfil do Usuário</h1>
            <p className="text-white/70">Visualizando dados de {profileData.full_name || profileData.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Editar Perfil
          </Button>
          <Button onClick={onClose} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Fechar
          </Button>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="w-5 h-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/70">Nome Completo</label>
                <p className="text-lg font-medium text-white">{profileData.full_name || 'Não informado'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-white/70">E-mail</label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-white/70" />
                  <p className="text-lg text-white">{profileData.email}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70">Telefone</label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-white/70" />
                  <p className="text-lg text-white">{profileData.phone || 'Não informado'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70">Tipo de Usuário</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm bg-white/10 border-white/20 text-white">
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
                <label className="text-sm font-medium text-white/70">CPF / CNPJ</label>
                <p className="text-lg font-mono text-white">{formatCpfCnpj(profileData.cnpj)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70">RG</label>
                <p className="text-lg font-mono text-white">{profileData.rg || 'Não informado'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70">Profissão</label>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-white/70" />
                  <p className="text-lg text-white">{profileData.profession || 'Não informado'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70">Estado Civil</label>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-white/70" />
                  <p className="text-lg text-white">
                    {profileData.marital_status ? MARITAL_STATUS_LABELS[profileData.marital_status] : 'Não informado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="w-5 h-5" />
            Informações Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/70">Nacionalidade</label>
                <p className="text-lg text-white">
                  {profileData.nationality || 'Não informado'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70">Endereço</label>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-white/70 mt-1" />
                  <p className="text-lg text-white">{profileData.address || 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/70">Chave PIX / USDT</label>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-white/70" />
                  <p className="text-lg font-mono break-all text-white">
                    {profileData.pix_usdt_key || 'Não informado'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70">Cargo / Função</label>
                <p className="text-lg text-white">{profileData.role || 'Não informado'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Bancárias */}
      <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CreditCard className="w-5 h-5" />
            Informações Bancárias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-white/70">Banco</label>
              <p className="text-lg text-white">{profileData.bank_name || 'Não informado'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-white/70">Agência</label>
              <p className="text-lg font-mono text-white">{profileData.bank_branch || 'Não informado'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-white/70">Conta</label>
              <p className="text-lg font-mono break-all text-white">{profileData.bank_account || 'Não informado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Financeiras */}
      {(profileData.total_invested || profileData.total_captured) && (
        <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profileData.total_invested && profileData.total_invested > 0 && (
                <div>
                  <label className="text-sm font-medium text-white/70">Total Investido</label>
                  <p className="text-2xl font-bold text-[#00BC6E]">
                    {formatCurrency(profileData.total_invested)}
                  </p>
                </div>
              )}

              {profileData.total_captured && profileData.total_captured > 0 && (
                <div>
                  <label className="text-sm font-medium text-white/70">Total Captado</label>
                  <p className="text-2xl font-bold text-[#3B82F6]">
                    {formatCurrency(profileData.total_captured)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas de Informações Adicionais */}
      <Tabs defaultValue="system" className="w-full">
        <TabsList className={`grid w-full bg-[#01223F]/50 border border-white/10 ${
          profileData.user_type === 'investor' 
            ? 'grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          <TabsTrigger value="system" className="flex items-center gap-2 text-white/70 data-[state=active]:bg-[#003562] data-[state=active]:text-white data-[state=active]:border-white/20">
            <Calendar className="w-4 h-4" />
            Sistema
          </TabsTrigger>
          {profileData.user_type === 'investor' && (
            <>
              <TabsTrigger value="contracts" className="flex items-center gap-2 text-white/70 data-[state=active]:bg-[#003562] data-[state=active]:text-white data-[state=active]:border-white/20">
                <FileText className="w-4 h-4" />
                Contratos
              </TabsTrigger>
              <TabsTrigger value="investments" className="flex items-center gap-2 text-white/70 data-[state=active]:bg-[#003562] data-[state=active]:text-white data-[state=active]:border-white/20">
                <TrendingUp className="w-4 h-4" />
                Investimentos
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="system" className="mt-6">
          <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-white text-xl">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 uppercase tracking-wide">Data de Cadastro</label>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-8 bg-[#00BC6E] rounded-full"></div>
                    <p className="text-lg font-semibold text-white">{formatDate(profileData.created_at)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 uppercase tracking-wide">Última Atualização</label>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-8 bg-[#3B82F6] rounded-full"></div>
                    <p className="text-lg font-semibold text-white">{formatDate(profileData.updated_at)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {profileData.user_type === 'investor' && (
          <TabsContent value="contracts" className="mt-6">
            <ContractList 
              investorId={userId}
              investorName={profileData.full_name || profileData.email}
            />
          </TabsContent>
        )}

        {profileData.user_type === 'investor' && (
          <TabsContent value="investments" className="mt-6">
            <UserInvestmentsList 
              userId={userId}
              userName={profileData.full_name || profileData.email}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
