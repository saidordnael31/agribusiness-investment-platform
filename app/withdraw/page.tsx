import { ProtectedRoute } from "@/components/auth/protected-route"
import { WithdrawFlow } from "@/components/investment/withdraw-flow"

export default function WithdrawPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="container mx-auto px-4 py-8">
          <WithdrawFlow />
        </div>
      </div>
    </ProtectedRoute>
  )
}
