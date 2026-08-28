import { Project, Cost, Investor, ProjectAccess, TimelineEvent, User, Expense, ParsedReceipt, Partida, Cotizacion, ParsedBudget, AiRecommendation, BudgetProjection, EtapasAvance } from "@/types";

// ============================================================================
// BASE API HELPERS
// ============================================================================

/**
 * Unwrap API responses: our API wraps all responses in { data: ... }
 * This helper extracts the inner data automatically.
 */
function unwrap<T>(json: { data?: T } | T): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return unwrap<T>(json);
}

export async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return unwrap<T>(json);
}

export async function apiPatch<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API error: ${res.status}`);
  }
  const json = await res.json();
  return unwrap<T>(json);
}

export async function apiDelete(url: string, body?: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    ...(body && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API error: ${res.status}`);
  }
}

// ============================================================================
// PROJECTS API
// ============================================================================

export const projectsApi = {
  async list(type?: string, status?: string, search?: string): Promise<Project[]> {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (status) params.append("status", status);
    if (search) params.append("search", search);
    const query = params.toString();
    return apiGet(`/api/projects${query ? "?" + query : ""}`);
  },

  async get(id: string): Promise<Project> {
    return apiGet(`/api/projects/${id}`);
  },

  async create(data: {
    name: string;
    type: "Casa" | "Auto";
    buyPrice: number;
    buyDate: string;
    address?: string;
    salePrice?: number;
    listingPrice?: number;
    status?: string;
  }): Promise<Project> {
    return apiPost("/api/projects", data);
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      status: "activo" | "pausado" | "vendido";
      salePrice: number;
      listingPrice: number;
      address: string;
      etapas: EtapasAvance;
      costToFinish: number | null;
    }>
  ): Promise<Project> {
    return apiPatch(`/api/projects/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiDelete(`/api/projects/${id}`);
  },
};

// ============================================================================
// COSTS API
// ============================================================================

export const costsApi = {
  async list(projectId: string): Promise<Cost[]> {
    return apiGet(`/api/projects/${projectId}/costs`);
  },

  async create(
    projectId: string,
    data: {
      concept: string;
      amount: number;
      category: string;
      costType: string;
      date: string;
      currency?: "ARS" | "USD";
      exchangeRate?: number | null;
      partidaId?: string | null;
    }
  ): Promise<Cost> {
    return apiPost(`/api/projects/${projectId}/costs`, data);
  },

  async update(
    projectId: string,
    costId: string,
    data: Partial<{
      concept: string;
      amount: number;
      category: string;
      costType: string;
      date: string;
      currency: "ARS" | "USD";
      exchangeRate: number | null;
      partidaId: string | null;
    }>
  ): Promise<Cost> {
    return apiPatch(`/api/projects/${projectId}/costs/${costId}`, data);
  },

  async delete(projectId: string, costId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/costs/${costId}`);
  },

  /**
   * Imputa automáticamente los costos que no tienen presupuesto.
   * Con aplicar=false devuelve solo el plan, sin escribir nada.
   */
  async autoImputar(
    projectId: string,
    aplicar: boolean
  ): Promise<AutoImputarResultado> {
    return apiPost(`/api/projects/${projectId}/costs/auto-imputar`, { aplicar });
  },
};

export interface AutoImputarResultado {
  aplicado: boolean;
  sinPresupuestos: boolean;
  totalCostos: number;
  imputar: {
    costId: string;
    concept: string;
    partidaId: string;
    partidaName: string;
    porque: string[];
    monto: number;
    moneda: "ARS" | "USD";
    porCascada?: boolean;
    excede?: boolean;
  }[];
  dejar: {
    costId: string;
    concept: string;
    motivo: "sin_coincidencia" | "ambiguo" | "sin_monto" | "compra_de_materiales";
    candidatos?: string[];
  }[];
  resumen: {
    partidaId: string;
    partidaName: string;
    moneda: "ARS" | "USD";
    presupuesto: number;
    previo: number;
    nuevo: number;
    cantidadNueva: number;
  }[];
}

