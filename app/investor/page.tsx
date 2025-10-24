import { InvestorDashboard } from "@/components/investor/investor-dashboard"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { InvestorLayout } from "@/components/layout/investor-layout"

export default function InvestorPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <InvestorLayout>
        <InvestorDashboard />
      </InvestorLayout>
    </ProtectedRoute>
  )
}
