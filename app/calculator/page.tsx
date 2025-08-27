import { CommissionCalculator } from "@/components/calculator/commission-calculator"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function CalculatorPage() {
  return (
    <ProtectedRoute allowedTypes={["distributor", "admin"]}>
      <CommissionCalculator />
    </ProtectedRoute>
  )
}
