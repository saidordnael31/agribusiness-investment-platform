import { InvestmentFlow } from "@/components/investment/investment-flow"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function InvestPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <InvestmentFlow />
    </ProtectedRoute>
  )
}
