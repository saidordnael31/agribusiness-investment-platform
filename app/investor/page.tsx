import { InvestorDashboard } from "@/components/investor/investor-dashboard"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function InvestorPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <InvestorDashboard />
    </ProtectedRoute>
  )
}
