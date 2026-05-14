import { EquityPage } from "@/components/investor/equity-page";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { WealthLayout } from "@/components/layout/wealth-layout";

export const metadata = {
  title: "Akin Equity | Agrinvest by Akin S.A.",
  description:
    "Ofertas participativas e oportunidades de crescimento estruturadas conforme documentação aplicável.",
};

export default function AkinEquityPage() {
  return (
    <ProtectedRoute allowedTypes={["investor"]}>
      <WealthLayout>
        <EquityPage />
      </WealthLayout>
    </ProtectedRoute>
  );
}
