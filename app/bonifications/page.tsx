import { ProtectedRoute } from "@/components/auth/protected-route"
import { BonificationSystem } from "@/components/bonification/bonification-system"

export default function BonificationsPage() {
  return (
    <ProtectedRoute allowedTypes={["distributor", "admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="container mx-auto px-4 py-8">
          <BonificationSystem />
        </div>
      </div>
    </ProtectedRoute>
  )
}
