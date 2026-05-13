import { SupportCenter } from "@/components/investor/support-center"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

export default function SupportPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <SupportCenter />
      </WealthLayout>
    </ProtectedRoute>
  )
}
