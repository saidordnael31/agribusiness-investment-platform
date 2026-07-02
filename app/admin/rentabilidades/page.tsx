import { ProtectedRoute } from "@/components/auth/protected-route";
import { RentabilidadesManager } from "@/components/admin/rentabilidades-manager";

export default function RentabilidadesPage() {
  return (
    <ProtectedRoute allowedTypes={["admin"]}>
      <RentabilidadesManager />
    </ProtectedRoute>
  );
}
