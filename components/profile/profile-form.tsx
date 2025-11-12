'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, User } from 'lucide-react'

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

export function ProfileForm({ initialData, onSave }: ProfileFormProps) {
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando perfil...</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Digite seu nome completo"
                className={errors.full_name ? 'border-destructive' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                value={initialData?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                maxLength={15}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profession">Profissão</Label>
              <Input
                id="profession"
                value={formData.profession || ''}
                onChange={(e) => handleInputChange('profession', e.target.value)}
                placeholder="Digite sua profissão"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marital_status">Estado Civil</Label>
              <Select
                value={formData.marital_status || ''}
                onValueChange={(value) => handleInputChange('marital_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu estado civil" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">Nacionalidade</Label>
              <Select
                value={formData.nationality || ''}
                onValueChange={(value) => handleInputChange('nationality', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua nacionalidade" />
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos e Acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CPF / CNPJ</Label>
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
                className={errors.cnpj ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Informe apenas números ou utilize a máscara padrão.
              </p>
              {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg || ''}
                onChange={(e) => handleInputChange('rg', e.target.value)}
                placeholder="Digite seu RG"
                className={errors.rg ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Utilize somente números e letras.
              </p>
              {errors.rg && <p className="text-sm text-destructive">{errors.rg}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço e Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Digite seu endereço completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pix_usdt_key">Chave PIX / USDT</Label>
            <Input
              id="pix_usdt_key"
              value={formData.pix_usdt_key || ''}
              onChange={(e) => handleInputChange('pix_usdt_key', e.target.value)}
              placeholder="Digite sua chave PIX ou USDT"
              className={errors.pix_usdt_key ? 'border-destructive' : ''}
            />
            {errors.pix_usdt_key && (
              <p className="text-sm text-destructive">{errors.pix_usdt_key}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use esta chave para receber pagamentos e resgates
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações Bancárias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Banco</Label>
              <div className="relative">
                <Input
                  id="bank_name"
                  value={bankSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value
                    setBankSearchTerm(value)
                    setFormData((prev) => ({
                      ...prev,
                      bank_name: value,
                    }))
                    setIsBankListOpen(true)
                  }}
                  onFocus={() => setIsBankListOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsBankListOpen(false), 150)
                  }}
                  placeholder={isLoadingBanks ? 'Carregando bancos...' : 'Digite nome ou código do banco'}
                  disabled={isLoadingBanks}
                />
                {isBankListOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md">
                    {isLoadingBanks ? (
                      <div className="p-3 text-sm text-muted-foreground">Carregando bancos...</div>
                    ) : (() => {
                      const filteredBanks = banks.filter((bank) =>
                        `${bank.code} ${bank.name}`.toLowerCase().includes(bankSearchTerm.toLowerCase())
                      )
                      if (filteredBanks.length === 0) {
                        return <div className="p-3 text-sm text-muted-foreground">Nenhum banco encontrado.</div>
                      }
                      return filteredBanks.map((bank) => (
                        <button
                          key={bank.code}
                          type="button"
                          className={`flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                            formData.bank_name === `${bank.code} - ${bank.name}` ? 'bg-accent/60' : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const displayName = `${bank.code} - ${bank.name}`
                            setBankSearchTerm(displayName)
                            setFormData((prev) => ({
                              ...prev,
                              bank_name: displayName,
                            }))
                            setIsBankListOpen(false)
                          }}
                        >
                          <span className="font-medium">{bank.code}</span>
                          <span className="text-muted-foreground">{bank.name}</span>
                        </button>
                      ))
                    })()}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Digite parte do nome ou código para localizar seu banco.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_branch">Agência</Label>
              <Input
                id="bank_branch"
                value={formData.bank_branch || ''}
                onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                placeholder="0001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account">Conta</Label>
              <Input
                id="bank_account"
                value={formData.bank_account || ''}
                onChange={(e) => handleInputChange('bank_account', e.target.value)}
                placeholder="000000-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-6">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