// ============================================================================
// INVESTORS API
// ============================================================================

export const investorsApi = {
  async list(projectId: string): Promise<Investor[]> {
    return apiGet(`/api/projects/${projectId}/investors`);
  },

  async add(
    projectId: string,
    data: {
      name: string;
      capitalPercentage: number;
      profitPercentage: number;
      amountInvested?: number;
      userId?: string | null;
    }
  ): Promise<Investor> {
    return apiPost(`/api/projects/${projectId}/investors`, data);
  },

  async update(
    projectId: string,
    investorId: string,
    data: Partial<{
      name: string;
      capitalPercentage: number;
      profitPercentage: number;
      amountInvested: number;
      userId: string | null;
    }>
  ): Promise<Investor> {
    return apiPatch(`/api/projects/${projectId}/investors/${investorId}`, data);
  },

  async delete(projectId: string, investorId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/investors/${investorId}`);
  },
};

// ============================================================================
// ACCESS API (sharing)
// ============================================================================

export const accessApi = {
  async list(projectId: string): Promise<ProjectAccess[]> {
    return apiGet(`/api/projects/${projectId}/access`);
  },

  async grant(
    projectId: string,
    data: {
      email: string;
      role: "ver" | "interactuar";
    }
  ): Promise<ProjectAccess> {
    return apiPost(`/api/projects/${projectId}/access`, data);
  },

  async revoke(projectId: string, userId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/access/${userId}`);
  },
};

// ============================================================================
// TIMELINE API
// ============================================================================

export const timelineApi = {
  async list(projectId: string): Promise<TimelineEvent[]> {
    return apiGet(`/api/projects/${projectId}/timeline`);
  },
};

// ============================================================================
// EXPENSES API
// ============================================================================

export const expensesApi = {
  async list(projectId: string): Promise<Expense[]> {
    return apiGet(`/api/projects/${projectId}/expenses`);
  },

  async create(
    projectId: string,
    data: {
      concept: string;
      amount: number;
      currency?: "ARS" | "USD";
      exchangeRate?: number | null;
      amountUsd?: number | null;
      period: string;
      paidDate?: string | null;
      receiptUrl?: string | null;
      receiptName?: string | null;
      notes?: string | null;
    }
  ): Promise<Expense> {
    return apiPost(`/api/projects/${projectId}/expenses`, data);
  },

  async update(
    projectId: string,
    expenseId: string,
    data: Partial<{
      concept: string;
      amount: number;
      currency: "ARS" | "USD";
      exchangeRate: number | null;
      period: string;
      paidDate: string | null;
      notes: string | null;
    }>
  ): Promise<Expense> {
    return apiPatch(`/api/projects/${projectId}/expenses/${expenseId}`, data);
  },

  async delete(projectId: string, expenseId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/expenses/${expenseId}`);
  },

  async parseReceipt(projectId: string, file: File): Promise<ParsedReceipt> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/projects/${projectId}/expenses/parse-receipt`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  },
};

// ============================================================================
// ALERTS API
// ============================================================================

export interface Alert {
  id: string;
  projectId: string;
  projectName?: string;
  type: "loss" | "high_costs" | "stale" | "low_margin";
  priority: number;
  message: string;
  color: string;
  data?: Record<string, string | number | Date>;
}

export const alertsApi = {
  async list(): Promise<Alert[]> {
    return apiGet("/api/alerts");
  },
};

// ============================================================================
// USERS API
// ============================================================================

// ============================================================================
// PARTIDAS API (Presupuestos)
// ============================================================================

