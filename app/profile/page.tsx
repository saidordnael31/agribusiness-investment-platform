'use client'

import { useState, useEffect } from 'react'
import { ProfileForm } from '@/components/profile/profile-form'
import { Loader2 } from 'lucide-react'

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

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/profile')
      const result = await response.json()

      if (result.success) {
        setProfileData(result.data)
      } else {
        throw new Error(result.error || 'Erro ao carregar perfil')
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      setError(error instanceof Error ? error.message : 'Erro inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSave = (updatedData: ProfileData) => {
    setProfileData(updatedData)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Carregando perfil...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Erro ao carregar perfil</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ProfileForm 
        initialData={profileData || undefined} 
        onSave={handleProfileSave}
      />
    </div>
  )
}
