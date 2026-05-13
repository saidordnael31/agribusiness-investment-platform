import { MoreMenu } from "@/components/investor/more-menu"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

export default function MorePage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <MoreMenu />
      </WealthLayout>
    </ProtectedRoute>
  )
}
