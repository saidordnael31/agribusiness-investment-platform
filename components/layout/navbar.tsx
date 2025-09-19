"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  User,
  LogOut,
  Calculator,
  BarChart3,
  Menu,
  Plus,
  Minus,
  Gift,
  Settings,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createServerClient } from "@/lib/supabase/server";

interface UserData {
  id: string;
  email: string;
  user_type: string;
  office_id?: string | null;
  role?: string | null;
}

export function Navbar() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.email && userData.user_type) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Erro ao parsear dados do usuário:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear(); // Limpa todo o localStorage
    sessionStorage.clear(); // Limpa também o sessionStorage
    setUser(null); // Limpa o estado local

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });

    // Força o redirecionamento e recarregamento da página
    window.location.href = "/";
  };

  const isActive = (path: string) => pathname === path;

  const getUserDisplayName = () => {
    // const supabase = createServerClient()
    // // Buscar perfil do usuário
    // const { data: profiles } = await supabase
    //   .from("profiles")
    //   .select("*")
    // console.log("PROFILE", profiles)
    if (!user) return "";
    // Extrai o nome do email se não houver nome completo
    return user.name;
  };

  const getUserTypeLabel = () => {
    if (!user) return "";
    switch (user.user_type) {
      case "investor":
        return "Investidor";
      case "admin":
        return "Admin";
      case "distributor":
      case "advisor":
      case "assessor":
        return "Distribuidor";
      default:
        return user.user_type;
    }
  };

  const getDashboardRoute = () => {
    if (!user) return "/";
    switch (user.user_type) {
      case "investor":
        return "/investor";
      case "admin":
        return "/admin";
      case "distributor":
      case "advisor":
      case "assessor":
      default:
        return "/distributor";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-card-foreground">
              Akintec Platform
            </span>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href={getDashboardRoute()} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isActive(getDashboardRoute()) && "bg-accent"
                      )}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Dashboard
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/documents" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isActive("/documents") && "bg-accent"
                      )}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Documentos
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {user.user_type === "investor" && (
                  <>
                    <NavigationMenuItem>
                      <Link href="/deposit" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            isActive("/deposit") && "bg-accent"
                          )}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Depositar
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                      <Link href="/withdraw" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            isActive("/withdraw") && "bg-accent"
                          )}
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          Resgatar
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  </>
                )}

                {(user.user_type === "distributor" ||
                  user.user_type === "admin" ||
                  user.user_type === "advisor" ||
                  user.user_type === "assessor") && (
                  <>
                    <NavigationMenuItem>
                      <Link href="/calculator" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            isActive("/calculator") && "bg-accent"
                          )}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculadora
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>

                    {/* <NavigationMenuItem>
                      <Link href="/bonifications" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(navigationMenuTriggerStyle(), isActive("/bonifications") && "bg-accent")}
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Bonificações
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem> */}
                  </>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          )}

          {/* User Menu or Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {getUserDisplayName()}
                      </span>
                      <Badge variant="secondary" className="hidden sm:inline">
                        {getUserTypeLabel()}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={getDashboardRoute()}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/documents">
                        <FileText className="h-4 w-4 mr-2" />
                        Documentos
                      </Link>
                    </DropdownMenuItem>
                    {user.user_type === "investor" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/deposit">
                            <Plus className="h-4 w-4 mr-2" />
                            Depositar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/withdraw">
                            <Minus className="h-4 w-4 mr-2" />
                            Resgatar
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {(user.user_type === "distributor" ||
                      user.user_type === "admin" ||
                      user.user_type === "advisor" ||
                      user.user_type === "assessor") && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/calculator">
                            <Calculator className="h-4 w-4 mr-2" />
                            Calculadora
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/bonifications">
                            <Gift className="h-4 w-4 mr-2" />
                            Bonificações
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Cadastrar</Button>
                </Link>
                <Link href="/admin/login">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Admin
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-2">
              <Link
                href={getDashboardRoute()}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(getDashboardRoute())
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:text-accent-foreground hover:bg-accent/80"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Link>

              <Link
                href="/documents"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive("/documents")
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:text-accent-foreground hover:bg-accent/80"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Documentos
              </Link>

              {user.user_type === "investor" && (
                <>
                  <Link
                    href="/deposit"
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive("/deposit")
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:text-accent-foreground hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Depositar
                  </Link>

                  <Link
                    href="/withdraw"
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive("/withdraw")
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:text-accent-foreground hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Resgatar
                  </Link>
                </>
              )}

              {(user.user_type === "distributor" ||
                user.user_type === "admin" ||
                user.user_type === "advisor" ||
                user.user_type === "assessor") && (
                <>
                  <Link
                    href="/calculator"
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive("/calculator")
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:text-accent-foreground hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculadora
                  </Link>

                  <Link
                    href="/bonifications"
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive("/bonifications")
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:text-accent-foreground hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Bonificações
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
