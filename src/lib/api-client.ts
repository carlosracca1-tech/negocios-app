import { Project, Cost, Investor, ProjectAccess, TimelineEvent, User, Expense, ParsedReceipt } from "@/types";

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
    }>
  ): Promise<Cost> {
    return apiPatch(`/api/projects/${projectId}/costs/${costId}`, data);
  },

  async delete(projectId: string, costId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/costs/${costId}`);
  },
};

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
