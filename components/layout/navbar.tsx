"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  Key,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUserType } from "@/hooks/useUserType";

interface UserData {
  id: string;
  email: string;
  name?: string;
  user_type: string;
  office_id?: string | null;
  role?: string | null;
}

export function Navbar() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Usar hook para obter informações do tipo de usuário
  const { user_type_id, display_name, user_type: userTypeFromDB, isLoading: isLoadingUserType } = useUserType(user?.id);
  
  // Helper para verificar tipos usando user_type_id
  // Verifica se o user_type (campo da tabela user_types) corresponde ao tipo solicitado
  // IMPORTANTE: Usa apenas o campo user_type, não o name (slug)
  const isUserType = (type: string): boolean => {
    if (!userTypeFromDB || isLoadingUserType) return false;
    // Comparar apenas pelo campo user_type (ex: "admin")
    return userTypeFromDB.user_type === type;
  };

  // Função para carregar usuário do localStorage
  const loadUser = () => {
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
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // Carregar usuário inicialmente
    loadUser();

    // Listener para mudanças no localStorage (quando login é feito)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        loadUser();
      }
    };

    // Listener para eventos customizados (para mesma aba)
    const handleUserUpdate = () => {
      loadUser();
    };

    // Adicionar listeners
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, []);

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-user-menu]')) {
          setIsUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleNewPassword = () => {
    window.location.href = "/newPassword";
  };

  const handleLogout = () => {
    console.log("Saindo...");
    toast({
      title: "Saindo...",
      description: "Você foi desconectado com sucesso.",
    });
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
    if (!user) return "";
    // Usa o nome se disponível, senão extrai do email
    return user.name || user.email.split("@")[0];
  };

  const getUserTypeLabel = () => {
    if (!user) return "";
    
    // Usar display_name da tabela user_types
    if (display_name) {
      return display_name;
    }
    
    // Fallback para display_name do userTypeFromDB
    if (userTypeFromDB?.display_name) {
      return userTypeFromDB.display_name;
    }
    
    // Se não tiver display_name, retornar vazio (não deve acontecer se user_type_id estiver correto)
    return "";
  };

  const getDashboardRoute = () => {
    if (!user) return "/";
    
    // Usar APENAS o campo user_type da tabela user_types, não o name (slug)
    const typeToCheck = userTypeFromDB?.user_type;
    
    if (!typeToCheck) {
      return "/";
    }
    
    switch (typeToCheck) {
      case "investor":
        return "/investor";
      case "admin":
        return "/admin";
      case "distributor":
      case "advisor":
      case "office":
      default:
        return "/distributor";
    }
  };

  // Detectar se está nas páginas de redefinir senha
  const isPasswordResetPage = pathname === '/resetPassword' || pathname === '/newPassword';
  
  // Verificar se é distribuidor, assessor ou escritório
  // Verificar se é distribuidor usando user_type_id
  const isDistributorUser = user && user_type_id && (
    isUserType("distributor") || 
    isUserType("advisor") || 
    isUserType("office")
  );
  
  // Cor da navbar: #01223F para distribuidores/assessores/escritórios/investidores, #003F28 para outros
  const navbarBgColor = (isDistributorUser || isUserType("investor")) ? 'bg-[#01223F]' : 'bg-[#003F28]';
  
  return (
    <header 
      className={`sticky top-0 z-50 w-full border-b ${isPasswordResetPage ? 'border-transparent bg-transparent' : `border-white/20 ${navbarBgColor}`}`} 
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo_branco.png"
              alt="Agrinvest"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          {user && !isLoadingUserType && (
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href={getDashboardRoute()} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        "flex items-center justify-center text-[#003F28] font-medium transition-colors",
                        "w-[138px] h-[41px] rounded-[11px]",
                        isActive(getDashboardRoute()) 
                          ? "bg-[#00BC6E] text-[#003F28]" 
                          : "bg-[#D9D9D9] text-[#003F28] hover:bg-[#D9D9D9]/80"
                      )}
                    >
                      Dashboard
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>


                {isUserType("investor") && (
                  <>
                    <NavigationMenuItem>
                      <Link href="/deposit" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            "flex items-center justify-center text-[#003F28] font-medium transition-colors",
                            "w-[138px] h-[41px] rounded-[11px]",
                            "focus:outline-none focus:ring-0 active:bg-[#00BC6E] active:text-[#003F28]",
                            isActive("/deposit") 
                              ? "bg-[#00BC6E] text-[#003F28]" 
                              : "bg-[#D9D9D9] text-[#003F28] hover:bg-[#00BC6E] hover:text-[#003F28]"
                          )}
                        >
                          Depositar
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                      <Link href="/withdraw" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            "flex items-center justify-center text-[#003F28] font-medium transition-colors",
                            "w-[138px] h-[41px] rounded-[11px]",
                            "focus:outline-none focus:ring-0 active:bg-[#00BC6E] active:text-[#003F28]",
                            isActive("/withdraw") 
                              ? "bg-[#00BC6E] text-[#003F28]" 
                              : "bg-[#D9D9D9] text-[#003F28] hover:bg-[#00BC6E] hover:text-[#003F28]"
                          )}
                        >
                          Resgatar
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  </>
                )}

                {(isUserType("distributor") ||
                  isUserType("advisor") ||
                  isUserType("office")) && (
                  <>
                    <NavigationMenuItem>
                      <Link href="/calculator" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            "flex items-center justify-center text-[#003F28] font-medium transition-colors",
                            "w-[138px] h-[41px] rounded-[11px]",
                            "focus:outline-none focus:ring-0 active:bg-[#00BC6E] active:text-[#003F28]",
                            isActive("/calculator") 
                              ? "bg-[#00BC6E] text-[#003F28]" 
                              : "bg-[#D9D9D9] text-[#003F28] hover:bg-[#D9D9D9]/80"
                          )}
                        >
                          Calculadora
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>

                    {isUserType("distributor") && (
                    <NavigationMenuItem>
                      <Link href="/distributor/analises" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            "flex items-center justify-center text-[#003F28] font-medium transition-colors",
                            "w-[138px] h-[41px] rounded-[11px]",
                            "focus:outline-none focus:ring-0 active:bg-[#00BC6E] active:text-[#003F28]",
                            isActive("/distributor/analises") 
                              ? "bg-[#00BC6E] text-[#003F28]" 
                              : "bg-[#D9D9D9] text-[#003F28] hover:bg-[#D9D9D9]/80"
                          )}
                        >
                          Análises
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                    )}

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

                {isUserType("admin") && (
                  <>
                    <NavigationMenuItem>
                      <Link href="/admin/users" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            "flex items-center justify-center text-[#003F28] font-medium transition-colors",
                            "w-[138px] h-[41px] rounded-[11px]",
                            "focus:outline-none focus:ring-0 active:bg-[#00BC6E] active:text-[#003F28]",
                            isActive("/admin/users") 
                              ? "bg-[#00BC6E] text-[#003F28]" 
                              : "bg-[#D9D9D9] text-[#003F28] hover:bg-[#D9D9D9]/80"
                          )}
                        >
                          Usuários
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Link href="/admin/usuarios" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            "flex items-center justify-center text-[#003F28] font-medium transition-colors",
                            "w-[138px] h-[41px] rounded-[11px]",
                            "focus:outline-none focus:ring-0 active:bg-[#00BC6E] active:text-[#003F28]",
                            isActive("/admin/usuarios") 
                              ? "bg-[#00BC6E] text-[#003F28]" 
                              : "bg-[#D9D9D9] text-[#003F28] hover:bg-[#D9D9D9]/80"
                          )}
                        >
                          Configurações
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
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
                  className="md:hidden text-white hover:bg-white/10"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {/* User Menu Button */}
                <div data-user-menu className="relative">
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 hover:bg-white/10 text-white"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                  <div className="h-4 w-4 relative">
                    <img 
                      src="/identity_platform.svg" 
                      alt="User Icon" 
                      className="h-4 w-4"
                    />
                  </div>
                  <span className="hidden sm:inline">
                    {getUserDisplayName()}
                  </span>
                  <Badge variant="secondary" className="hidden sm:inline bg-[#00BC6E] text-[#003F28]">
                    {getUserTypeLabel()}
                  </Badge>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isUserMenuOpen ? 'rotate-90' : ''}`} />
                  </Button>

                  {/* User Menu Dropdown */}
                  {isUserMenuOpen && (
                  <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg border z-50 w-56">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-medium text-gray-900">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                    
                    <div className="py-2">
                      <Link 
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Meu Perfil
                      </Link>
                      
                      <button
                        onClick={() => {
                          handleNewPassword();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Key className="h-4 w-4 mr-3" />
                        Mudar Senha
                      </button>
                      
                      <div className="border-t my-2"></div>
                      
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sair
                      </button>
                    </div>
                  </div>
                  )}
                </div>

              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    size="sm"
                  >
                    Entrar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-1 px-4">
              <Link
                href={getDashboardRoute()}
                className={cn(
                  "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors",
                  isActive(getDashboardRoute())
                    ? "bg-accent text-white"
                    : "text-white hover:text-white hover:bg-accent/80"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BarChart3 className="h-5 w-5 mr-3 text-white" />
                Dashboard
              </Link>

              {user.user_type === "investor" && (
                <>
                  <Link
                    href="/deposit"
                    className={cn(
                      "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors",
                      isActive("/deposit")
                        ? "bg-accent text-white"
                        : "text-white hover:text-white hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Plus className="h-5 w-5 mr-3 text-white" />
                    Depositar
                  </Link>

                  <Link
                    href="/withdraw"
                    className={cn(
                      "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors",
                      isActive("/withdraw")
                        ? "bg-accent text-white"
                        : "text-white hover:text-white hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Minus className="h-5 w-5 mr-3 text-white" />
                    Resgatar
                  </Link>
                </>
              )}

              {(isUserType("distributor") ||
                isUserType("admin") ||
                isUserType("advisor") ||
                isUserType("office")) && (
                <>
                  <Link
                    href="/calculator"
                    className={cn(
                      "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors",
                      isActive("/calculator")
                        ? "bg-accent text-white"
                        : "text-white hover:text-white hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Calculator className="h-5 w-5 mr-3 text-white" />
                    Calculadora
                  </Link>

                  {user.role === "distribuidor" && (
                  <Link
                    href="/distributor/analises"
                    className={cn(
                      "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors",
                      isActive("/distributor/analises")
                        ? "bg-accent text-white"
                        : "text-white hover:text-white hover:bg-accent/80"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BarChart3 className="h-5 w-5 mr-3 text-white" />
                    Análises
                  </Link>
                  )}

                  {isUserType("admin") && (
                    <>
                      <Link
                        href="/admin/users"
                        className={cn(
                          "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors",
                          isActive("/admin/users")
                            ? "bg-accent text-white"
                            : "text-white hover:text-white hover:bg-accent/80"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5 mr-3 text-white" />
                        Usuários
                      </Link>
                      <Link
                        href="/admin/usuarios"
                        className={cn(
                          "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors",
                          isActive("/admin/usuarios")
                            ? "bg-accent text-white"
                            : "text-white hover:text-white hover:bg-accent/80"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5 mr-3 text-white" />
                        Configurações
                      </Link>
                    </>
                  )}
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
