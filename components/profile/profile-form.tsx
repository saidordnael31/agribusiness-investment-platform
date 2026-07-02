'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AdminSectionCard,
  AdminPrimaryButton,
  adminTokens,
} from '@/components/admin/ui'

interface ProfileData {
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
  bank_name: string | null
  bank_branch: string | null
  bank_account: string | null
  user_type: string
  role: string | null
  created_at: string
  updated_at: string
}

interface ProfileFormProps {
  initialData?: ProfileData
  onSave?: (data: ProfileData) => void
  variant?: 'default' | 'admin'
}

const MARITAL_STATUS_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
]

const NATIONALITY_OPTIONS = [
  { value: 'brasileira', label: 'Brasileira' },
  { value: 'estrangeira', label: 'Estrangeira' },
]

export function ProfileForm({ initialData, onSave, variant = 'default' }: ProfileFormProps) {
  const isAdmin = variant === 'admin'
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<Partial<ProfileData>>({
    full_name: '',
    phone: '',
    address: '',
    profession: '',
    marital_status: '',
    nationality: '',
    pix_usdt_key: '',
    bank_name: '',
    bank_branch: '',
    bank_account: '',
    cnpj: '',
    rg: '',
  })
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([])
  const [isLoadingBanks, setIsLoadingBanks] = useState(false)
  const [bankSearchTerm, setBankSearchTerm] = useState('')
  const [isBankListOpen, setIsBankListOpen] = useState(false)

  useEffect(() => {
    if (initialData) {
      const initialCnpj = initialData.cnpj || ''
      const cnpjDigits = initialCnpj.replace(/\D/g, '')
      const formattedCnpj =
        cnpjDigits.length === 11
          ? formatCPF(cnpjDigits)
          : cnpjDigits.length === 14
          ? formatCNPJ(cnpjDigits)
          : initialCnpj

      setFormData({
        full_name: initialData.full_name || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        profession: initialData.profession || '',
        marital_status: initialData.marital_status || '',
        nationality: initialData.nationality || '',
        pix_usdt_key: initialData.pix_usdt_key || '',
        bank_name: initialData.bank_name || '',
        bank_branch: initialData.bank_branch || '',
        bank_account: initialData.bank_account || '',
        cnpj: formattedCnpj || '',
        rg: initialData.rg || '',
      })
      setBankSearchTerm(initialData.bank_name || '')
    }
  }, [initialData])

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setIsLoadingBanks(true)
        const response = await fetch('https://brasilapi.com.br/api/banks/v1')
        if (!response.ok) {
          throw new Error('Erro ao carregar bancos')
        }
        const data = await response.json()
        setBanks(
          (data || []).map((bank: any) => ({
            code: bank.code?.toString() || '',
            name: bank.name || '',
          }))
        )
      } catch (error) {
        console.error('Erro ao buscar bancos:', error)
        toast({
          title: 'Erro ao carregar bancos',
          description: 'Não foi possível carregar a lista de bancos. Tente novamente mais tarde.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingBanks(false)
      }
    }

    fetchBanks()
  }, [toast])

  const validateField = (field: keyof ProfileData, value: string): string => {
    switch (field) {
      case 'full_name':
        if (!value.trim()) return 'Nome completo é obrigatório'
        if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres'
        return ''
      
      case 'phone':
        if (value && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value)) {
          return 'Telefone deve estar no formato (11) 99999-9999'
        }
        return ''
      
      case 'pix_usdt_key':
        if (value && value.length < 10) {
          return 'Chave PIX/USDT deve ter pelo menos 10 caracteres'
        }
        return ''

      case 'cnpj': {
        if (value) {
          const digits = value.replace(/\D/g, '')
          if (digits.length !== 11 && digits.length !== 14) {
            return 'CPF/CNPJ inválido'
          }
        }
        return ''
      }

      case 'rg': {
        if (value) {
          const normalized = value.replace(/\s+/g, '')
          if (normalized.length < 5) {
            return 'RG inválido'
          }
        }
        return ''
      }
      
      default:
        return ''
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Validar campos obrigatórios
    const requiredFields: (keyof ProfileData)[] = ['full_name']
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field] || '')
      if (error) {
        newErrors[field] = error
      }
    })

    // Validar campos opcionais que têm valor
    Object.keys(formData).forEach(field => {
      const value = formData[field as keyof ProfileData] || ''
      if (value && !requiredFields.includes(field as keyof ProfileData)) {
        const error = validateField(field as keyof ProfileData, value)
        if (error) {
          newErrors[field] = error
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSave = async () => {
    // Validar formulário antes de salvar
    if (!validateForm()) {
      toast({
        title: "Dados inválidos",
        description: "Por favor, corrija os erros antes de salvar.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone || null,
          address: formData.address || null,
          profession: formData.profession || null,
          marital_status: formData.marital_status || null,
          nationality: formData.nationality || null,
          pix_usdt_key: formData.pix_usdt_key || null,
          bank_name: formData.bank_name || null,
          bank_branch: formData.bank_branch || null,
          bank_account: formData.bank_account || null,
          cnpj: formData.cnpj ? formData.cnpj.replace(/\D/g, '') : null,
          rg: formData.rg || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Perfil atualizado",
          description: "Seus dados foram salvos com sucesso.",
        })
        
        if (onSave) {
          onSave(result.data)
        }
      } else {
        throw new Error(result.error || 'Erro ao salvar perfil')
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', isAdmin && 'text-[#A5B3AC]')}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando perfil...</span>
      </div>
    )
  }

  const labelClass = isAdmin ? adminTokens.label : undefined
  const inputClass = (hasError?: boolean) =>
    cn(
      isAdmin && adminTokens.input,
      hasError && 'border-destructive',
      !isAdmin && hasError && 'border-destructive',
    )
  const hintClass = cn('text-xs', isAdmin ? 'text-[#6B7C74]' : 'text-muted-foreground')
  const errorClass = cn('text-sm', isAdmin ? 'text-red-400' : 'text-destructive')

  const Section = ({
    title,
    children,
  }: {
    title: string
    children: React.ReactNode
  }) => {
    if (isAdmin) {
      return <AdminSectionCard title={title}>{children}</AdminSectionCard>
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    )
  }

  return (
    <div className={cn(isAdmin ? 'mx-auto max-w-5xl space-y-4' : 'mx-auto max-w-5xl space-y-6 p-6')}>
      {!isAdmin && (
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>
        </div>
      )}

      <Section title="Informações Pessoais">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className={labelClass}>Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name || ''}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Digite seu nome completo"
              className={inputClass(!!errors.full_name)}
            />
            {errors.full_name && <p className={errorClass}>{errors.full_name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className={labelClass}>E-mail</Label>
            <Input
              id="email"
              value={initialData?.email || ''}
              disabled
              className={cn(inputClass(), isAdmin ? 'opacity-60' : 'bg-muted')}
            />
            <p className={hintClass}>O e-mail não pode ser alterado</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className={labelClass}>Telefone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              maxLength={15}
              className={inputClass(!!errors.phone)}
            />
            {errors.phone && <p className={errorClass}>{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profession" className={labelClass}>Profissão</Label>
            <Input
              id="profession"
              value={formData.profession || ''}
              onChange={(e) => handleInputChange('profession', e.target.value)}
              placeholder="Digite sua profissão"
              className={inputClass()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="marital_status" className={labelClass}>Estado Civil</Label>
            <Select
              value={formData.marital_status || ''}
              onValueChange={(value) => handleInputChange('marital_status', value)}
            >
              <SelectTrigger className={inputClass()}>
                <SelectValue placeholder="Selecione seu estado civil" />
              </SelectTrigger>
              <SelectContent className={isAdmin ? adminTokens.selectContent : undefined}>
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nationality" className={labelClass}>Nacionalidade</Label>
            <Select
              value={formData.nationality || ''}
              onValueChange={(value) => handleInputChange('nationality', value)}
            >
              <SelectTrigger className={inputClass()}>
                <SelectValue placeholder="Selecione sua nacionalidade" />
              </SelectTrigger>
              <SelectContent className={isAdmin ? adminTokens.selectContent : undefined}>
                {NATIONALITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Documentos e Acesso">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cnpj" className={labelClass}>CPF / CNPJ</Label>
            <Input
              id="cnpj"
              value={formData.cnpj || ''}
              onChange={(e) => handleInputChange('cnpj', e.target.value)}
              onBlur={(e) => {
                const raw = e.target.value.replace(/\D/g, '')
                if (raw.length === 11) {
                  handleInputChange('cnpj', formatCPF(raw))
                } else if (raw.length === 14) {
                  handleInputChange('cnpj', formatCNPJ(raw))
                } else {
                  handleInputChange('cnpj', e.target.value)
                }
              }}
              placeholder="Digite seu CPF ou CNPJ"
              maxLength={18}
              className={inputClass(!!errors.cnpj)}
            />
            <p className={hintClass}>Informe apenas números ou utilize a máscara padrão.</p>
            {errors.cnpj && <p className={errorClass}>{errors.cnpj}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rg" className={labelClass}>RG</Label>
            <Input
              id="rg"
              value={formData.rg || ''}
              onChange={(e) => handleInputChange('rg', e.target.value)}
              placeholder="Digite seu RG"
              className={inputClass(!!errors.rg)}
            />
            <p className={hintClass}>Utilize somente números e letras.</p>
            {errors.rg && <p className={errorClass}>{errors.rg}</p>}
          </div>
        </div>
      </Section>

      <Section title="Endereço e Contato">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="address" className={labelClass}>Endereço</Label>
            <Input
              id="address"
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Digite seu endereço completo"
              className={inputClass()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pix_usdt_key" className={labelClass}>Chave PIX / USDT</Label>
            <Input
              id="pix_usdt_key"
              value={formData.pix_usdt_key || ''}
              onChange={(e) => handleInputChange('pix_usdt_key', e.target.value)}
              placeholder="Digite sua chave PIX ou USDT"
              className={inputClass(!!errors.pix_usdt_key)}
            />
            {errors.pix_usdt_key && <p className={errorClass}>{errors.pix_usdt_key}</p>}
            <p className={hintClass}>Use esta chave para receber pagamentos e resgates</p>
          </div>
        </div>
      </Section>

      <Section title="Informações Bancárias">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="bank_name" className={labelClass}>Banco</Label>
            <div className="relative">
              <Input
                id="bank_name"
                value={bankSearchTerm}
                onChange={(e) => {
                  const value = e.target.value
                  setBankSearchTerm(value)
                  setFormData((prev) => ({ ...prev, bank_name: value }))
                  setIsBankListOpen(true)
                }}
                onFocus={() => setIsBankListOpen(true)}
                onBlur={() => setTimeout(() => setIsBankListOpen(false), 150)}
                placeholder={isLoadingBanks ? 'Carregando bancos...' : 'Digite nome ou código do banco'}
                disabled={isLoadingBanks}
                className={inputClass()}
              />
              {isBankListOpen && (
                <div
                  className={cn(
                    'absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border shadow-md',
                    isAdmin
                      ? 'border-white/[0.08] bg-[#161F1B] shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
                      : 'border bg-background',
                  )}
                >
                  {isLoadingBanks ? (
                    <div className={cn('p-3 text-sm', hintClass)}>Carregando bancos...</div>
                  ) : (() => {
                    const filteredBanks = banks.filter((bank) =>
                      `${bank.code} ${bank.name}`.toLowerCase().includes(bankSearchTerm.toLowerCase()),
                    )
                    if (filteredBanks.length === 0) {
                      return <div className={cn('p-3 text-sm', hintClass)}>Nenhum banco encontrado.</div>
                    }
                    return filteredBanks.map((bank) => (
                      <button
                        key={bank.code}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm',
                          isAdmin
                            ? 'text-[#A5B3AC] hover:bg-[#202C26]'
                            : 'hover:bg-accent',
                          formData.bank_name === `${bank.code} - ${bank.name}` &&
                            (isAdmin ? 'bg-[#202C26]' : 'bg-accent/60'),
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          const displayName = `${bank.code} - ${bank.name}`
                          setBankSearchTerm(displayName)
                          setFormData((prev) => ({ ...prev, bank_name: displayName }))
                          setIsBankListOpen(false)
                        }}
                      >
                        <span className="font-medium">{bank.code}</span>
                        <span className={hintClass}>{bank.name}</span>
                      </button>
                    ))
                  })()}
                </div>
              )}
            </div>
            <p className={hintClass}>Digite parte do nome ou código para localizar seu banco.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank_branch" className={labelClass}>Agência</Label>
            <Input
              id="bank_branch"
              value={formData.bank_branch || ''}
              onChange={(e) => handleInputChange('bank_branch', e.target.value)}
              placeholder="0001"
              className={inputClass()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank_account" className={labelClass}>Conta</Label>
            <Input
              id="bank_account"
              value={formData.bank_account || ''}
              onChange={(e) => handleInputChange('bank_account', e.target.value)}
              placeholder="000000-0"
              className={inputClass()}
            />
          </div>
        </div>
      </Section>

      <div className={cn('flex justify-end', isAdmin ? 'pt-2' : 'pt-6')}>
        {isAdmin ? (
          <AdminPrimaryButton onClick={handleSave} disabled={isSaving} className="h-10 px-5">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </AdminPrimaryButton>
        ) : (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
