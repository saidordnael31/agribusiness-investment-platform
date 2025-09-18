"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  TrendingUp,
  User,
  LogOut,
  Calculator,
  BarChart3,
  Menu,
  Gift,
  Settings,
  FileText,
  ChevronDown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface UserData {
  id: string
  email: string
  user_type: string
  office_id?: string | null
  role?: string | null
}

export function Navbar() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        if (userData && userData.email && userData.user_type) {
          setUser(userData)
        }
      } catch (error) {
        console.error("Erro ao parsear dados do usuário:", error)
        localStorage.removeItem("user")
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    setUser(null)
    setIsUserMenuOpen(false)

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    })

    window.location.href = "/"
  }

  const isActive = (path: string) => pathname === path

  const getUserDisplayName = () => {
    if (!user) return ""
    const displayName = user.email.split("@")[0]
    return displayName
  }

  const getUserTypeLabel = () => {
    if (!user) return ""
    switch (user.user_type) {
      case "investor":
        return "Investidor"
      case "admin":
        return "Admin"
      case "distributor":
      case "advisor":
      case "assessor":
        return "Distribuidor"
      default:
        return user.user_type
    }
  }

  const getDashboardRoute = () => {
    if (!user) return "/"
    switch (user.user_type) {
      case "investor":
        return "/investor"
      case "admin":
        return "/admin"
      case "distributor":
      case "advisor":
      case "assessor":
      default:
        return "/distributor"
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-card-foreground">Akintec Platform</span>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href={getDashboardRoute()} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(navigationMenuTriggerStyle(), isActive(getDashboardRoute()) && "bg-accent")}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Dashboard
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/documents" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(navigationMenuTriggerStyle(), isActive("/documents") && "bg-accent")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Documentos
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {(user.user_type === "distributor" ||
                  user.user_type === "admin" ||
                  user.user_type === "advisor" ||
                  user.user_type === "assessor") && (
                  <>
                    <NavigationMenuItem>
                      <Link href="/calculator" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(navigationMenuTriggerStyle(), isActive("/calculator") && "bg-accent")}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculadora
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                      <Link href="/bonifications" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(navigationMenuTriggerStyle(), isActive("/bonifications") && "bg-accent")}
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Bonificações
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
                  className="md:hidden"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <div className="relative" ref={dropdownRef}>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                    onClick={() => {
                      console.log("[v0] User button clicked, toggling menu")
                      setIsUserMenuOpen(!isUserMenuOpen)
                    }}
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{getUserDisplayName()}</span>
                    <Badge variant="secondary" className="hidden sm:inline">
                      {getUserTypeLabel()}
                    </Badge>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isUserMenuOpen && "rotate-180")} />
                  </Button>

                  {/* Menu customizado */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-sm font-medium">{getUserDisplayName()}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          href={getDashboardRoute()}
                          className="flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Dashboard
                        </Link>

                        <Link
                          href="/documents"
                          className="flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Documentos
                        </Link>

                        {(user.user_type === "distributor" ||
                          user.user_type === "admin" ||
                          user.user_type === "advisor" ||
                          user.user_type === "assessor") && (
                          <>
                            <Link
                              href="/calculator"
                              className="flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculadora
                            </Link>

                            <Link
                              href="/bonifications"
                              className="flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Gift className="h-4 w-4 mr-2" />
                              Bonificações
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="border-t border-border py-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
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
                    : "text-foreground hover:text-accent-foreground hover:bg-accent/80",
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
                    : "text-foreground hover:text-accent-foreground hover:bg-accent/80",
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Documentos
              </Link>

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
                        : "text-foreground hover:text-accent-foreground hover:bg-accent/80",
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
                        : "text-foreground hover:text-accent-foreground hover:bg-accent/80",
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
  )
}
