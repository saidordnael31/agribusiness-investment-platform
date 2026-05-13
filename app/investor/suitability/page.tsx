import { SuitabilityProfile } from "@/components/investor/suitability-profile"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

export default function SuitabilityPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <SuitabilityProfile />
      </WealthLayout>
    </ProtectedRoute>
  )
}
