"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"

export default function UsersPage() {
  return (
    <ProtectedRoute allowedTypes={["admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-[#001F2E] via-[#003562] to-[#01223F] p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Usuários</h1>
          
          {/* Conteúdo da página será adicionado aqui */}
          <div className="bg-[#01223F]/50 rounded-lg border border-[#00BC6E]/20 p-6">
            <p className="text-white/70">Página de gerenciamento de usuários</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}


