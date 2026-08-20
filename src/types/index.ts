export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "colaborador" | "vista";
  createdAt: Date;
  updatedAt: Date;
}

/** Avance físico por etapa de obra (0-100 cada una) — pantalla 2a */
export interface EtapasAvance {
  estructura?: number;
  instalaciones?: number;
  obraGruesa?: number;
  terminaciones?: number;
  exterior?: number;
}

export interface Project {
  id: string;
  name: string;
  type: "Casa" | "Auto";
  status: "activo" | "pausado" | "vendido";
  buyPrice: number;
  salePrice: number | null;
  /** Venta objetivo: precio al que apuntamos vender (etiqueta UI: "venta objetivo") */
  listingPrice: number | null;
  etapas?: EtapasAvance | null;
  /** Estimación manual de lo que falta pagar para terminar la obra (USD) */
  costToFinish?: number | null;
  address: string | null;
  buyDate: Date;
  saleDate?: Date | null;
  buyerName?: string | null;
  lastUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields from API
  totalCosts?: number;
  totalExpenses?: number;
  investment?: number;
  result?: number;
  margin?: number;
  estimatedMargin?: number;
  investorCount?: number;
  costCount?: number;
  costs?: Cost[];
  expenses?: Expense[];
  investors?: Investor[];
  access?: ProjectAccess[];
  timeline?: TimelineEvent[];
  partidas?: Partida[];
}

export interface Cost {
  id: string;
  projectId: string;
  concept: string;
  amount: number;
  currency?: "ARS" | "USD";
  exchangeRate?: number | null;
  amountUsd?: number | null;
  category: string;
  costType: string;
  date: Date;
  createdAt: Date;
  partidaId?: string | null;
}

export interface Investor {
  id: string;
  projectId: string;
  name: string;
  capitalPercentage: number;
  profitPercentage: number;
  amountInvested: number;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
}

export interface ProjectAccess {
  id: string;
  projectId: string;
  userId: string;
  role: "ver" | "interactuar";
  /** Populated when API includes user relation */
  user?: { id: string; name: string; email: string };
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  action: string;
  detail: string;
  date: Date;
}

export interface Expense {
  id: string;
  projectId: string;
  concept: string;
  amount: number;
  currency: "ARS" | "USD";
  exchangeRate: number | null;
  amountUsd: number | null;
  period: Date;
  paidDate: Date | null;
  paidByInvestorId?: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  projectId: string | null;
  read: boolean;
  createdAt: Date;
}

export interface ParsedReceipt {
  concept: string;
  amount: number;
  currency: "ARS" | "USD";
  period: string;
  paidDate: string | null;
  notes: string | null;
}

export interface ScopeItem {
  label: string;
  included: boolean;
}

export interface Cotizacion {
  id: string;
  partidaId: string;
  provider: string;
  amount: number;
  currency: "ARS" | "USD";
  exchangeRate: number | null;
  amountUsd: number | null;
  scopeItems: ScopeItem[] | null;
  leadTimeDays: number | null;
  leadTimeText: string | null;
  paymentTerms: string | null;
  warranty: string | null;
  validityDays: number | null;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  isChosen: boolean;
  aiRecommended: boolean;
  aiReasoning: string | null;
  createdAt: Date;
}

export interface Partida {
  id: string;
  projectId: string;
  name: string;
  category: string;
  description: string | null;
  estimatedAmount: number | null;
  status: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  cotizaciones?: Cotizacion[];
  costs?: Cost[];
}

export interface ParsedBudget {
  provider: string;
  category: string;
  suggestedPartidaName: string;
  amount: number;
  currency: "ARS" | "USD";
  scopeItems: ScopeItem[];
  leadTimeDays: number | null;
  leadTimeText: string | null;
  paymentTerms: string | null;
  warranty: string | null;
  validityDays: number | null;
  notes: string | null;
}

export interface AiRecommendation {
  recommendedCotizacionId: string;
  reasoning: string;
  savingsNote: string;
}

export interface BudgetRubro {
  partidaId: string;
  name: string;
  category: string;
  /** USD — referencia */
  projected: number;
  executed: number;
  deviation: number;
  pct: number;
  /** PESOS — moneda real del acuerdo con el proveedor */
  projectedArs: number;
  executedArs: number;
  deviationArs: number;
  pctArs: number;
  costCount: number;
}

export interface BudgetProjection {
  totalProjected: number;
  totalExecuted: number;
  deviation: number;
  byRubro: BudgetRubro[];
  totalProjectedArs: number;
  totalExecutedArs: number;
  deviationArs: number;
  pctArs: number;
  unassignedArs: number;
  unassignedUsd: number;
  unassignedCount: number;
}