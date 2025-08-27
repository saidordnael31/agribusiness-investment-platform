import { DistributorDashboard } from "@/components/distributor/distributor-dashboard"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function DistributorPage() {
  return (
    <ProtectedRoute allowedTypes={["distributor"]}>
      <DistributorDashboard />
    </ProtectedRoute>
  )
}
