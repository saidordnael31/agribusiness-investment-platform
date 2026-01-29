"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, Pencil, Trash2, Building2, Users, User, Crown, ArrowDown, Network, ChevronDown, ChevronUp, Search } from "lucide-react"

type PeriodForm = {
  id: number
  months: string
  monthly: string
  semiannual: string
  annual: string
  biennial: string
  triennial: string
}

const DEFAULT_PERIOD_MONTHS = [3, 6, 12, 24, 36]

const buildDefaultPeriods = (): PeriodForm[] =>
  DEFAULT_PERIOD_MONTHS.map((m, index) => ({
    id: index + 1,
    months: String(m),
    monthly: "",
    semiannual: "",
    annual: "",
    biennial: "",
    triennial: "",
  }))

type RateType = "monthly" | "semiannual" | "annual" | "biennial" | "triennial"

const isRateEnabledForMonths = (months: number, rateType: RateType): boolean => {
  switch (months) {
    case 3:
      // Só faz sentido taxa mensal
      return rateType === "monthly"
    case 6:
      // Mensal ou semestral
      return rateType === "monthly" || rateType === "semiannual"
    case 12:
      // Até anual
      return rateType === "monthly" || rateType === "semiannual" || rateType === "annual"
    case 24:
      // 24 meses: permite mensal, semestral, anual e bienal
      return (
        rateType === "monthly" ||
        rateType === "semiannual" ||
        rateType === "annual" ||
        rateType === "biennial"
      )
    case 36:
      // 36 meses: permite todas as taxas
      return (
        rateType === "monthly" ||
        rateType === "semiannual" ||
        rateType === "annual" ||
        rateType === "biennial" ||
        rateType === "triennial"
      )
    default:
      // Fallback: tudo habilitado
      return true
  }
}

