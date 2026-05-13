import { PortfolioOverview } from "@/components/investor/portfolio-overview"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

export default function PortfolioPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <PortfolioOverview />
      </WealthLayout>
    </ProtectedRoute>
  )
}
