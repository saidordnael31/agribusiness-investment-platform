import { Suspense } from "react";
import { NewPasswordPageClient } from "./NewPasswordPageClient";

export default function NewPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Carregando...
        </div>
      }
    >
      <NewPasswordPageClient />
    </Suspense>
  );
}
