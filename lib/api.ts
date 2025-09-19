const API_BASE_URL = "/api"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const user = localStorage.getItem("user")
      const token = user ? JSON.parse(user).token : null

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || "Erro na requisição" }
      }

      return { success: true, data: data.data }
    } catch (error) {
      console.error("API Error:", error)
      return { success: false, error: "Erro de conexão com o servidor" }
    }
  }

  async getUsersProfiles() {
    return this.request<any[]>("/users")
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async register(userData: any) {
    return this.request<{ user: any; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  // Investments
  async getInvestments() {
    return this.request<any[]>("/investments")
  }

  async createInvestment(investmentData: any) {
    return this.request<any>("/investments", {
      method: "POST",
      body: JSON.stringify(investmentData),
    })
  }

  async createDeposit(depositData: any) {
    return this.request<any>("/deposits", {
      method: "POST",
      body: JSON.stringify(depositData),
    })
  }

  async createWithdrawal(withdrawalData: any) {
    return this.request<any>("/withdrawals", {
      method: "POST",
      body: JSON.stringify(withdrawalData),
    })
  }

  // Admin functions
  async getUsers() {
    return this.request<any[]>("/admin/users")
  }

  async updateRates(ratesData: any) {
    return this.request<any>("/admin/rates", {
      method: "PUT",
      body: JSON.stringify(ratesData),
    })
  }

  async createPromotion(promotionData: any) {
    return this.request<any>("/admin/promotions", {
      method: "POST",
      body: JSON.stringify(promotionData),
    })
  }

  // Documents
  async uploadDocument(formData: FormData) {
    return this.request<any>("/documents/upload", {
      method: "POST",
      body: formData,
      headers: {}, // Remove Content-Type para FormData
    })
  }

  async getDocuments() {
    return this.request<any[]>("/documents")
  }
}

export const apiClient = new ApiClient()
