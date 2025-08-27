import { ProtectedRoute } from "@/components/auth/protected-route"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminPage() {
  return (
    <ProtectedRoute allowedTypes={["admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50">
        <AdminDashboard />
      </div>
    </ProtectedRoute>
  )
}
