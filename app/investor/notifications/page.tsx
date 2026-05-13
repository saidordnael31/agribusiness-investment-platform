import { NotificationsCenter } from "@/components/investor/notifications-center"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { WealthLayout } from "@/components/layout/wealth-layout"

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <NotificationsCenter />
      </WealthLayout>
    </ProtectedRoute>
  )
}
