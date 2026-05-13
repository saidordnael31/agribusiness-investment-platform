import { ProductCatalog } from "@/components/investor/product-catalog"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

export default function ProductsPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <ProductCatalog />
      </WealthLayout>
    </ProtectedRoute>
  )
}
