import { PortfoliosPage } from "@/components/investor/portfolios-page";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { WealthLayout } from "@/components/layout/wealth-layout";

export const metadata = {
  title: "Carteiras Recomendadas | Agrinvest by Akin S.A.",
  description:
    "Composições estruturadas para diferentes perfis, prazos e objetivos patrimoniais.",
};

export default function CarteirasPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <PortfoliosPage />
      </WealthLayout>
    </ProtectedRoute>
  );
}
