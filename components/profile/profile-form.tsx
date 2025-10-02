'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        profession: initialData.profession || '',
        marital_status: initialData.marital_status || '',
        nationality: initialData.nationality || '',
        pix_usdt_key: initialData.pix_usdt_key || '',
      })
    }
  }, [initialData])

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
        body: JSON.stringify(formData),
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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nome Completo */}
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

        {/* E-mail */}
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

        {/* Telefone */}
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

        {/* CPF/CNPJ */}
        <div className="space-y-2">
          <Label htmlFor="cnpj">CPF / CNPJ</Label>
          <Input
            id="cnpj"
            value={initialData?.cnpj || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            CPF/CNPJ não pode ser alterado
          </p>
        </div>

        {/* RG */}
        <div className="space-y-2">
          <Label htmlFor="rg">RG</Label>
          <Input
            id="rg"
            value={initialData?.rg || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            RG não pode ser alterado
          </p>
        </div>

        {/* Profissão */}
        <div className="space-y-2">
          <Label htmlFor="profession">Profissão</Label>
          <Input
            id="profession"
            value={formData.profession || ''}
            onChange={(e) => handleInputChange('profession', e.target.value)}
            placeholder="Digite sua profissão"
          />
        </div>

        {/* Estado Civil */}
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

        {/* Nacionalidade */}
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

      {/* Endereço */}
      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Digite seu endereço completo"
        />
      </div>

      {/* PIX/USDT Key */}
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

      {/* Botão Salvar */}
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