export default function UsuariosPage() {
  const [isRentDialogOpen, setIsRentDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [isFixed, setIsFixed] = useState(false)
  const [fixedRate, setFixedRate] = useState("")
  const [payoutStartDays, setPayoutStartDays] = useState<string>("0")
  const [periods, setPeriods] = useState<PeriodForm[]>(buildDefaultPeriods())
  const [isSaving, setIsSaving] = useState(false)
  
  // Edição de rentabilidade
  const [editingRentabilityId, setEditingRentabilityId] = useState<number | null>(null)
  const [isEditingRentability, setIsEditingRentability] = useState(false)
  
  // Exclusão de rentabilidade
  const [deletingRentabilityId, setDeletingRentabilityId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { toast } = useToast()

  // Lista de rentabilidades
  const [rentabilities, setRentabilities] = useState<{ id: number; title: string; is_fixed: boolean }[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)

  // Lista de tipos de usuário
  type UserTypeRow = {
    id: number
    name: string
    display_name: string
    rentability_id: number | null
    user_type: string | null
  }
  const [userTypes, setUserTypes] = useState<UserTypeRow[]>([])
  const [isLoadingUserTypes, setIsLoadingUserTypes] = useState(false)

  // Cadastro de tipo de usuário
  const [isUserTypeDialogOpen, setIsUserTypeDialogOpen] = useState(false)
  const [editingUserTypeId, setEditingUserTypeId] = useState<number | null>(null)
  const [userTypeName, setUserTypeName] = useState("")
  const [userTypeDisplayName, setUserTypeDisplayName] = useState("")
  const [userTypeRentabilityId, setUserTypeRentabilityId] = useState<number | null>(null)
  const [userTypeVariation, setUserTypeVariation] = useState<string>("")
  const [isDisplayNameCustomized, setIsDisplayNameCustomized] = useState(false)
  const [userTypeConditionIds, setUserTypeConditionIds] = useState<number[]>([])
  const [isSavingUserType, setIsSavingUserType] = useState(false)

  // Mapeamento de variações para nomes em português
  const variationDisplayNames: Record<string, string> = {
    office: "Escritório",
    admin: "Gestor",
    investor: "Investidor",
    advisor: "Assessor",
    distributor: "Distribuidor",
  }

  // Lista de condições
  type ConditionRow = {
    id: number
    code: string
    description: string
    rentability_id: number | null
  }
  const [conditions, setConditions] = useState<ConditionRow[]>([])
  const [isLoadingConditions, setIsLoadingConditions] = useState(false)

  // Cadastro de condição
  const [isConditionDialogOpen, setIsConditionDialogOpen] = useState(false)
  const [editingConditionId, setEditingConditionId] = useState<number | null>(null)
  const [conditionCode, setConditionCode] = useState("")
  const [conditionDescription, setConditionDescription] = useState("")
  const [conditionRentabilityId, setConditionRentabilityId] = useState<number | null>(null)
  const [isSavingCondition, setIsSavingCondition] = useState(false)

  // Detalhes de rentabilidade
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedRentabilityId, setSelectedRentabilityId] = useState<number | null>(null)
  const [rentabilityDetail, setRentabilityDetail] = useState<any | null>(null)

  // Detalhes de tipo de usuário
  const [userTypeDetailOpen, setUserTypeDetailOpen] = useState(false)
  const [userTypeDetailLoading, setUserTypeDetailLoading] = useState(false)
  const [selectedUserTypeId, setSelectedUserTypeId] = useState<number | null>(null)
  const [userTypeDetail, setUserTypeDetail] = useState<{
    id: number
    name: string
    display_name: string
    rentability: { id: number; title: string; is_fixed: boolean } | null
    conditions: Array<{ id: number; code: string; description: string; rentability: { id: number; title: string } | null }>
  } | null>(null)
  const [userTypeProfiles, setUserTypeProfiles] = useState<Array<{
    id: string
    full_name: string | null
    email: string
    created_at: string
  }>>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)
  
  // Modal de associar usuários
  const [isAssociateUsersDialogOpen, setIsAssociateUsersDialogOpen] = useState(false)
  const [allProfiles, setAllProfiles] = useState<Array<{
    id: string
    full_name: string | null
    email: string
    user_type_id: number | null
    user_type: string | null
    role: string | null
    parent_id: string | null
    office_id: string | null
    advisor_name?: string | null
    office_name?: string | null
    distributor_name?: string | null
  }>>([])
  const [isLoadingAllProfiles, setIsLoadingAllProfiles] = useState(false)
  const [userTypeAssignments, setUserTypeAssignments] = useState<Record<string, number | null>>({})
  const [isSavingAssignments, setIsSavingAssignments] = useState(false)
  
  // Filtros do modal de associar usuários
  const [searchAssociateUsers, setSearchAssociateUsers] = useState("")
  const [filterAssociateUserTypeId, setFilterAssociateUserTypeId] = useState<string>("all")
  const [filterAssociateDistributor, setFilterAssociateDistributor] = useState<string>("all")
  const [filterAssociateAdvisor, setFilterAssociateAdvisor] = useState<string>("all")
  const [filterAssociateOffice, setFilterAssociateOffice] = useState<string>("all")
  const [filterWithoutAssociation, setFilterWithoutAssociation] = useState(false)

  // Relações entre tipos de usuário
  type UserTypeRelation = {
    id: number
    parent_user_type_id: number
    child_user_type_id: number
    parent_user_type: { id: number; name: string; display_name: string; user_type: string | null } | null
    child_user_type: { id: number; name: string; display_name: string; user_type: string | null } | null
  }
  const [relations, setRelations] = useState<UserTypeRelation[]>([])
  const [isLoadingRelations, setIsLoadingRelations] = useState(false)
  const [isRelationDialogOpen, setIsRelationDialogOpen] = useState(false)
  const [relationPairs, setRelationPairs] = useState<Array<{ parent_user_type_id: number | null; child_user_type_id: number | null }>>([
    { parent_user_type_id: null, child_user_type_id: null }
  ])
  const [isSavingRelations, setIsSavingRelations] = useState(false)
  
  // Edição de relações
  const [isEditRelationDialogOpen, setIsEditRelationDialogOpen] = useState(false)
  const [editingParentId, setEditingParentId] = useState<number | null>(null)
  const [selectedChildIds, setSelectedChildIds] = useState<number[]>([])
  const [isUpdatingRelations, setIsUpdatingRelations] = useState(false)
  const [expandedRelationIds, setExpandedRelationIds] = useState<Set<number>>(new Set())
  
  // Filtros para os dropdowns de relações
  const [parentFilter, setParentFilter] = useState<"all" | "with_relation" | "without_relation">("all")
  const [childFilters, setChildFilters] = useState<Record<number, "all" | "with_relation" | "without_relation">>({})
  
  // Pesquisa nas tabelas
  const [searchRentabilities, setSearchRentabilities] = useState("")
  const [searchUserTypes, setSearchUserTypes] = useState("")
  const [filterUserTypeByType, setFilterUserTypeByType] = useState<string>("all")

  const supabase = createClient()

  const loadRentabilities = async () => {
    try {
      setIsLoadingList(true)
      const { data, error } = await supabase
        .from("rentabilities")
        .select("id, title, is_fixed")
        .order("id", { ascending: true })

      if (error) {
        console.error("[rentabilities] Erro ao listar:", error)
        toast({
          title: "Erro ao carregar rentabilidades",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }

      setRentabilities(data || [])
    } catch (err) {
      console.error("[rentabilities] Erro inesperado ao listar:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar as rentabilidades.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingList(false)
    }
  }

  const loadUserTypes = async () => {
    try {
      setIsLoadingUserTypes(true)
      const { data, error } = await supabase
        .from("user_types")
        .select("id, name, display_name, rentability_id, user_type")
        .order("id", { ascending: true })

      if (error) {
        console.error("[user_types] Erro ao listar:", error)
        toast({
          title: "Erro ao carregar tipos de usuário",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }

      setUserTypes(data || [])
    } catch (err) {
      console.error("[user_types] Erro inesperado ao listar:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar os tipos de usuário.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingUserTypes(false)
    }
  }

  const loadConditions = async () => {
    try {
      setIsLoadingConditions(true)
      const { data, error } = await supabase
        .from("conditions")
        .select("id, code, description, rentability_id")
        .order("id", { ascending: true })

      if (error) {
        console.error("[conditions] Erro ao listar:", error)
        toast({
          title: "Erro ao carregar condições",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }

      setConditions(data || [])
    } catch (err) {
      console.error("[conditions] Erro inesperado ao listar:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar as condições.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingConditions(false)
    }
  }

  const loadRelations = async () => {
    try {
      setIsLoadingRelations(true)
      
      // Buscar todas as relações usando a função RPC
      // Como não temos uma função para buscar todas, vamos buscar por cada user_type
      const allRelations: UserTypeRelation[] = []
      const processedPairs = new Set<string>()
      
      for (const userType of userTypes) {
        // Buscar filhos deste tipo
        const { data: childrenData, error: childrenError } = await supabase.rpc('get_user_type_relations', {
          p_parent_user_type_id: userType.id
        })
        
        if (!childrenError && childrenData) {
          for (const relation of childrenData) {
            const pairKey = `${relation.parent_user_type_id}-${relation.child_user_type_id}`
            if (!processedPairs.has(pairKey)) {
              processedPairs.add(pairKey)
              
              // Buscar informações dos tipos
              const parentType = userTypes.find(ut => ut.id === relation.parent_user_type_id)
              const childType = userTypes.find(ut => ut.id === relation.child_user_type_id)
              
              allRelations.push({
                id: relation.id || allRelations.length + 1,
                parent_user_type_id: relation.parent_user_type_id,
                child_user_type_id: relation.child_user_type_id,
                parent_user_type: parentType ? { id: parentType.id, name: parentType.name, display_name: parentType.display_name, user_type: parentType.user_type } : null,
                child_user_type: childType ? { id: childType.id, name: childType.name, display_name: childType.display_name, user_type: childType.user_type } : null,
              })
            }
          }
        }
      }
      
      setRelations(allRelations)
    } catch (err) {
      console.error("[relations] Erro inesperado ao carregar:", err)
      toast({
        title: "Erro ao carregar relações",
        description: "Não foi possível carregar as relações entre tipos de usuário.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingRelations(false)
    }
  }

  const handleSaveRelations = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar que todos os pares têm parent e child
    const validPairs = relationPairs.filter(
      pair => pair.parent_user_type_id !== null && pair.child_user_type_id !== null
    )
    
    if (validPairs.length === 0) {
      toast({
        title: "Erro ao salvar",
        description: "Adicione pelo menos uma relação válida.",
        variant: "destructive",
      })
      return
    }
    
    // Validar que não há duplicatas
    const pairKeys = new Set<string>()
    for (const pair of validPairs) {
      const key = `${pair.parent_user_type_id}-${pair.child_user_type_id}`
      if (pairKeys.has(key)) {
        toast({
          title: "Erro ao salvar",
          description: "Não é possível adicionar relações duplicadas.",
          variant: "destructive",
        })
        return
      }
      pairKeys.add(key)
    }
    
    // Validar regras de hierarquia
    for (const pair of validPairs) {
      const parentType = userTypes.find(ut => ut.id === pair.parent_user_type_id)
      const childType = userTypes.find(ut => ut.id === pair.child_user_type_id)
      
      if (!parentType || !childType || !parentType.user_type || !childType.user_type) {
        toast({
          title: "Erro ao salvar",
          description: "Tipo de usuário inválido encontrado.",
          variant: "destructive",
        })
        return
      }
      
      // Verificar se a relação segue as regras
      const validChildren = getValidChildTypes(pair.parent_user_type_id)
      const isValid = validChildren.some(ut => ut.id === pair.child_user_type_id)
      
      if (!isValid) {
        const parentName = parentType.display_name || parentType.name
        const childName = childType.display_name || childType.name
        toast({
          title: "Erro ao salvar",
          description: `${parentName} não pode criar ${childName}. Verifique as regras de hierarquia.`,
          variant: "destructive",
        })
        return
      }
    }
    
    try {
      setIsSavingRelations(true)
      
      // Preparar JSONB para a função RPC
      const relationsJson = validPairs.map(pair => ({
        parent_user_type_id: pair.parent_user_type_id!,
        child_user_type_id: pair.child_user_type_id!,
      }))
      
      // Chamar função RPC para criar relações
      const { error } = await supabase.rpc('create_user_type_relations_bulk', {
        p_relations: relationsJson
      })
      
      if (error) {
        console.error("[relations] Erro ao criar relações:", error)
        toast({
          title: "Erro ao salvar relações",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Relações criadas com sucesso!",
        description: `${validPairs.length} relação(ões) criada(s).`,
      })
      
      // Limpar formulário
      setRelationPairs([{ parent_user_type_id: null, child_user_type_id: null }])
      setIsRelationDialogOpen(false)
      
      // Recarregar relações
      await loadRelations()
    } catch (err) {
      console.error("[relations] Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível salvar as relações.",
        variant: "destructive",
      })
    } finally {
      setIsSavingRelations(false)
    }
  }

  const addRelationPair = () => {
    const newIndex = relationPairs.length
    setRelationPairs([...relationPairs, { parent_user_type_id: null, child_user_type_id: null }])
    setChildFilters({ ...childFilters, [newIndex]: "all" })
  }

  const removeRelationPair = (index: number) => {
    if (relationPairs.length > 1) {
      setRelationPairs(relationPairs.filter((_, i) => i !== index))
    }
  }

  const openEditRelation = (parentId: number) => {
    // Buscar todos os filhos deste pai
    const children = relations
      .filter(r => r.parent_user_type_id === parentId)
      .map(r => r.child_user_type_id)
    
    setEditingParentId(parentId)
    setSelectedChildIds(children)
    setIsEditRelationDialogOpen(true)
  }

  const handleUpdateRelations = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingParentId) {
      toast({
        title: "Erro",
        description: "Tipo pai não selecionado.",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsUpdatingRelations(true)
      
      // Chamar função RPC para atualizar relações
      const { error } = await supabase.rpc('update_user_type_relations', {
        p_parent_user_type_id: editingParentId,
        p_new_child_ids: selectedChildIds.length > 0 ? selectedChildIds : []
      })
      
      if (error) {
        console.error("[relations] Erro ao atualizar relações:", error)
        toast({
          title: "Erro ao atualizar relações",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Relações atualizadas com sucesso!",
        description: `${selectedChildIds.length} relação(ões) atualizada(s).`,
      })
      
      // Limpar formulário
      setEditingParentId(null)
      setSelectedChildIds([])
      setIsEditRelationDialogOpen(false)
      
      // Recarregar relações
      await loadRelations()
    } catch (err) {
      console.error("[relations] Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível atualizar as relações.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingRelations(false)
    }
  }

  const toggleChildSelection = (childId: number) => {
    if (selectedChildIds.includes(childId)) {
      setSelectedChildIds(selectedChildIds.filter(id => id !== childId))
    } else {
      setSelectedChildIds([...selectedChildIds, childId])
    }
  }

  const updateRelationPair = (index: number, field: 'parent_user_type_id' | 'child_user_type_id', value: number | null) => {
    const updated = [...relationPairs]
    updated[index] = { ...updated[index], [field]: value }
    
    // Se mudou o parent, resetar o child para forçar nova seleção
    if (field === 'parent_user_type_id') {
      updated[index].child_user_type_id = null
    }
    
    setRelationPairs(updated)
  }

  // Função para obter tipos válidos de filhos baseado no tipo pai
  const getValidChildTypes = (parentUserTypeId: number | null, filter: "all" | "with_relation" | "without_relation" = "all"): UserTypeRow[] => {
    if (!parentUserTypeId) {
      return []
    }
    
    const parentType = userTypes.find(ut => ut.id === parentUserTypeId)
    if (!parentType || !parentType.user_type) {
      return []
    }
    
    // Regras de hierarquia:
    // distribuidores (user_type = "distributor") só podem ter filhos escritorios (user_type = "office")
    // escritorios (user_type = "office") só podem ter filhos assessores (user_type = "advisor")
    // assessores (user_type = "advisor") só podem ter filhos investidores (user_type = "investor")
    
    let validTypes: UserTypeRow[] = []
    switch (parentType.user_type) {
      case "distributor":
        validTypes = userTypes.filter(ut => ut.user_type === "office")
        break
      case "office":
        validTypes = userTypes.filter(ut => ut.user_type === "advisor")
        break
      case "advisor":
        validTypes = userTypes.filter(ut => ut.user_type === "investor")
        break
      default:
        return []
    }
    
    // Aplicar filtro baseado em relações
    if (filter === "all") {
      return validTypes
    }
    
    const typesWithRelations = new Set<number>()
    relations.forEach(relation => {
      if (relation.parent_user_type_id === parentUserTypeId && relation.child_user_type) {
        typesWithRelations.add(relation.child_user_type.id)
      }
    })
    
    if (filter === "with_relation") {
      return validTypes.filter(ut => typesWithRelations.has(ut.id))
    } else { // without_relation
      return validTypes.filter(ut => !typesWithRelations.has(ut.id))
    }
  }

  // Função para obter tipos válidos para Tipo Pai (exclui investidor e aplica filtro)
  const getValidParentTypes = (filter: "all" | "with_relation" | "without_relation" = "all"): UserTypeRow[] => {
    // Excluir investidor do Tipo Pai
    let validTypes = userTypes.filter(ut => ut.user_type !== "investor")
    
    if (filter === "all") {
      return validTypes
    }
    
    const typesWithRelations = new Set<number>()
    relations.forEach(relation => {
      if (relation.parent_user_type) {
        typesWithRelations.add(relation.parent_user_type.id)
      }
    })
    
    if (filter === "with_relation") {
      return validTypes.filter(ut => typesWithRelations.has(ut.id))
    } else { // without_relation
      return validTypes.filter(ut => !typesWithRelations.has(ut.id))
    }
  }

  const loadAllProfiles = async () => {
    try {
      setIsLoadingAllProfiles(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_type_id, user_type, role, parent_id, office_id, distributor_id")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[profiles] Erro ao buscar profiles:", error)
        toast({
          title: "Erro ao carregar usuários",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }

      // Buscar nomes dos assessores, escritórios e distribuidores
      const advisorIds = Array.from(new Set(data?.filter(p => p.parent_id).map(p => p.parent_id) || []))
      const officeIds = Array.from(new Set(data?.filter(p => p.office_id).map(p => p.office_id) || []))
      const distributorIds = Array.from(new Set(data?.filter(p => p.distributor_id).map(p => p.distributor_id) || []))
      
      const advisorMap = new Map<string, string>()
      const officeMap = new Map<string, string>()
      const distributorMap = new Map<string, string>()
      
      if (advisorIds.length > 0) {
        const { data: advisors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", advisorIds)
        
        advisors?.forEach(advisor => {
          advisorMap.set(advisor.id, advisor.full_name || "Sem nome")
        })
      }
      
      if (officeIds.length > 0) {
        const { data: offices } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", officeIds)
        
        offices?.forEach(office => {
          officeMap.set(office.id, office.full_name || "Sem nome")
        })
      }
      
      if (distributorIds.length > 0) {
        const { data: distributors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", distributorIds)
        
        distributors?.forEach(distributor => {
          distributorMap.set(distributor.id, distributor.full_name || "Sem nome")
        })
      }

      // Adicionar nomes aos profiles e remover duplicatas por ID
      const profilesMap = new Map<string, typeof data[0] & { advisor_name?: string | null, office_name?: string | null, distributor_name?: string | null }>()
      
      data?.forEach(profile => {
        if (!profilesMap.has(profile.id)) {
          profilesMap.set(profile.id, {
            ...profile,
            advisor_name: profile.parent_id ? advisorMap.get(profile.parent_id) : null,
            office_name: profile.office_id ? officeMap.get(profile.office_id) : null,
            distributor_name: profile.distributor_id ? distributorMap.get(profile.distributor_id) : null,
          })
        }
      })

      const profilesWithNames = Array.from(profilesMap.values())
      setAllProfiles(profilesWithNames)
      // Inicializar assignments com os valores atuais
      const assignments: Record<string, number | null> = {}
      profilesWithNames.forEach((profile) => {
        assignments[profile.id] = profile.user_type_id
      })
      setUserTypeAssignments(assignments)
    } catch (err) {
      console.error("[profiles] Erro inesperado ao buscar:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAllProfiles(false)
    }
  }

  const handleSaveUserTypeAssignments = async () => {
    try {
      setIsSavingAssignments(true)
      
      // Buscar apenas os profiles que tiveram mudanças
      const updates = allProfiles
        .filter((profile) => userTypeAssignments[profile.id] !== profile.user_type_id)
        .map((profile) => ({
          id: profile.id,
          user_type_id: userTypeAssignments[profile.id],
        }))

      if (updates.length === 0) {
        toast({
          title: "Nenhuma alteração",
          description: "Não há alterações para salvar.",
        })
        setIsAssociateUsersDialogOpen(false)
        return
      }

      // Atualizar cada profile
      for (const update of updates) {
        const { error } = await supabase
          .from("profiles")
          .update({ user_type_id: update.user_type_id })
          .eq("id", update.id)

        if (error) {
          console.error("[profiles] Erro ao atualizar profile:", error)
          throw error
        }
      }

      toast({
        title: "Associações salvas com sucesso!",
        description: `${updates.length} usuário${updates.length === 1 ? "" : "s"} atualizado${updates.length === 1 ? "" : "s"}.`,
      })
      
      setIsAssociateUsersDialogOpen(false)
      // Recarregar a lista de tipos de usuário para atualizar contadores
      await loadUserTypes()
    } catch (err: any) {
      console.error("[profiles] Erro ao salvar associações:", err)
      toast({
        title: "Erro ao salvar associações",
        description: err.message || "Não foi possível salvar as associações.",
        variant: "destructive",
      })
    } finally {
      setIsSavingAssignments(false)
    }
  }

  useEffect(() => {
    loadRentabilities()
    loadUserTypes()
    loadConditions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carregar relações após userTypes serem carregados
  useEffect(() => {
    if (userTypes.length > 0) {
      loadRelations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTypes])

  // Atualizar nome exibido automaticamente quando a variação mudar (se não estiver personalizado)
  useEffect(() => {
    if (!isDisplayNameCustomized && userTypeVariation && variationDisplayNames[userTypeVariation]) {
      setUserTypeDisplayName(variationDisplayNames[userTypeVariation])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTypeVariation])

  const resetForm = () => {
    setTitle("")
    setIsFixed(false)
    setFixedRate("")
    setPayoutStartDays("0")
    setPeriods(buildDefaultPeriods())
  }

  const parseNumber = (value: string) => {
    if (!value) return null
    const normalized = value.replace(",", ".")
    const num = Number(normalized)
    return Number.isFinite(num) ? num : null
  }

  const handlePeriodChange = (id: number, field: keyof PeriodForm, value: string) => {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const handleSaveRentability = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Informe um título para a configuração de rentabilidade.",
        variant: "destructive",
      })
      return
    }

    const fixedRateValue = isFixed ? parseNumber(fixedRate) : null
    if (isFixed && fixedRateValue == null) {
      toast({
        title: "Taxa fixa obrigatória",
        description: "Informe a taxa fixa quando o plano for de rentabilidade fixa.",
        variant: "destructive",
      })
      return
    }

    let periodsPayload: any[] | null = null

    if (!isFixed) {
      periodsPayload = periods
        .map((p) => {
          const months = Number(p.months)
          const rates: Record<string, number> = {}

          const monthly = parseNumber(p.monthly)
          const semiannual = parseNumber(p.semiannual)
          const annual = parseNumber(p.annual)
          const biennial = parseNumber(p.biennial)
          const triennial = parseNumber(p.triennial)

          if (monthly != null) rates.monthly = monthly
          if (semiannual != null) rates.semiannual = semiannual
          if (annual != null) rates.annual = annual
          if (biennial != null) rates.biennial = biennial
          if (triennial != null) rates.triennial = triennial

          if (!months || Object.keys(rates).length === 0) return null

          return {
            months,
            rates,
          }
        })
        .filter(Boolean) as any[]

      // Garantir que todos os períodos padrão tenham ao menos uma taxa
      const monthsWithRates = new Set(periodsPayload.map((p) => p.months as number))
      const missingRequired = DEFAULT_PERIOD_MONTHS.filter((m) => !monthsWithRates.has(m))

      if (missingRequired.length > 0) {
        toast({
          title: "Períodos obrigatórios",
          description: `Preencha ao menos uma taxa para todos os períodos: ${DEFAULT_PERIOD_MONTHS.join(
            ", ",
          )} meses.`,
          variant: "destructive",
        })
        return
      }
    }

    const payoutStartDaysValue = parseInt(payoutStartDays) || 0
    if (payoutStartDaysValue < 0) {
      toast({
        title: "Valor inválido",
        description: "O número de dias deve ser maior ou igual a zero.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      p_title: title.trim(),
      p_is_fixed: isFixed,
      p_fixed_rate: fixedRateValue,
      p_payout_start_days: payoutStartDaysValue,
      // Supabase envia JSONB corretamente quando passamos objetos/arrays JS,
      // não precisamos serializar manualmente.
      p_periods: isFixed ? null : periodsPayload,
    }

    try {
      setIsSaving(true)
      const supabase = createClient()
      const { error } = await supabase.rpc("create_rentability", payload)

      if (error) {
        console.error("[rentabilities] Erro ao salvar:", error)
        toast({
          title: "Erro ao salvar rentabilidade",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Rentabilidade criada",
        description: "A nova configuração de rentabilidade foi salva com sucesso.",
      })

      resetForm()
      setIsRentDialogOpen(false)
      // Recarregar lista após criar
      loadRentabilities()
    } catch (err) {
      console.error("[rentabilities] Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível salvar a rentabilidade. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const openRentabilityDetail = async (id: number) => {
    try {
      setSelectedRentabilityId(id)
      setDetailLoading(true)
      setDetailOpen(true)

      const { data, error } = await supabase.rpc("get_rentability_config", {
        p_rentability_id: id,
      })

      if (error) {
        console.error("[rentabilities] Erro ao buscar detalhes:", error)
        toast({
          title: "Erro ao carregar detalhes",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        setRentabilityDetail(null)
        return
      }

      setRentabilityDetail(data)
    } catch (err) {
      console.error("[rentabilities] Erro inesperado ao buscar detalhes:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar os detalhes da rentabilidade.",
        variant: "destructive",
      })
      setRentabilityDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const openEditRentability = async (id: number) => {
    try {
      setEditingRentabilityId(id)
      setIsEditingRentability(true)

      const { data, error } = await supabase.rpc("get_rentability_config", {
        p_rentability_id: id,
      })

      if (error) {
        console.error("[rentabilities] Erro ao carregar para edição:", error)
        toast({
          title: "Erro ao carregar rentabilidade",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        setIsEditingRentability(false)
        setEditingRentabilityId(null)
        return
      }

      if (data) {
        setTitle(data.title || "")
        setIsFixed(data.is_fixed || false)
        setFixedRate(data.fixed_rate ? String(data.fixed_rate) : "")
        setPayoutStartDays(data.payout_start_days != null ? String(data.payout_start_days) : "0")
        
        // Se não for fixa, carregar períodos existentes
        if (!data.is_fixed && Array.isArray(data.periods) && data.periods.length > 0) {
          // Mapear períodos existentes para o formato do formulário
          const existingPeriodsMap = new Map<number, any>()
          data.periods.forEach((p: any) => {
            existingPeriodsMap.set(p.months, p.rates || {})
          })

          // Preencher períodos padrão com dados existentes
          const filledPeriods = buildDefaultPeriods().map((period) => {
            const months = Number(period.months)
            const existingRates = existingPeriodsMap.get(months) || {}
            
            return {
              ...period,
              monthly: existingRates.monthly != null ? String(existingRates.monthly) : "",
              semiannual: existingRates.semiannual != null ? String(existingRates.semiannual) : "",
              annual: existingRates.annual != null ? String(existingRates.annual) : "",
              biennial: existingRates.biennial != null ? String(existingRates.biennial) : "",
              triennial: existingRates.triennial != null ? String(existingRates.triennial) : "",
            }
          })
          setPeriods(filledPeriods)
        } else {
          setPeriods(buildDefaultPeriods())
        }
      }
    } catch (err) {
      console.error("[rentabilities] Erro inesperado ao carregar para edição:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar a rentabilidade para edição.",
        variant: "destructive",
      })
      setIsEditingRentability(false)
      setEditingRentabilityId(null)
    }
  }

  const handleUpdateRentability = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRentabilityId) return

    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Informe um título para a configuração de rentabilidade.",
        variant: "destructive",
      })
      return
    }

    const fixedRateValue = isFixed ? parseNumber(fixedRate) : null
    if (isFixed && fixedRateValue == null) {
      toast({
        title: "Taxa fixa obrigatória",
        description: "Informe a taxa fixa quando o plano for de rentabilidade fixa.",
        variant: "destructive",
      })
      return
    }

    let periodsPayload: any[] | null = null

    if (!isFixed) {
      periodsPayload = periods
        .map((p) => {
          const months = Number(p.months)
          const rates: Record<string, number> = {}

          const monthly = parseNumber(p.monthly)
          const semiannual = parseNumber(p.semiannual)
          const annual = parseNumber(p.annual)
          const biennial = parseNumber(p.biennial)
          const triennial = parseNumber(p.triennial)

          if (monthly != null) rates.monthly = monthly
          if (semiannual != null) rates.semiannual = semiannual
          if (annual != null) rates.annual = annual
          if (biennial != null) rates.biennial = biennial
          if (triennial != null) rates.triennial = triennial

          if (!months || Object.keys(rates).length === 0) return null

          return {
            months,
            rates,
          }
        })
        .filter(Boolean) as any[]

      // Garantir que todos os períodos padrão tenham ao menos uma taxa
      const monthsWithRates = new Set(periodsPayload.map((p) => p.months as number))
      const missingRequired = DEFAULT_PERIOD_MONTHS.filter((m) => !monthsWithRates.has(m))

      if (missingRequired.length > 0) {
        toast({
          title: "Períodos obrigatórios",
          description: `Preencha ao menos uma taxa para todos os períodos: ${DEFAULT_PERIOD_MONTHS.join(
            ", ",
          )} meses.`,
          variant: "destructive",
        })
        return
      }
    }

    const payoutStartDaysValue = parseInt(payoutStartDays) || 0
    if (payoutStartDaysValue < 0) {
      toast({
        title: "Valor inválido",
        description: "O número de dias deve ser maior ou igual a zero.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      p_rentability_id: editingRentabilityId,
      p_title: title.trim(),
      p_is_fixed: isFixed,
      p_fixed_rate: fixedRateValue,
      p_payout_start_days: payoutStartDaysValue,
      p_periods: isFixed ? null : periodsPayload,
    }

    try {
      setIsSaving(true)
      const { error } = await supabase.rpc("update_rentability_full", payload)

      if (error) {
        console.error("[rentabilities] Erro ao atualizar:", error)
        toast({
          title: "Erro ao atualizar rentabilidade",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Rentabilidade atualizada",
        description: "A configuração de rentabilidade foi atualizada com sucesso.",
      })

      resetForm()
      setIsEditingRentability(false)
      setEditingRentabilityId(null)
      loadRentabilities()
    } catch (err) {
      console.error("[rentabilities] Erro inesperado ao atualizar:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível atualizar a rentabilidade. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRentability = async () => {
    if (!deletingRentabilityId) return

    try {
      setIsDeleting(true)
      const { error } = await supabase.rpc("delete_rentability_safe", {
        p_rentability_id: deletingRentabilityId,
      })

      if (error) {
        console.error("[rentabilities] Erro ao deletar:", error)
        toast({
          title: "Erro ao deletar rentabilidade",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Rentabilidade deletada",
        description: "A configuração de rentabilidade foi removida com sucesso.",
      })

      setIsDeleteDialogOpen(false)
      setDeletingRentabilityId(null)
      loadRentabilities()
    } catch (err) {
      console.error("[rentabilities] Erro inesperado ao deletar:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível deletar a rentabilidade. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditCondition = async (id: number) => {
    try {
      setEditingConditionId(id)
      setIsConditionDialogOpen(true)

      // Buscar dados da condição
      const { data: conditionData, error: conditionError } = await supabase
        .from("conditions")
        .select("id, code, description, rentability_id")
        .eq("id", id)
        .single()

      if (conditionError) {
        console.error("[conditions] Erro ao carregar para edição:", conditionError)
        toast({
          title: "Erro ao carregar condição",
          description: conditionError.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        setIsConditionDialogOpen(false)
        setEditingConditionId(null)
        return
      }

      // Preencher formulário com dados existentes
      setConditionCode(conditionData.code || "")
      setConditionDescription(conditionData.description || "")
      setConditionRentabilityId(conditionData.rentability_id)
    } catch (err) {
      console.error("[conditions] Erro inesperado ao carregar para edição:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar a condição para edição.",
        variant: "destructive",
      })
      setIsConditionDialogOpen(false)
      setEditingConditionId(null)
    }
  }

  const handleSaveCondition = async (e: React.FormEvent) => {
    e.preventDefault()

    const code = conditionCode.trim()
    const description = conditionDescription.trim()

    if (!code) {
      toast({
        title: "Código obrigatório",
        description: "Informe um código identificador para a condição.",
        variant: "destructive",
      })
      return
    }

    if (!description) {
      toast({
        title: "Descrição obrigatória",
        description: "Informe a descrição que será exibida no frontend.",
        variant: "destructive",
      })
      return
    }

    if (!conditionRentabilityId) {
      toast({
        title: "Rentabilidade obrigatória",
        description: "Selecione uma rentabilidade para a condição.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSavingCondition(true)

      if (editingConditionId) {
        // Atualizar condição existente
        const { error } = await supabase.rpc("update_condition", {
          p_condition_id: editingConditionId,
          p_description: description,
          p_code: code,
          p_rentability_id: conditionRentabilityId,
        })

        if (error) {
          console.error("[conditions] Erro ao atualizar:", error)
          toast({
            title: "Erro ao atualizar condição",
            description: error.message || "Tente novamente em alguns instantes.",
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Condição atualizada",
          description: "A condição foi atualizada com sucesso.",
        })
      } else {
        // Criar nova condição
        const { error } = await supabase.from("conditions").insert({
          code,
          description,
          rentability_id: conditionRentabilityId,
        })

        if (error) {
          console.error("[conditions] Erro ao criar:", error)
          toast({
            title: "Erro ao criar condição",
            description: error.message || "Tente novamente em alguns instantes.",
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Condição criada",
          description: "A nova condição foi salva com sucesso.",
        })
      }

      // Limpar formulário e fechar modal
      setConditionCode("")
      setConditionDescription("")
      setConditionRentabilityId(null)
      setEditingConditionId(null)
      setIsConditionDialogOpen(false)
      loadConditions()
    } catch (err) {
      console.error("[conditions] Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: editingConditionId
          ? "Não foi possível atualizar a condição. Tente novamente."
          : "Não foi possível criar a condição. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSavingCondition(false)
    }
  }

  const openUserTypeDetail = async (id: number) => {
    try {
      setSelectedUserTypeId(id)
      setUserTypeDetailLoading(true)
      setUserTypeDetailOpen(true)
      setUserTypeDetail(null)

      // Buscar dados do tipo de usuário
      const { data: userTypeData, error: userTypeError } = await supabase
        .from("user_types")
        .select("id, name, display_name, rentability_id")
        .eq("id", id)
        .single()

      if (userTypeError) {
        console.error("[user_types] Erro ao buscar detalhes:", userTypeError)
        toast({
          title: "Erro ao carregar detalhes",
          description: userTypeError.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        setUserTypeDetailOpen(false)
        return
      }

      // Buscar rentabilidade associada
      let rentability = null
      if (userTypeData.rentability_id) {
        const { data: rentData } = await supabase
          .from("rentabilities")
          .select("id, title, is_fixed")
          .eq("id", userTypeData.rentability_id)
          .single()
        rentability = rentData
      }

      // Buscar condições associadas
      const { data: conditionsData, error: conditionsError } = await supabase
        .from("user_type_conditions")
        .select("condition_id, conditions(id, code, description, rentability_id)")
        .eq("user_type_id", id)

      if (conditionsError) {
        console.error("[user_type_conditions] Erro ao buscar condições:", conditionsError)
        // Não bloquear se houver erro nas condições
      }

      // Buscar rentabilidades das condições
      const conditionsWithRentability = await Promise.all(
        (conditionsData || []).map(async (item: any) => {
          const condition = item.conditions
          let conditionRentability = null
          if (condition?.rentability_id) {
            const { data: rentData } = await supabase
              .from("rentabilities")
              .select("id, title")
              .eq("id", condition.rentability_id)
              .single()
            conditionRentability = rentData
          }
          return {
            id: condition.id,
            code: condition.code,
            description: condition.description,
            rentability: conditionRentability,
          }
        }),
      )

      setUserTypeDetail({
        id: userTypeData.id,
        name: userTypeData.name,
        display_name: userTypeData.display_name,
        rentability: rentability
          ? {
              id: rentability.id,
              title: rentability.title,
              is_fixed: rentability.is_fixed,
            }
          : null,
        conditions: conditionsWithRentability,
      })

      // Buscar profiles com este user_type_id
      setIsLoadingProfiles(true)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .eq("user_type_id", id)
        .order("created_at", { ascending: false })

      if (profilesError) {
        console.error("[profiles] Erro ao buscar profiles:", profilesError)
        setUserTypeProfiles([])
      } else {
        setUserTypeProfiles(profilesData || [])
      }
    } catch (err) {
      console.error("[user_types] Erro inesperado ao buscar detalhes:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar os detalhes do tipo de usuário.",
        variant: "destructive",
      })
      setUserTypeDetailOpen(false)
    } finally {
      setUserTypeDetailLoading(false)
      setIsLoadingProfiles(false)
    }
  }

  const openEditUserType = async (id: number) => {
    try {
      setEditingUserTypeId(id)
      setIsUserTypeDialogOpen(true)

      // Buscar dados do tipo de usuário
      const { data: userTypeData, error: userTypeError } = await supabase
        .from("user_types")
        .select("id, name, display_name, rentability_id, user_type")
        .eq("id", id)
        .single()

      if (userTypeError) {
        console.error("[user_types] Erro ao carregar para edição:", userTypeError)
        toast({
          title: "Erro ao carregar tipo de usuário",
          description: userTypeError.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
        setIsUserTypeDialogOpen(false)
        setEditingUserTypeId(null)
        return
      }

      // Preencher formulário com dados existentes
      setUserTypeName(userTypeData.name || "")
      setUserTypeDisplayName(userTypeData.display_name || "")
      setUserTypeRentabilityId(userTypeData.rentability_id)
      const userType = userTypeData.user_type || ""
      
      // Verificar se o nome exibido está personalizado (diferente do padrão da variação)
      // IMPORTANTE: Setar antes de setar a variation para evitar que o useEffect sobrescreva
      const defaultDisplayName = userType ? variationDisplayNames[userType] : ""
      setIsDisplayNameCustomized(
        userTypeData.display_name !== defaultDisplayName && defaultDisplayName !== ""
      )
      
      // Setar a variation por último para evitar que o useEffect sobrescreva o nome personalizado
      setUserTypeVariation(userType)

      // Buscar condições associadas
      const { data: conditionsData, error: conditionsError } = await supabase
        .from("user_type_conditions")
        .select("condition_id")
        .eq("user_type_id", id)

      if (conditionsError) {
        console.error("[user_type_conditions] Erro ao buscar condições:", conditionsError)
        // Não bloquear se houver erro nas condições
        setUserTypeConditionIds([])
      } else {
        const conditionIds = (conditionsData || []).map((item: any) => item.condition_id)
        setUserTypeConditionIds(conditionIds)
      }
    } catch (err) {
      console.error("[user_types] Erro inesperado ao carregar para edição:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar o tipo de usuário para edição.",
        variant: "destructive",
      })
      setIsUserTypeDialogOpen(false)
      setEditingUserTypeId(null)
    }
  }

  const handleSaveUserType = async (e: React.FormEvent) => {
    e.preventDefault()

    const rawName = userTypeName.trim()
    const displayName = userTypeDisplayName.trim()

    if (!rawName) {
      toast({
        title: "Nome interno obrigatório",
        description: "Informe um identificador técnico para o tipo de usuário.",
        variant: "destructive",
      })
      return
    }

    if (!displayName) {
      toast({
        title: "Nome exibido obrigatório",
        description: "Informe o nome que será exibido na interface.",
        variant: "destructive",
      })
      return
    }

    if (!userTypeRentabilityId) {
      toast({
        title: "Rentabilidade obrigatória",
        description: "Selecione uma rentabilidade para o tipo de usuário.",
        variant: "destructive",
      })
      return
    }

    if (!userTypeVariation) {
      toast({
        title: "Variação obrigatória",
        description: "Selecione uma variação para o tipo de usuário.",
        variant: "destructive",
      })
      return
    }

    // Normalizar slug: minúsculo e sem espaços
    const slug = rawName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")

    try {
      setIsSavingUserType(true)

      if (editingUserTypeId) {
        // Atualizar tipo de usuário existente
        const payload = {
          p_user_type_id: editingUserTypeId,
          p_name: slug,
          p_display_name: displayName,
          p_rentability_id: userTypeRentabilityId,
          p_user_type: userTypeVariation,
          p_condition_ids: userTypeConditionIds.length > 0 ? userTypeConditionIds : null,
        }

        const { error } = await supabase.rpc("update_user_type_full", payload)

        if (error) {
          console.error("[user_types] Erro ao atualizar tipo:", error)
          toast({
            title: "Erro ao atualizar tipo de usuário",
            description: error.message || "Tente novamente em alguns instantes.",
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Tipo de usuário atualizado",
          description: "O tipo de usuário foi atualizado com sucesso.",
        })
      } else {
        // Criar novo tipo de usuário
        const payload = {
          p_name: slug,
          p_display_name: displayName,
          p_rentability_id: userTypeRentabilityId,
          p_user_type: userTypeVariation,
          p_condition_ids: userTypeConditionIds.length > 0 ? userTypeConditionIds : null,
        }

        const { error } = await supabase.rpc("create_user_type_full", payload)

        if (error) {
          console.error("[user_types] Erro ao criar tipo:", error)
          toast({
            title: "Erro ao criar tipo de usuário",
            description: error.message || "Tente novamente em alguns instantes.",
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Tipo de usuário criado",
          description: "O novo tipo de usuário foi salvo com sucesso.",
        })
      }

      // Limpar formulário e fechar modal
      setUserTypeName("")
      setUserTypeDisplayName("")
      setUserTypeRentabilityId(null)
      setUserTypeVariation("")
      setIsDisplayNameCustomized(false)
      setUserTypeConditionIds([])
      setEditingUserTypeId(null)
      setIsUserTypeDialogOpen(false)
      loadUserTypes()
    } catch (err) {
      console.error("[user_types] Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: editingUserTypeId
          ? "Não foi possível atualizar o tipo de usuário. Tente novamente."
          : "Não foi possível criar o tipo de usuário. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSavingUserType(false)
    }
  }

  return (
    <ProtectedRoute allowedTypes={["admin"]}>
      <div className="min-h-screen bg-[#01223F]">
        <div className="container mx-auto px-4 py-8 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Configurações</h1>
          </div>

          {/* Lista de rentabilidades */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-[#003F28] border-[#00BC6E]/30 text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Configurações de Rentabilidade</CardTitle>
                  <span className="text-xs text-white/70">
                    {isLoadingList
                      ? "Carregando..."
                      : `${rentabilities.length} configuração${rentabilities.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                  onClick={() => setIsRentDialogOpen(true)}
                >
                  Criar rentabilidade
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="Pesquisar por nome ou ID..."
                      value={searchRentabilities}
                      onChange={(e) => setSearchRentabilities(e.target.value)}
                      className="pl-10 bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[#003F28] z-10">
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">ID</TableHead>
                        <TableHead className="text-white/80">Nome</TableHead>
                        <TableHead className="text-white/80">Tipo</TableHead>
                        <TableHead className="text-right text-white/80">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const filteredRentabilities = rentabilities.filter((rent) => {
                          if (!searchRentabilities) return true
                          const search = searchRentabilities.toLowerCase()
                          return (
                            rent.id.toString().includes(search) ||
                            rent.title.toLowerCase().includes(search) ||
                            (rent.is_fixed ? "fixa" : "variável").includes(search)
                          )
                        })
                        
                        return (
                          <>
                            {filteredRentabilities.length === 0 && !isLoadingList && (
                              <TableRow>
                                <TableCell colSpan={4} className="py-6 text-center text-white/60">
                                  {searchRentabilities
                                    ? "Nenhuma configuração encontrada com os filtros aplicados."
                                    : "Nenhuma configuração de rentabilidade cadastrada."}
                                </TableCell>
                              </TableRow>
                            )}

                            {filteredRentabilities.map((rent) => (
                        <TableRow key={rent.id} className="border-white/10 hover:bg-[#01223F]">
                          <TableCell className="text-white/80">{rent.id}</TableCell>
                          <TableCell className="text-white">{rent.title}</TableCell>
                          <TableCell className="text-white/80">
                            {rent.is_fixed ? "Fixa" : "Variável"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                                onClick={() => openRentabilityDetail(rent.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                                onClick={() => openEditRentability(rent.id)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-transparent border-red-500/60 text-white hover:bg-red-500 hover:text-white"
                                onClick={() => {
                                  setDeletingRentabilityId(rent.id)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                            </TableRow>
                          ))}
                          </>
                        )
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Lista de tipos de usuário */}
            <Card className="bg-[#003F28] border-[#00BC6E]/30 text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Tipos de Usuário</CardTitle>
                  <span className="text-xs text-white/70">
                    {isLoadingUserTypes
                      ? "Carregando..."
                      : `${userTypes.length} tipo${userTypes.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                    onClick={() => {
                      setIsAssociateUsersDialogOpen(true)
                      loadAllProfiles()
                    }}
                  >
                    Associar usuários
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                    onClick={() => setIsUserTypeDialogOpen(true)}
                  >
                    Criar tipo de usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="Pesquisar por nome interno, ID ou rentabilidade..."
                      value={searchUserTypes}
                      onChange={(e) => setSearchUserTypes(e.target.value)}
                      className="pl-10 bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Label className="text-white/70 text-xs whitespace-nowrap">Tipo:</Label>
                    <select
                      value={filterUserTypeByType}
                      onChange={(e) => setFilterUserTypeByType(e.target.value)}
                      className="w-[160px] rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white h-9"
                    >
                      <option value="all">Todos</option>
                      <option value="distributor">Distribuidor</option>
                      <option value="office">Escritório</option>
                      <option value="advisor">Assessor</option>
                      <option value="investor">Investidor</option>
                      <option value="admin">Gestor</option>
                    </select>
                  </div>
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[#003F28] z-10">
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">ID</TableHead>
                        <TableHead className="text-white/80">Nome interno</TableHead>
                        <TableHead className="text-white/80">Rentabilidade</TableHead>
                        <TableHead className="text-right text-white/80">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const filteredUserTypes = userTypes.filter((ut) => {
                          // Filtro por tipo de usuário
                          if (filterUserTypeByType !== "all" && ut.user_type !== filterUserTypeByType) {
                            return false
                          }
                          
                          // Filtro por pesquisa de texto
                          if (!searchUserTypes) return true
                          const search = searchUserTypes.toLowerCase()
                          const rent = rentabilities.find((r) => r.id === ut.rentability_id)
                          return (
                            ut.id.toString().includes(search) ||
                            ut.name.toLowerCase().includes(search) ||
                            (ut.display_name && ut.display_name.toLowerCase().includes(search)) ||
                            (rent && rent.title.toLowerCase().includes(search))
                          )
                        })
                        
                        return (
                          <>
                            {filteredUserTypes.length === 0 && !isLoadingUserTypes && (
                              <TableRow>
                                <TableCell colSpan={4} className="py-6 text-center text-white/60">
                                  {searchUserTypes
                                    ? "Nenhum tipo de usuário encontrado com os filtros aplicados."
                                    : "Nenhum tipo de usuário cadastrado."}
                                </TableCell>
                              </TableRow>
                            )}

                            {filteredUserTypes.map((ut) => {
                              const rent = rentabilities.find((r) => r.id === ut.rentability_id)
                              return (
                                <TableRow key={ut.id} className="border-white/10 hover:bg-[#01223F]">
                                  <TableCell className="text-white/80">{ut.id}</TableCell>
                                  <TableCell className="text-white/80">{ut.name}</TableCell>
                                  <TableCell className="text-white/80">
                                    {rent ? rent.title : ut.rentability_id ?? "-"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                                        onClick={() => openUserTypeDetail(ut.id)}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                                        onClick={() => openEditUserType(ut.id)}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </>
                        )
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de condições */}
          <Card className="bg-[#003F28] border-[#00BC6E]/30 text-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Condições</CardTitle>
                <span className="text-xs text-white/70">
                  {isLoadingConditions
                    ? "Carregando..."
                    : `${conditions.length} condição${conditions.length === 1 ? "" : "ões"}`}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                onClick={() => setIsConditionDialogOpen(true)}
              >
                Criar condição
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/80">ID</TableHead>
                    <TableHead className="text-white/80">Código</TableHead>
                    <TableHead className="text-white/80">Descrição</TableHead>
                    <TableHead className="text-white/80">Rentabilidade</TableHead>
                    <TableHead className="text-right text-white/80">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conditions.length === 0 && !isLoadingConditions && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-white/60">
                        Nenhuma condição cadastrada.
                      </TableCell>
                    </TableRow>
                  )}

                  {conditions.map((condition) => {
                    const rent = rentabilities.find((r) => r.id === condition.rentability_id)
                    return (
                      <TableRow key={condition.id} className="border-white/10 hover:bg-[#01223F]">
                        <TableCell className="text-white/80">{condition.id}</TableCell>
                        <TableCell className="text-white/80">{condition.code}</TableCell>
                        <TableCell className="text-white">{condition.description}</TableCell>
                        <TableCell className="text-white/80">
                          {rent ? rent.title : condition.rentability_id ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                            onClick={() => openEditCondition(condition.id)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Relações entre tipos de usuário */}
          <Card className="bg-[#003F28] border-[#00BC6E]/30 text-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Relações entre Tipos de Usuário
                </CardTitle>
                <span className="text-xs text-white/70">
                  {isLoadingRelations
                    ? "Carregando..."
                    : `${relations.length} relação${relations.length === 1 ? "" : "ões"}`}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                onClick={() => setIsRelationDialogOpen(true)}
              >
                Criar relações
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingRelations ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00BC6E] border-t-transparent" />
                  <span className="ml-2 text-white/70">Carregando relações...</span>
                </div>
              ) : relations.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">Nenhuma relação cadastrada.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {(() => {
                    // Criar mapa de relações: parent_id -> [children]
                    const relationMap = new Map<number, Array<{ id: number; name: string; display_name: string; user_type: string | null }>>()
                    
                    relations.forEach(relation => {
                      if (!relation.parent_user_type || !relation.child_user_type) return
                      
                      const parentId = relation.parent_user_type.id
                      if (!relationMap.has(parentId)) {
                        relationMap.set(parentId, [])
                      }
                      relationMap.get(parentId)!.push(relation.child_user_type)
                    })

                    // Encontrar apenas tipos que estão envolvidos em relações
                    const typesInRelations = new Set<number>()
                    relations.forEach(relation => {
                      if (relation.parent_user_type) {
                        typesInRelations.add(relation.parent_user_type.id)
                      }
                      if (relation.child_user_type) {
                        typesInRelations.add(relation.child_user_type.id)
                      }
                    })

                    // Encontrar tipos raiz (que não são filhos de ninguém, mas estão nas relações)
                    const allChildIds = new Set<number>()
                    relations.forEach(relation => {
                      if (relation.child_user_type) {
                        allChildIds.add(relation.child_user_type.id)
                      }
                    })
                    
                    const rootTypes = Array.from(typesInRelations)
                      .map(id => userTypes.find(ut => ut.id === id))
                      .filter((ut): ut is typeof userTypes[0] => ut !== undefined && !allChildIds.has(ut.id))

                    // Função para obter ícone e cor baseado no tipo
                    const getTypeConfig = (userType: string | null | undefined) => {
                      switch (userType) {
                        case "distributor":
                          return {
                            icon: Crown,
                            color: "bg-purple-500/20 border-purple-500/40 text-purple-300",
                            iconColor: "text-purple-400",
                            label: "Distribuidor"
                          }
                        case "office":
                          return {
                            icon: Building2,
                            color: "bg-blue-500/20 border-blue-500/40 text-blue-300",
                            iconColor: "text-blue-400",
                            label: "Escritório"
                          }
                        case "advisor":
                          return {
                            icon: Users,
                            color: "bg-orange-500/20 border-orange-500/40 text-orange-300",
                            iconColor: "text-orange-400",
                            label: "Assessor"
                          }
                        case "investor":
                          return {
                            icon: User,
                            color: "bg-green-500/20 border-green-500/40 text-green-300",
                            iconColor: "text-green-400",
                            label: "Investidor"
                          }
                        default:
                          return {
                            icon: User,
                            color: "bg-gray-500/20 border-gray-500/40 text-gray-300",
                            iconColor: "text-gray-400",
                            label: "Desconhecido"
                          }
                      }
                    }

                    // Função para alternar expansão
                    const toggleExpansion = (typeId: number) => {
                      setExpandedRelationIds(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(typeId)) {
                          newSet.delete(typeId)
                        } else {
                          newSet.add(typeId)
                        }
                        return newSet
                      })
                    }

                    // Componente recursivo para renderizar a árvore
                    const renderTypeTree = (typeId: number, level: number = 0): JSX.Element | null => {
                      // Só renderizar se o tipo estiver nas relações
                      if (!typesInRelations.has(typeId)) return null
                      
                      const type = userTypes.find(ut => ut.id === typeId)
                      if (!type) return null

                      const config = getTypeConfig(type.user_type || null)
                      const TypeIcon = config.icon
                      const children = relationMap.get(typeId) || []
                      const isExpanded = expandedRelationIds.has(typeId)
                      const hasChildren = children.length > 0
                      
                      // Verificar se este tipo pode ter filhos (não é investidor e tem tipos válidos)
                      const canHaveChildren = getValidChildTypes(typeId, "all").length > 0

                      return (
                        <div key={typeId} className="space-y-4">
                          {/* Card do Tipo */}
                          <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${config.color} ${level > 0 ? 'ml-8' : ''}`}>
                            <div className={`p-3 rounded-lg bg-white/5 ${config.iconColor}`}>
                              <TypeIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">
                                  {type.name}
                                </h3>
                                {type.display_name && type.display_name !== type.name && (
                                  <Badge variant="outline" className={`${config.color} border-current`}>
                                    {type.display_name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-white/60 mt-1">
                                {config.label}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasChildren && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="bg-transparent text-white hover:bg-white/10 p-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpansion(typeId)
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5" />
                                  )}
                                </Button>
                              )}
                              {canHaveChildren && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
                                  onClick={() => openEditRelation(typeId)}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Filhos recursivos */}
                          {hasChildren && isExpanded && (
                            <div className="pl-8 space-y-4">
                              <div className="flex items-center gap-2 text-white/40">
                                <ArrowDown className="w-4 h-4" />
                                <span className="text-xs">Pode criar:</span>
                              </div>
                              {children.map(child => renderTypeTree(child.id, level + 1))}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Renderizar apenas tipos raiz que estão nas relações
                    return rootTypes.length > 0 
                      ? rootTypes.map(type => renderTypeTree(type.id))
                      : null
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={isRentDialogOpen || isEditingRentability}
          onOpenChange={(open) => {
            setIsRentDialogOpen(open)
            if (!open) {
              setIsEditingRentability(false)
              setEditingRentabilityId(null)
              resetForm()
            }
          }}
        >
          <DialogContent className="w-full max-w-none sm:max-w-[90vw] max-h-[90vh] bg-[#01223F] border-[#00BC6E]/40 text-white">
            <DialogHeader>
              <DialogTitle>
                {isEditingRentability ? "Editar Configuração de Rentabilidade" : "Nova Configuração de Rentabilidade"}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {isEditingRentability
                  ? "Atualize o título, tipo de rentabilidade e configure os períodos e taxas."
                  : "Defina o plano (fixo ou variável) e configure os períodos e taxas."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={isEditingRentability ? handleUpdateRentability : handleSaveRentability} className="space-y-6 max-h-[calc(90vh-7rem)] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">
                    Título do plano
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Investor Type 0"
                    className="bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border border-[#00BC6E]/30 bg-[#003562] px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-white">Rentabilidade fixa</p>
                    <p className="text-xs text-white/60">
                      Quando ativado, o plano usa apenas uma taxa fixa e não terá períodos com taxas variáveis.
                    </p>
                  </div>
                  <Switch
                    checked={isFixed}
                    onCheckedChange={(checked) => {
                      setIsFixed(checked)
                      if (checked) {
                        setPeriods(buildDefaultPeriods())
                      } else {
                        setFixedRate("")
                      }
                    }}
                    className="data-[state=checked]:bg-[#00BC6E] data-[state=unchecked]:bg-white/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payoutStartDays" className="text-white">
                    Após quantos dias o rendimento começa?
                  </Label>
                  <Input
                    id="payoutStartDays"
                    type="number"
                    min="0"
                    step="1"
                    value={payoutStartDays}
                    onChange={(e) => setPayoutStartDays(e.target.value)}
                    placeholder="Ex: 0, 30, 60, 90"
                    className="bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40"
                  />
                  <p className="text-xs text-white/60">
                    0 = começa imediatamente | 30 = após 30 dias | 60 = após 60 dias | etc.
                  </p>
                </div>

                {isFixed && (
                  <div className="space-y-2">
                    <Label htmlFor="fixedRate" className="text-white">
                      Taxa fixa (%)
                    </Label>
                    <Input
                      id="fixedRate"
                      type="number"
                      step="0.0001"
                      value={fixedRate}
                      onChange={(e) => setFixedRate(e.target.value)}
                      placeholder="Ex: 2.5000"
                      className="bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40"
                    />
                  </div>
                )}
              </div>

              {!isFixed && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Períodos e taxas</h3>

                  <div className="rounded-md border border-[#00BC6E]/30 bg-[#003562]">
                    {/* Cabeçalho */}
                    <div className="grid grid-cols-6 gap-2 border-b border-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                      <div>Período (meses)</div>
                      <div>Mensal (% a.m.)</div>
                      <div>Semestral (%)</div>
                      <div>Anual (%)</div>
                      <div>Bienal (%)</div>
                      <div>Trienal (%)</div>
                    </div>

                    {/* Linhas */}
                    <div className="max-h-[260px] overflow-y-auto">
                      {periods.map((period, index) => (
                        // Para facilitar lógica de habilitar/desabilitar campos
                        // convertemos meses para número aqui
                        (() => {
                          const monthsNum = Number(period.months)
                          const enabledMonthly = isRateEnabledForMonths(monthsNum, "monthly")
                          const enabledSemiannual = isRateEnabledForMonths(monthsNum, "semiannual")
                          const enabledAnnual = isRateEnabledForMonths(monthsNum, "annual")
                          const enabledBiennial = isRateEnabledForMonths(monthsNum, "biennial")
                          const enabledTriennial = isRateEnabledForMonths(monthsNum, "triennial")

                          return (
                        <div
                          key={period.id}
                          className="grid grid-cols-6 gap-2 border-b border-white/5 px-3 py-2 text-xs last:border-b-0"
                        >
                          <div className="flex items-center">
                            <Input
                              id={`months-${period.id}`}
                              value={period.months}
                              readOnly
                              className="h-8 bg-[#01223F] border-[#00BC6E]/40 text-white text-center"
                            />
                          </div>

                          <div className={enabledMonthly ? "" : "opacity-30"}>
                            <Input
                              id={`monthly-${period.id}`}
                              type="number"
                              step="0.0001"
                              value={period.monthly}
                              onChange={(e) => handlePeriodChange(period.id, "monthly", e.target.value)}
                              placeholder={index === 0 ? "2.1000" : ""}
                              className="h-8 bg-[#01223F] border-[#00BC6E]/40 text-white text-xs placeholder:text-white/30"
                              disabled={!enabledMonthly}
                            />
                          </div>

                          <div className={enabledSemiannual ? "" : "opacity-30"}>
                            <Input
                              id={`semiannual-${period.id}`}
                              type="number"
                              step="0.0001"
                              value={period.semiannual}
                              onChange={(e) => handlePeriodChange(period.id, "semiannual", e.target.value)}
                              placeholder={index === 0 ? "2.2000" : ""}
                              className="h-8 bg-[#01223F] border-[#00BC6E]/40 text-white text-xs placeholder:text-white/30"
                              disabled={!enabledSemiannual}
                            />
                          </div>

                          <div className={enabledAnnual ? "" : "opacity-30"}>
                            <Input
                              id={`annual-${period.id}`}
                              type="number"
                              step="0.0001"
                              value={period.annual}
                              onChange={(e) => handlePeriodChange(period.id, "annual", e.target.value)}
                              placeholder={index === 0 ? "2.5000" : ""}
                              className="h-8 bg-[#01223F] border-[#00BC6E]/40 text-white text-xs placeholder:text-white/30"
                              disabled={!enabledAnnual}
                            />
                          </div>

                          <div className={enabledBiennial ? "" : "opacity-30"}>
                            <Input
                              id={`biennial-${period.id}`}
                              type="number"
                              step="0.0001"
                              value={period.biennial}
                              onChange={(e) => handlePeriodChange(period.id, "biennial", e.target.value)}
                              placeholder={index === 0 ? "3.0000" : ""}
                              className="h-8 bg-[#01223F] border-[#00BC6E]/40 text-white text-xs placeholder:text-white/30"
                              disabled={!enabledBiennial}
                            />
                          </div>

                          <div className={enabledTriennial ? "" : "opacity-30"}>
                            <Input
                              id={`triennial-${period.id}`}
                              type="number"
                              step="0.0001"
                              value={period.triennial}
                              onChange={(e) => handlePeriodChange(period.id, "triennial", e.target.value)}
                              placeholder={index === 0 ? "3.5000" : ""}
                              className="h-8 bg-[#01223F] border-[#00BC6E]/40 text-white text-xs placeholder:text-white/30"
                              disabled={!enabledTriennial}
                            />
                          </div>
                        </div>
                          )
                        })()
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10"
                  onClick={() => {
                    setIsRentDialogOpen(false)
                    setIsEditingRentability(false)
                    setEditingRentabilityId(null)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#00BC6E] text-[#003F28] hover:bg-[#00A85F]"
                  disabled={isSaving}
                >
                  {isSaving
                    ? isEditingRentability
                      ? "Atualizando..."
                      : "Salvando..."
                    : isEditingRentability
                      ? "Atualizar rentabilidade"
                      : "Salvar rentabilidade"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal de detalhes da rentabilidade */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setSelectedRentabilityId(null)
            setRentabilityDetail(null)
          }
        }}
      >
        <DialogContent className="w-full max-w-none sm:max-w-[90vw] max-h-[90vh] bg-[#01223F] border-[#00BC6E]/40 text-white">
          <DialogHeader>
            <DialogTitle>Detalhes da Rentabilidade</DialogTitle>
            <DialogDescription className="text-white/70">
              Visualize como esta configuração está estruturada no sistema.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-white/70">Carregando detalhes...</div>
          ) : !rentabilityDetail ? (
            <div className="py-8 text-center text-white/70">
              Nenhum detalhe disponível para esta rentabilidade.
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <p className="text-sm text-white/70">
                  <span className="font-semibold text-white">ID:</span> {rentabilityDetail.id}
                </p>
                <p className="text-sm text-white/70">
                  <span className="font-semibold text-white">Título:</span> {rentabilityDetail.title}
                </p>
                <p className="text-sm text-white/70">
                  <span className="font-semibold text-white">Início do rendimento:</span>{" "}
                  {rentabilityDetail.payout_start_days != null
                    ? `${rentabilityDetail.payout_start_days} dia${rentabilityDetail.payout_start_days !== 1 ? "s" : ""} após o investimento`
                    : "0 dias (imediato)"}
                </p>
                <p className="text-sm text-white/70">
                  <span className="font-semibold text-white">Tipo:</span>{" "}
                  {rentabilityDetail.is_fixed ? "Fixa" : "Variável"}
                </p>
                {rentabilityDetail.is_fixed && (
                  <p className="text-sm text-white/70">
                    <span className="font-semibold text-white">Taxa fixa:</span>{" "}
                    {rentabilityDetail.fixed_rate} % a.m.
                  </p>
                )}
              </div>

              {!rentabilityDetail.is_fixed && Array.isArray(rentabilityDetail.periods) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white">Períodos configurados</h4>
                  <div className="rounded-md border border-[#00BC6E]/30 bg-[#003562] overflow-x-auto">
                    <div className="grid min-w-[640px] grid-cols-6 gap-2 border-b border-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                      <div>Meses</div>
                      <div>Mensal</div>
                      <div>Semestral</div>
                      <div>Anual</div>
                      <div>Bienal</div>
                      <div>Trienal</div>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                      {rentabilityDetail.periods.map((p: any, idx: number) => (
                        <div
                          key={`${p.months}-${idx}`}
                          className="grid min-w-[640px] grid-cols-6 gap-2 border-b border-white/5 px-3 py-2 text-xs last:border-b-0"
                        >
                          <div className="text-white/80">{p.months}</div>
                          <div className="text-white/80">
                            {p.rates?.monthly != null ? `${p.rates.monthly} %` : "-"}
                          </div>
                          <div className="text-white/80">
                            {p.rates?.semiannual != null ? `${p.rates.semiannual} %` : "-"}
                          </div>
                          <div className="text-white/80">
                            {p.rates?.annual != null ? `${p.rates.annual} %` : "-"}
                          </div>
                          <div className="text-white/80">
                            {p.rates?.biennial != null ? `${p.rates.biennial} %` : "-"}
                          </div>
                          <div className="text-white/80">
                            {p.rates?.triennial != null ? `${p.rates.triennial} %` : "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de cadastro de tipo de usuário */}
      <Dialog
        open={isUserTypeDialogOpen}
        onOpenChange={(open) => {
          setIsUserTypeDialogOpen(open)
          if (!open) {
            setUserTypeName("")
            setUserTypeDisplayName("")
            setUserTypeRentabilityId(null)
            setUserTypeVariation("")
            setIsDisplayNameCustomized(false)
            setUserTypeConditionIds([])
            setEditingUserTypeId(null)
          }
        }}
      >
        <DialogContent className="w-full max-w-xl bg-[#01223F] border-[#00BC6E]/40 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingUserTypeId ? "Editar Tipo de Usuário" : "Novo Tipo de Usuário"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {editingUserTypeId
                ? "Atualize as informações do tipo de usuário, incluindo rentabilidade e condições associadas."
                : "Defina o nome interno, o nome exibido e vincule a uma rentabilidade existente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUserType} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userTypeName" className="text-white">
                Nome interno (slug)
              </Label>
              <Input
                id="userTypeName"
                value={userTypeName}
                onChange={(e) => setUserTypeName(e.target.value)}
                placeholder="Ex: investor_type_0"
                className="bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40"
              />
              <p className="text-[11px] text-white/60">
                Use letras minúsculas, números e underline. Será usado como identificador técnico.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userTypeDisplayName" className="text-white">
                Nome exibido
              </Label>
              <div className="flex items-center gap-6 mb-2">
                <RadioGroup
                  value={isDisplayNameCustomized ? "customized" : "default"}
                  onValueChange={(value) => {
                    setIsDisplayNameCustomized(value === "customized")
                    if (value === "default" && userTypeVariation && variationDisplayNames[userTypeVariation]) {
                      setUserTypeDisplayName(variationDisplayNames[userTypeVariation])
                    }
                  }}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="default" id="display-name-default" className="border-white/40" />
                    <Label htmlFor="display-name-default" className="text-sm text-white cursor-pointer font-normal">
                      Padrão
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customized" id="display-name-customized" className="border-white/40" />
                    <Label htmlFor="display-name-customized" className="text-sm text-white cursor-pointer font-normal">
                      Personalizado
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Input
                id="userTypeDisplayName"
                value={userTypeDisplayName}
                onChange={(e) => setUserTypeDisplayName(e.target.value)}
                placeholder="Ex: Investidores Gerais"
                readOnly={!isDisplayNameCustomized}
                className={`bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40 ${
                  !isDisplayNameCustomized ? "cursor-not-allowed opacity-70" : ""
                }`}
              />
              {!isDisplayNameCustomized && (
                <p className="text-[11px] text-white/60">
                  O nome será preenchido automaticamente com base na variação selecionada.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userTypeRentability" className="text-white">
                Rentabilidade associada
              </Label>
              <select
                id="userTypeRentability"
                value={userTypeRentabilityId ?? ""}
                onChange={(e) =>
                  setUserTypeRentabilityId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white"
              >
                <option value="">Selecione uma rentabilidade</option>
                {rentabilities.map((rent) => (
                  <option key={rent.id} value={rent.id}>
                    {rent.title} {rent.is_fixed ? "(Fixa)" : "(Variável)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userTypeVariation" className="text-white">
                Esse é uma variação de:
              </Label>
              <select
                id="userTypeVariation"
                value={userTypeVariation}
                onChange={(e) => setUserTypeVariation(e.target.value)}
                className="w-full rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white"
              >
                <option value="">Selecione uma variação</option>
                <option value="office">Escritório</option>
                <option value="admin">Gestor</option>
                <option value="investor">Investidor</option>
                <option value="advisor">Assessor</option>
                <option value="distributor">Distribuidor</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Condições opcionais</Label>
              <p className="text-xs text-white/60">
                Selecione as condições que podem ser aplicadas a este tipo de usuário. Se uma condição for marcada no cadastro de investimento, ela substituirá a rentabilidade padrão.
              </p>
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-[#00BC6E]/30 bg-[#003562] p-3 space-y-2">
                {conditions.length === 0 ? (
                  <p className="text-sm text-white/60 text-center py-2">
                    Nenhuma condição cadastrada. Crie condições primeiro.
                  </p>
                ) : (
                  conditions.map((condition) => {
                    const rent = rentabilities.find((r) => r.id === condition.rentability_id)
                    return (
                      <div key={condition.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`condition-${condition.id}`}
                          checked={userTypeConditionIds.includes(condition.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setUserTypeConditionIds([...userTypeConditionIds, condition.id])
                            } else {
                              setUserTypeConditionIds(
                                userTypeConditionIds.filter((id) => id !== condition.id),
                              )
                            }
                          }}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`condition-${condition.id}`}
                          className="text-sm text-white cursor-pointer flex-1"
                        >
                          <span className="font-medium">{condition.description}</span>
                          <span className="text-xs text-white/60 block">
                            ({condition.code}) - Rentabilidade: {rent ? rent.title : "N/A"}
                          </span>
                        </label>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
                onClick={() => {
                  setIsUserTypeDialogOpen(false)
                  setUserTypeName("")
                  setUserTypeDisplayName("")
                  setUserTypeRentabilityId(null)
                  setUserTypeVariation("")
                  setIsDisplayNameCustomized(false)
                  setUserTypeConditionIds([])
                  setEditingUserTypeId(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#00BC6E] text-[#003F28] hover:bg-[#00A85F]"
                disabled={isSavingUserType}
              >
                {isSavingUserType
                  ? editingUserTypeId
                    ? "Atualizando..."
                    : "Salvando..."
                  : editingUserTypeId
                    ? "Atualizar tipo de usuário"
                    : "Salvar tipo de usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de cadastro de condição */}
      <Dialog
        open={isConditionDialogOpen}
        onOpenChange={(open) => {
          setIsConditionDialogOpen(open)
          if (!open) {
            setConditionCode("")
            setConditionDescription("")
            setConditionRentabilityId(null)
            setEditingConditionId(null)
          }
        }}
      >
        <DialogContent className="w-full max-w-xl bg-[#01223F] border-[#00BC6E]/40 text-white">
          <DialogHeader>
            <DialogTitle>{editingConditionId ? "Editar Condição" : "Nova Condição"}</DialogTitle>
            <DialogDescription className="text-white/70">
              {editingConditionId
                ? "Atualize as informações da condição, incluindo descrição, código e rentabilidade associada."
                : "Crie uma condição opcional que pode alterar a rentabilidade aplicada em um investimento."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCondition} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conditionCode" className="text-white">
                Código identificador
              </Label>
              <Input
                id="conditionCode"
                value={conditionCode}
                onChange={(e) => setConditionCode(e.target.value)}
                placeholder="Ex: internal_lead"
                className="bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40"
              />
              <p className="text-[11px] text-white/60">
                Use letras minúsculas, números e underline. Será usado como identificador lógico.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditionDescription" className="text-white">
                Descrição
              </Label>
              <Input
                id="conditionDescription"
                value={conditionDescription}
                onChange={(e) => setConditionDescription(e.target.value)}
                placeholder="Ex: Lead interno do sistema"
                className="bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40"
              />
              <p className="text-[11px] text-white/60">
                Este texto será exibido como pergunta booleana no frontend.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditionRentability" className="text-white">
                Rentabilidade associada
              </Label>
              <select
                id="conditionRentability"
                value={conditionRentabilityId ?? ""}
                onChange={(e) =>
                  setConditionRentabilityId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white"
              >
                <option value="">Selecione uma rentabilidade</option>
                {rentabilities.map((rent) => (
                  <option key={rent.id} value={rent.id}>
                    {rent.title} {rent.is_fixed ? "(Fixa)" : "(Variável)"}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/60">
                Se esta condição for aplicada no cadastro de investimento, esta rentabilidade substituirá a rentabilidade padrão do tipo de usuário.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
                onClick={() => {
                  setIsConditionDialogOpen(false)
                  setConditionCode("")
                  setConditionDescription("")
                  setConditionRentabilityId(null)
                  setEditingConditionId(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#00BC6E] text-[#003F28] hover:bg-[#00A85F]"
                disabled={isSavingCondition}
              >
                {isSavingCondition
                  ? editingConditionId
                    ? "Atualizando..."
                    : "Salvando..."
                  : editingConditionId
                    ? "Atualizar condição"
                    : "Salvar condição"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes do tipo de usuário */}
      <Dialog open={userTypeDetailOpen} onOpenChange={setUserTypeDetailOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-[90vw] max-h-[90vh] bg-[#01223F] border-[#00BC6E]/40 text-white">
          <DialogHeader>
            <DialogTitle>Detalhes do Tipo de Usuário</DialogTitle>
            <DialogDescription className="text-white/70">
              Visualize as informações completas deste tipo de usuário, incluindo rentabilidade e condições associadas.
            </DialogDescription>
          </DialogHeader>

          {userTypeDetailLoading ? (
            <div className="flex items-center justify-center p-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00BC6E] border-t-transparent" />
              <span className="ml-2 text-white">Carregando detalhes...</span>
            </div>
          ) : !userTypeDetail ? (
            <div className="p-6 text-center text-white/70">
              Não foi possível carregar os detalhes do tipo de usuário.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[calc(90vh-7rem)] overflow-y-auto pr-1">
              {/* Coluna esquerda: Informações existentes */}
              <div className="space-y-6">
                {/* Informações básicas */}
                <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Informações Básicas</h3>
                <div className="rounded-md border border-[#00BC6E]/30 bg-[#003562] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">ID:</span>
                    <span className="text-sm font-medium text-white">{userTypeDetail.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Nome interno:</span>
                    <span className="text-sm font-medium text-white">{userTypeDetail.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Nome exibido:</span>
                    <span className="text-sm font-medium text-white">{userTypeDetail.display_name}</span>
                  </div>
                </div>
              </div>

              {/* Rentabilidade padrão */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Rentabilidade Padrão</h3>
                <div className="rounded-md border border-[#00BC6E]/30 bg-[#003562] p-4">
                  {userTypeDetail.rentability ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70">Título:</span>
                        <span className="text-sm font-medium text-white">{userTypeDetail.rentability.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70">Tipo:</span>
                        <span className="text-sm font-medium text-white">
                          {userTypeDetail.rentability.is_fixed ? "Fixa" : "Variável"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">Nenhuma rentabilidade associada.</p>
                  )}
                </div>
              </div>

              {/* Condições associadas */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  Condições Opcionais ({userTypeDetail.conditions.length})
                </h3>
                {userTypeDetail.conditions.length === 0 ? (
                  <div className="rounded-md border border-[#00BC6E]/30 bg-[#003562] p-4">
                    <p className="text-sm text-white/60">Nenhuma condição associada a este tipo de usuário.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userTypeDetail.conditions.map((condition) => (
                      <div
                        key={condition.id}
                        className="rounded-md border border-[#00BC6E]/30 bg-[#003562] p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{condition.description}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Código: {condition.code}</span>
                          <span className="text-white/60">
                            Rentabilidade: {condition.rentability ? condition.rentability.title : "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>

              {/* Coluna direita: Profiles com este user_type_id */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  Usuários associados ({userTypeProfiles.length})
                </h3>
                {isLoadingProfiles ? (
                  <div className="flex items-center justify-center p-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00BC6E] border-t-transparent" />
                    <span className="ml-2 text-white text-sm">Carregando usuários...</span>
                  </div>
                ) : userTypeProfiles.length === 0 ? (
                  <div className="rounded-md border border-[#00BC6E]/30 bg-[#003562] p-6 text-center">
                    <p className="text-sm text-white/60">Nenhum usuário associado a este tipo ainda.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-[#00BC6E]/30 bg-[#003562]">
                    <div className="max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-[#003562] z-10">
                          <TableRow className="border-white/10">
                            <TableHead className="text-white/80">Nome</TableHead>
                            <TableHead className="text-white/80">Email</TableHead>
                            <TableHead className="text-white/80">Data de criação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userTypeProfiles.map((profile) => (
                            <TableRow key={profile.id} className="border-white/10 hover:bg-[#01223F]">
                              <TableCell className="text-white/90">
                                {profile.full_name || "Sem nome"}
                              </TableCell>
                              <TableCell className="text-white/90 text-sm">{profile.email}</TableCell>
                              <TableCell className="text-white/70 text-xs">
                                {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="bg-transparent border-white/30 text-white hover:bg-white/10"
              onClick={() => setUserTypeDetailOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de criação de relações */}
      <Dialog open={isRelationDialogOpen} onOpenChange={setIsRelationDialogOpen}>
        <DialogContent className="bg-[#01223F] border-[#00BC6E]/40 text-white sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Criar Relações entre Tipos de Usuário</DialogTitle>
            <DialogDescription className="text-white/70 space-y-2">
              <p>Defina quais tipos de usuário podem criar outros tipos. Você pode adicionar múltiplas relações de uma vez.</p>
              <div className="mt-2 p-2 bg-[#003562]/50 rounded border border-[#00BC6E]/20">
                <p className="text-xs font-semibold text-white mb-1">Regras de hierarquia:</p>
                <ul className="text-xs text-white/80 space-y-0.5 list-disc list-inside">
                  <li>Distribuidores só podem criar Escritórios</li>
                  <li>Escritórios só podem criar Assessores</li>
                  <li>Assessores só podem criar Investidores</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRelations} className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Filtros globais */}
            <div className="flex-shrink-0 space-y-2 p-2 bg-[#001F2E]/50 rounded border border-white/10">
              <Label className="text-white/60 text-xs font-normal">Filtros</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs font-normal">Tipo Pai:</Label>
                  <select
                    value={parentFilter}
                    onChange={(e) => setParentFilter(e.target.value as "all" | "with_relation" | "without_relation")}
                    className="w-full rounded border border-white/20 bg-[#002A3A]/50 px-2 py-1.5 text-xs text-white/80 hover:border-white/30 focus:border-white/40 focus:outline-none"
                  >
                    <option value="all">TODOS</option>
                    <option value="with_relation">COM RELAÇÃO</option>
                    <option value="without_relation">SEM RELAÇÃO</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs font-normal">Tipo Filho (aplica a todos os pares):</Label>
                  <select
                    value={childFilters[0] || "all"}
                    onChange={(e) => {
                      const newFilters: Record<number, "all" | "with_relation" | "without_relation"> = {}
                      relationPairs.forEach((_, idx) => {
                        newFilters[idx] = e.target.value as "all" | "with_relation" | "without_relation"
                      })
                      setChildFilters(newFilters)
                    }}
                    className="w-full rounded border border-white/20 bg-[#002A3A]/50 px-2 py-1.5 text-xs text-white/80 hover:border-white/30 focus:border-white/40 focus:outline-none"
                  >
                    <option value="all">TODOS</option>
                    <option value="with_relation">COM RELAÇÃO</option>
                    <option value="without_relation">SEM RELAÇÃO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4">
              {relationPairs.map((pair, index) => {
                const childFilter = childFilters[index] || "all"
                return (
                  <div key={index} className="flex items-start gap-2 p-3 bg-[#003562]/50 rounded-md border border-[#00BC6E]/20">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`parent-${index}`} className="text-white text-sm">
                        Tipo Pai (quem pode criar)
                      </Label>
                      <select
                        id={`parent-${index}`}
                        value={pair.parent_user_type_id ?? ""}
                        onChange={(e) => updateRelationPair(index, 'parent_user_type_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white h-10"
                      >
                        <option value="">Selecione um tipo</option>
                        {getValidParentTypes(parentFilter).map((ut) => (
                          <option key={ut.id} value={ut.id}>
                            {ut.display_name} ({ut.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`child-${index}`} className="text-white text-sm">
                        Tipo Filho (o que pode ser criado)
                      </Label>
                      <select
                        id={`child-${index}`}
                        value={pair.child_user_type_id ?? ""}
                        onChange={(e) => updateRelationPair(index, 'child_user_type_id', e.target.value ? Number(e.target.value) : null)}
                        disabled={!pair.parent_user_type_id}
                        className="w-full rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed h-10"
                      >
                        <option value="">
                          {pair.parent_user_type_id ? "Selecione um tipo" : "Selecione primeiro o tipo pai"}
                        </option>
                        {getValidChildTypes(pair.parent_user_type_id, childFilter).map((ut) => (
                          <option key={ut.id} value={ut.id}>
                            {ut.display_name} ({ut.name})
                          </option>
                        ))}
                      </select>
                      {pair.parent_user_type_id && getValidChildTypes(pair.parent_user_type_id, childFilter).length === 0 && (
                        <p className="text-[11px] text-yellow-400 mt-1">
                          {childFilter === "with_relation" 
                            ? "Nenhum tipo com relação encontrado."
                            : childFilter === "without_relation"
                            ? "Todos os tipos já possuem relação."
                            : "Este tipo de usuário não pode criar outros tipos."}
                        </p>
                      )}
                    </div>
                    {relationPairs.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          removeRelationPair(index)
                          const newFilters = { ...childFilters }
                          delete newFilters[index]
                          setChildFilters(newFilters)
                        }}
                        className="bg-transparent border-red-500/60 text-red-400 hover:bg-red-500/20 hover:text-red-300 h-10 mt-6"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div className="flex-shrink-0 space-y-4 border-t border-white/10 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={addRelationPair}
                className="w-full bg-transparent border-[#00BC6E]/60 text-white hover:bg-[#00BC6E] hover:text-[#003F28]"
              >
                Adicionar outra relação
              </Button>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRelationDialogOpen(false)
                    setRelationPairs([{ parent_user_type_id: null, child_user_type_id: null }])
                    setParentFilter("all")
                    setChildFilters({})
                  }}
                  className="bg-transparent border-white/30 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingRelations}
                  className="bg-[#00BC6E] text-white hover:bg-[#00A85C]"
                >
                  {isSavingRelations ? "Salvando..." : "Salvar relações"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de associar usuários */}
      <Dialog open={isAssociateUsersDialogOpen} onOpenChange={(open) => {
        setIsAssociateUsersDialogOpen(open)
        if (!open) {
          // Resetar filtros ao fechar
          setSearchAssociateUsers("")
          setFilterAssociateUserTypeId("all")
          setFilterAssociateDistributor("all")
          setFilterAssociateAdvisor("all")
          setFilterAssociateOffice("all")
          setFilterWithoutAssociation(false)
        }
      }}>
        <DialogContent className="bg-[#01223F] border-[#00BC6E]/40 text-white sm:max-w-[1200px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Associar Tipos de Usuário</DialogTitle>
            <DialogDescription className="text-white/70">
              Selecione o tipo de usuário para cada profile. As alterações serão salvas ao clicar em "Salvar associações".
            </DialogDescription>
          </DialogHeader>

          {/* Filtros */}
          <div className="flex-shrink-0 space-y-3 p-3 bg-[#001F2E]/50 rounded border border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  type="text"
                  placeholder="Pesquisar por nome ou email..."
                  value={searchAssociateUsers}
                  onChange={(e) => setSearchAssociateUsers(e.target.value)}
                  className="pl-10 bg-[#003562] border-[#00BC6E]/40 text-white placeholder:text-white/40 h-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Label className="text-white/70 text-xs whitespace-nowrap">Tipo de Usuário:</Label>
                <select
                  value={filterAssociateUserTypeId}
                  onChange={(e) => setFilterAssociateUserTypeId(e.target.value)}
                  className="w-[200px] rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white h-9"
                >
                  <option value="all">Todos</option>
                  {userTypes.map((ut) => (
                    <option key={ut.id} value={ut.id.toString()}>
                      {ut.display_name} ({ut.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-white/70 text-xs whitespace-nowrap">Distribuidor:</Label>
                <select
                  value={filterAssociateDistributor}
                  onChange={(e) => setFilterAssociateDistributor(e.target.value)}
                  className="flex-1 rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white h-9"
                >
                  <option value="all">Todos</option>
                  {(() => {
                    // Buscar tipos de usuário que são distribuidores
                    const distributorUserTypes = userTypes.filter(ut => ut.user_type === "distributor")
                    const distributorUserTypeIds = new Set(distributorUserTypes.map(ut => ut.id))
                    
                    // Filtrar profiles que têm user_type_id correspondente a distribuidor
                    // Usar Set para garantir IDs únicos
                    const seenIds = new Set<string>()
                    const distributorMap = new Map<string, string>()
                    
                    allProfiles.forEach(p => {
                      if (p.user_type_id && distributorUserTypeIds.has(p.user_type_id) && !seenIds.has(p.id)) {
                        seenIds.add(p.id)
                        distributorMap.set(p.id, p.full_name || p.email || p.id)
                      }
                    })
                    
                    return Array.from(distributorMap.entries()).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))
                  })()}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-white/70 text-xs whitespace-nowrap">Assessor:</Label>
                <select
                  value={filterAssociateAdvisor}
                  onChange={(e) => setFilterAssociateAdvisor(e.target.value)}
                  className="flex-1 rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white h-9"
                >
                  <option value="all">Todos</option>
                  {(() => {
                    // Buscar tipos de usuário que são assessores
                    const advisorUserTypes = userTypes.filter(ut => ut.user_type === "advisor")
                    const advisorUserTypeIds = new Set(advisorUserTypes.map(ut => ut.id))
                    
                    // Filtrar profiles que têm user_type_id correspondente a assessor
                    // Usar Set para garantir IDs únicos
                    const seenIds = new Set<string>()
                    const advisorMap = new Map<string, string>()
                    
                    allProfiles.forEach(p => {
                      if (p.user_type_id && advisorUserTypeIds.has(p.user_type_id) && !seenIds.has(p.id)) {
                        seenIds.add(p.id)
                        advisorMap.set(p.id, p.full_name || p.email || p.id)
                      }
                    })
                    
                    return Array.from(advisorMap.entries()).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))
                  })()}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-white/70 text-xs whitespace-nowrap">Escritório:</Label>
                <select
                  value={filterAssociateOffice}
                  onChange={(e) => setFilterAssociateOffice(e.target.value)}
                  className="flex-1 rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white h-9"
                >
                  <option value="all">Todos</option>
                  {(() => {
                    // Buscar tipos de usuário que são escritórios
                    const officeUserTypes = userTypes.filter(ut => ut.user_type === "office")
                    const officeUserTypeIds = new Set(officeUserTypes.map(ut => ut.id))
                    
                    // Filtrar profiles que têm user_type_id correspondente a escritório
                    // Usar Set para garantir IDs únicos
                    const seenIds = new Set<string>()
                    const officeMap = new Map<string, string>()
                    
                    allProfiles.forEach(p => {
                      if (p.user_type_id && officeUserTypeIds.has(p.user_type_id) && !seenIds.has(p.id)) {
                        seenIds.add(p.id)
                        officeMap.set(p.id, p.full_name || p.email || p.id)
                      }
                    })
                    
                    return Array.from(officeMap.entries()).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))
                  })()}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="checkbox"
                  id="filter-without-association"
                  checked={filterWithoutAssociation}
                  onChange={(e) => setFilterWithoutAssociation(e.target.checked)}
                  className="w-4 h-4 rounded border-[#00BC6E]/40 bg-[#003562] text-[#00BC6E] focus:ring-[#00BC6E]"
                />
                <Label htmlFor="filter-without-association" className="text-white/70 text-xs cursor-pointer whitespace-nowrap">
                  Apenas sem associação
                </Label>
              </div>
            </div>
          </div>

          {isLoadingAllProfiles ? (
            <div className="flex items-center justify-center p-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00BC6E] border-t-transparent" />
              <span className="ml-2 text-white">Carregando usuários...</span>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="space-y-2">
                {(() => {
                  const filteredProfiles = allProfiles.filter((profile) => {
                    // Filtro de pesquisa
                    if (searchAssociateUsers) {
                      const search = searchAssociateUsers.toLowerCase()
                      if (
                        !profile.full_name?.toLowerCase().includes(search) &&
                        !profile.email.toLowerCase().includes(search)
                      ) {
                        return false
                      }
                    }
                    
                    // Filtro por tipo de usuário (user_type_id)
                    if (filterAssociateUserTypeId !== "all" && profile.user_type_id?.toString() !== filterAssociateUserTypeId) {
                      return false
                    }
                    
                    // Filtro por distribuidor
                    if (filterAssociateDistributor !== "all" && profile.distributor_id !== filterAssociateDistributor) {
                      return false
                    }
                    
                    // Filtro por assessor
                    if (filterAssociateAdvisor !== "all" && profile.parent_id !== filterAssociateAdvisor) {
                      return false
                    }
                    
                    // Filtro por escritório
                    if (filterAssociateOffice !== "all" && profile.office_id !== filterAssociateOffice) {
                      return false
                    }
                    
                    // Filtro sem associação
                    if (filterWithoutAssociation && profile.user_type_id !== null) {
                      return false
                    }
                    
                    return true
                  })
                  
                  return filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-4 p-3 bg-[#003562]/50 rounded-md border border-[#00BC6E]/20"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {profile.full_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-white/60 truncate">{profile.email}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {(() => {
                            // Identificar o tipo de usuário através do user_type_id
                            const userType = userTypes.find(ut => ut.id === profile.user_type_id)
                            const userTypeName = userType?.name || profile.user_type || ""
                            
                            // Investidor: exibe assessor, escritório, distribuidor
                            if (userTypeName === "investor" || userTypeName === "investor_padrao" || userTypeName.includes("investor")) {
                              return (
                                <>
                                  {profile.advisor_name && (
                                    <span className="text-xs text-white/50">
                                      Assessor: <span className="text-white/70">{profile.advisor_name}</span>
                                    </span>
                                  )}
                                  {profile.office_name && (
                                    <span className="text-xs text-white/50">
                                      Escritório: <span className="text-white/70">{profile.office_name}</span>
                                    </span>
                                  )}
                                  {profile.distributor_name && (
                                    <span className="text-xs text-white/50">
                                      Distribuidor: <span className="text-white/70">{profile.distributor_name}</span>
                                    </span>
                                  )}
                                </>
                              )
                            }
                            
                            // Assessor: exibe escritório, distribuidor
                            if (userTypeName === "advisor" || userTypeName.includes("advisor") || userTypeName.includes("assessor")) {
                              return (
                                <>
                                  {profile.office_name && (
                                    <span className="text-xs text-white/50">
                                      Escritório: <span className="text-white/70">{profile.office_name}</span>
                                    </span>
                                  )}
                                  {profile.distributor_name && (
                                    <span className="text-xs text-white/50">
                                      Distribuidor: <span className="text-white/70">{profile.distributor_name}</span>
                                    </span>
                                  )}
                                </>
                              )
                            }
                            
                            // Escritório: exibe distribuidor
                            if (userTypeName === "office" || userTypeName.includes("office") || userTypeName.includes("escritorio")) {
                              return (
                                <>
                                  {profile.distributor_name && (
                                    <span className="text-xs text-white/50">
                                      Distribuidor: <span className="text-white/70">{profile.distributor_name}</span>
                                    </span>
                                  )}
                                </>
                              )
                            }
                            
                            // Para outros tipos ou quando não há tipo definido, não exibe nada
                            return null
                          })()}
                        </div>
                      </div>
                      <div className="w-[250px] flex-shrink-0">
                        <select
                          value={userTypeAssignments[profile.id] ?? ""}
                          onChange={(e) => {
                            setUserTypeAssignments({
                              ...userTypeAssignments,
                              [profile.id]: e.target.value ? Number(e.target.value) : null,
                            })
                          }}
                          className="w-full rounded-md border border-[#00BC6E]/40 bg-[#003562] px-3 py-2 text-sm text-white"
                        >
                          <option value="">Sem tipo</option>
                          {userTypes.map((ut) => (
                            <option key={ut.id} value={ut.id}>
                              {ut.display_name} ({ut.name})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 border-t border-white/10 pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssociateUsersDialogOpen(false)}
              className="bg-transparent border-white/30 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveUserTypeAssignments}
              disabled={isSavingAssignments || isLoadingAllProfiles}
              className="bg-[#00BC6E] text-white hover:bg-[#00A85C]"
            >
              {isSavingAssignments ? "Salvando..." : "Salvar associações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edição de relações */}
      <Dialog open={isEditRelationDialogOpen} onOpenChange={setIsEditRelationDialogOpen}>
        <DialogContent className="bg-[#01223F] border-[#00BC6E]/40 text-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Relações</DialogTitle>
            <DialogDescription className="text-white/70">
              Selecione quais tipos de usuário podem ser criados por este tipo pai.
            </DialogDescription>
          </DialogHeader>
          {editingParentId && (() => {
            const parentType = userTypes.find(ut => ut.id === editingParentId)
            const validChildren = getValidChildTypes(editingParentId)
            
            return (
              <form onSubmit={handleUpdateRelations} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">
                    Tipo Pai: <span className="font-semibold">{parentType?.display_name || parentType?.name || editingParentId}</span>
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white text-sm">
                    Tipos Filhos (selecione os que podem ser criados):
                  </Label>
                  {validChildren.length === 0 ? (
                    <p className="text-sm text-yellow-400 p-3 bg-[#003562]/50 rounded border border-yellow-500/20">
                      Este tipo de usuário não pode criar outros tipos.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {validChildren.map((childType) => (
                        <div
                          key={childType.id}
                          className="flex items-center space-x-2 p-2 bg-[#003562]/50 rounded border border-[#00BC6E]/20 hover:bg-[#003562]"
                        >
                          <Checkbox
                            checked={selectedChildIds.includes(childType.id)}
                            onCheckedChange={(checked) => {
                              toggleChildSelection(childType.id)
                            }}
                            className="border-[#00BC6E]/40 data-[state=checked]:bg-[#00BC6E]"
                            id={`child-checkbox-${childType.id}`}
                          />
                          <Label 
                            htmlFor={`child-checkbox-${childType.id}`}
                            className="text-white cursor-pointer flex-1"
                          >
                            {childType.display_name} ({childType.name})
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditRelationDialogOpen(false)
                      setEditingParentId(null)
                      setSelectedChildIds([])
                    }}
                    className="bg-transparent border-white/30 text-white hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatingRelations || validChildren.length === 0}
                    className="bg-[#00BC6E] text-white hover:bg-[#00A85C]"
                  >
                    {isUpdatingRelations ? "Atualizando..." : "Atualizar relações"}
                  </Button>
                </DialogFooter>
              </form>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão de rentabilidade */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#01223F] border-[#00BC6E]/40 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir esta configuração de rentabilidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/30 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRentability}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  )
}


