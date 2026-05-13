import { DocumentCenter } from "@/components/investor/document-center"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

export default function DocumentsPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <DocumentCenter />
      </WealthLayout>
    </ProtectedRoute>
  )
}
