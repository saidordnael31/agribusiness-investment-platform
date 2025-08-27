import { ProtectedRoute } from "@/components/auth/protected-route"
import { DepositFlow } from "@/components/investment/deposit-flow"

export default function DepositPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="container mx-auto px-4 py-8">
          <DepositFlow />
        </div>
      </div>
    </ProtectedRoute>
  )
}