export const partidasApi = {
  async list(projectId: string): Promise<Partida[]> {
    return apiGet(`/api/projects/${projectId}/partidas`);
  },

  async create(
    projectId: string,
    data: {
      name: string;
      category: string;
      description?: string | null;
      estimatedAmount?: number | null;
      order?: number;
    }
  ): Promise<Partida> {
    return apiPost(`/api/projects/${projectId}/partidas`, data);
  },

  async update(
    projectId: string,
    partidaId: string,
    data: Partial<{
      name: string;
      category: string;
      description: string | null;
      estimatedAmount: number | null;
      status: string;
      order: number;
    }>
  ): Promise<Partida> {
    return apiPatch(`/api/projects/${projectId}/partidas/${partidaId}`, data);
  },

  async delete(projectId: string, partidaId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/partidas/${partidaId}`);
  },
};

// ============================================================================
// COTIZACIONES API
// ============================================================================

export const cotizacionesApi = {
  async list(projectId: string, partidaId: string): Promise<Cotizacion[]> {
    return apiGet(`/api/projects/${projectId}/partidas/${partidaId}/cotizaciones`);
  },

  async create(
    projectId: string,
    partidaId: string,
    data: {
      provider: string;
      amount: number;
      currency?: "ARS" | "USD";
      exchangeRate?: number | null;
      scopeItems?: { label: string; included: boolean }[] | null;
      leadTimeDays?: number | null;
      leadTimeText?: string | null;
      paymentTerms?: string | null;
      warranty?: string | null;
      validityDays?: number | null;
      notes?: string | null;
      fileUrl?: string | null;
      fileName?: string | null;
    }
  ): Promise<Cotizacion> {
    return apiPost(`/api/projects/${projectId}/partidas/${partidaId}/cotizaciones`, data);
  },

  async update(
    projectId: string,
    partidaId: string,
    cotId: string,
    data: Partial<{
      provider: string;
      amount: number;
      currency: "ARS" | "USD";
      exchangeRate: number | null;
      scopeItems: { label: string; included: boolean }[] | null;
      leadTimeDays: number | null;
      leadTimeText: string | null;
      paymentTerms: string | null;
      warranty: string | null;
      validityDays: number | null;
      notes: string | null;
    }>
  ): Promise<Cotizacion> {
    return apiPatch(`/api/projects/${projectId}/partidas/${partidaId}/cotizaciones/${cotId}`, data);
  },

  async delete(projectId: string, partidaId: string, cotId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/partidas/${partidaId}/cotizaciones/${cotId}`);
  },

  async elegir(projectId: string, partidaId: string, cotId: string): Promise<Cotizacion> {
    return apiPost(`/api/projects/${projectId}/partidas/${partidaId}/cotizaciones/${cotId}/elegir`, {});
  },
};

// ============================================================================
// BUDGET API (Presupuestos IA + Projection)
// ============================================================================

export const budgetApi = {
  async analyze(projectId: string, file: File): Promise<ParsedBudget> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/projects/${projectId}/budget/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  },

  /** Igual que analyze() pero a partir de una descripción escrita a mano. */
  async analyzeText(projectId: string, text: string): Promise<ParsedBudget> {
    const formData = new FormData();
    formData.append("text", text);
    const res = await fetch(`/api/projects/${projectId}/budget/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  },

  async recomendar(projectId: string, partidaId: string): Promise<AiRecommendation> {
    return apiPost(`/api/projects/${projectId}/partidas/${partidaId}/recomendar`, {});
  },

  async getProjection(projectId: string): Promise<BudgetProjection> {
    return apiGet(`/api/projects/${projectId}/budget`);
  },
};

// ============================================================================
// USERS API
// ============================================================================

export const usersApi = {
  async current(): Promise<User> {
    return apiGet("/api/users/me");
  },

  async updateProfile(data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<User> {
    return apiPatch("/api/users/me", data);
  },

  async list(): Promise<User[]> {
    return apiGet("/api/users");
  },

  async updateRole(userId: string, role: "admin" | "colaborador" | "vista"): Promise<User> {
    return apiPatch("/api/users", { userId, role });
  },
};
