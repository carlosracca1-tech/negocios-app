import { Project, Cost, Investor, ProjectAccess, TimelineEvent, User } from "@/types";

// ============================================================================
// BASE API HELPERS
// ============================================================================

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(url: string, body?: any): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    ...(body && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${res.status}`);
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
      category: "Obra" | "Mecánica" | "Estética" | "Profesionales" | "Servicios";
      costType: "material" | "mano_de_obra";
      date: string;
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
      category: "Obra" | "Mecánica" | "Estética" | "Profesionales" | "Servicios";
      costType: "material" | "mano_de_obra";
      date: string;
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
      percentage: number;
    }
  ): Promise<Investor> {
    return apiPost(`/api/projects/${projectId}/investors`, data);
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

  async revoke(projectId: string, accessId: string): Promise<void> {
    return apiDelete(`/api/projects/${projectId}/access/${accessId}`);
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
// ALERTS API
// ============================================================================

export interface Alert {
  id: string;
  projectId: string;
  type: "loss" | "high_costs" | "stale";
  priority: number;
  message: string;
  color: string;
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
};
