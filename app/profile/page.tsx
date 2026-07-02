'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ProfileForm } from '@/components/profile/profile-form'
import {
  AdminShell,
  AdminWorkspace,
  AdminFintechNavbar,
  AdminHero,
  AdminPrimaryButton,
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

interface StoredUser {
  name?: string
  email?: string
  user_type?: string
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [storedUser, setStoredUser] = useState<StoredUser | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
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
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSave = (updatedData: ProfileData) => {
    setProfileData(updatedData)
  }

  const isAdminUser =
    profileData?.user_type === 'admin' || storedUser?.user_type === 'admin'

  const displayName =
    profileData?.full_name ||
    storedUser?.name ||
    storedUser?.email?.split('@')[0] ||
    'Admin'

  if (isAdminUser) {
    const nav = <AdminFintechNavbar userName={displayName} />

    if (isLoading) {
      return (
        <AdminShell nav={nav}>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-600" />
          </div>
        </AdminShell>
      )
    }

    if (error) {
      return (
        <AdminShell nav={nav}>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="rounded-2xl border border-white/[0.08] bg-[#161F1B] p-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <h2 className="font-semibold text-[#F3F5F4]">Erro ao carregar perfil</h2>
              <p className="mt-1 text-sm text-[#6B7C74]">{error}</p>
              <AdminPrimaryButton className="mt-4 h-9 px-4" onClick={fetchProfile}>
                Tentar novamente
              </AdminPrimaryButton>
            </div>
          </div>
        </AdminShell>
      )
    }

    return (
      <AdminShell nav={nav}>
        <AdminHero
          userName={displayName}
          title="Meu Perfil"
          description="Gerencie suas informações pessoais e dados de acesso"
          backHref="/admin"
          backLabel="Voltar ao painel"
        />
        <AdminWorkspace>
          <ProfileForm
            variant="admin"
            initialData={profileData || undefined}
            onSave={handleProfileSave}
          />
        </AdminWorkspace>
      </AdminShell>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Carregando perfil...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-destructive">Erro ao carregar perfil</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={fetchProfile}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
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
