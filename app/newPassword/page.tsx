"use client";

import { useState, useEffect } from "react";
import { NewPasswordForm } from "../../components/auth/new-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

export default function NewPasswordPage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="flex items-center justify-center space-x-2 mb-4"
          >
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Akintec Platform
            </h1>
          </Link>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Digite sua nova senha</CardDescription>
            </CardHeader>
            <CardContent>
              <NewPasswordForm />
            </CardContent>
          </Card>

          {!user && (
            <p className="text-center text-sm text-muted-foreground">
              Lembrou da senha?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Voltar ao login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
