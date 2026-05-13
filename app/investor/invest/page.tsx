import { InvestPage } from "@/components/investor/invest-page";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { WealthLayout } from "@/components/layout/wealth-layout";

export const metadata = {
  title: "Investir | Agrinvest by Akin S.A.",
  description:
    "Prateleira privada de produtos estruturados, crédito, agro, infraestrutura e alternativos da Akin S.A.",
};

export default function InvestirPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <InvestPage />
      </WealthLayout>
    </ProtectedRoute>
  );
}
