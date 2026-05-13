import { ProductDetail } from "@/components/investor/product-detail"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <ProductDetail productId={id} />
      </WealthLayout>
    </ProtectedRoute>
  )
}
