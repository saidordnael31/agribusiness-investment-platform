import { ProtectedRoute } from "@/components/auth/protected-route"
import { DepositFlow } from "@/components/investment/deposit-flow"

export default function DepositPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <div className="min-h-screen bg-gradient-to-b from-[#003F28] via-[#003562] to-[#01223F]">
        <div className="container mx-auto px-4 py-8">
          <DepositFlow />
        </div>
      </div>
    </ProtectedRoute>
  )
}
