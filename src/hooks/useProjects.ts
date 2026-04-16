"use client";

import { useState, useEffect, useCallback } from "react";
import { Project, Cost, Expense, TimelineEvent, ProjectAccess } from "@/types";
import { projectsApi, costsApi, expensesApi, timelineApi, accessApi, investorsApi, Alert, alertsApi } from "@/lib/api-client";

export interface ProjectDetail extends Project {
  costs?: Cost[];
  expenses?: Expense[];
  timeline?: TimelineEvent[];
  access?: ProjectAccess[];
}

// ============================================================================
// useProjects: Fetch and filter projects
// ============================================================================

export function useProjects(type?: string, status?: string, search?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.list(type, status, search);
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }, [type, status, search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { projects, loading, error, refetch: fetch };
}

// ============================================================================
// useProject: Fetch single project with all related data
// The main /api/projects/[id] endpoint already includes costs, investors,
// access, and timeline via Prisma includes. We use that as the primary source
// and only fetch sub-resources as fallbacks to avoid 403 errors from
// the access endpoint for non-admin users.
// ============================================================================

export function useProject(id: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      // The main project endpoint already returns costs, investors, access, timeline
      const proj = await projectsApi.get(id);

      // Use data from the main response directly
      // Only fetch sub-resources if they're missing from the main response
      let costs = proj.costs;
      let expenses = proj.expenses;
      let timeline = proj.timeline;
      let access = proj.access;

      // Fallback: fetch missing sub-resources individually (with error tolerance)
      const promises: Promise<void>[] = [];

      if (!costs) {
        promises.push(
          costsApi.list(id).then(data => { costs = data; }).catch(() => { costs = []; })
        );
      }
      if (!expenses) {
        promises.push(
          expensesApi.list(id).then(data => { expenses = data; }).catch(() => { expenses = []; })
        );
      }
      if (!timeline) {
        promises.push(
          timelineApi.list(id).then(data => { timeline = data; }).catch(() => { timeline = []; })
        );
      }
      if (!access) {
        promises.push(
          accessApi.list(id).then(data => { access = data; }).catch(() => { access = []; })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      setProject({ ...proj, costs: costs || [], expenses: expenses || [], timeline: timeline || [], access: access || [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { project, loading, error, refetch: fetch };
}

// ============================================================================
// useAlerts: Fetch alerts
// ============================================================================

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await alertsApi.list();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { alerts, loading, error, refetch: fetch };
}

// ============================================================================
// useCreateProject: Mutation to create project
// ============================================================================

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (data: Parameters<typeof projectsApi.create>[0]) => {
      try {
        setLoading(true);
        setError(null);
        const project = await projectsApi.create(data);
        return project;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create project";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useUpdateProject: Mutation to update project
// ============================================================================

export function useUpdateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (id: string, data: Parameters<typeof projectsApi.update>[1]) => {
      try {
        setLoading(true);
        setError(null);
        const project = await projectsApi.update(id, data);
        return project;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update project";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useCreateCost: Mutation to create cost
// ============================================================================

export function useCreateCost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, data: Parameters<typeof costsApi.create>[1]) => {
      try {
        setLoading(true);
        setError(null);
        const cost = await costsApi.create(projectId, data);
        return cost;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create cost";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useCreateExpense: Mutation to create expense
// ============================================================================

export function useCreateExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, data: Parameters<typeof expensesApi.create>[1]) => {
      try {
        setLoading(true);
        setError(null);
        const expense = await expensesApi.create(projectId, data);
        return expense;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create expense";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useParseReceipt: Mutation to parse receipt with AI
// ============================================================================

export function useParseReceipt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, file: File) => {
      try {
        setLoading(true);
        setError(null);
        const parsed = await expensesApi.parseReceipt(projectId, file);
        return parsed;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse receipt";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useGrantAccess: Mutation to grant access
// ============================================================================

export function useGrantAccess() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, data: Parameters<typeof accessApi.grant>[1]) => {
      try {
        setLoading(true);
        setError(null);
        const access = await accessApi.grant(projectId, data);
        return access;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to grant access";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useDeleteCost: Mutation to delete cost
// ============================================================================

export function useDeleteCost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, costId: string) => {
      try {
        setLoading(true);
        setError(null);
        await costsApi.delete(projectId, costId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete cost";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useUpdateCost: Mutation to update cost
// ============================================================================

export function useUpdateCost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, costId: string, data: Parameters<typeof costsApi.update>[2]) => {
      try {
        setLoading(true);
        setError(null);
        const cost = await costsApi.update(projectId, costId, data);
        return cost;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update cost";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useDeleteExpense: Mutation to delete expense
// ============================================================================

export function useDeleteExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, expenseId: string) => {
      try {
        setLoading(true);
        setError(null);
        await expensesApi.delete(projectId, expenseId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete expense";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useUpdateExpense: Mutation to update expense
// ============================================================================

export function useUpdateExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, expenseId: string, data: Parameters<typeof expensesApi.update>[2]) => {
      try {
        setLoading(true);
        setError(null);
        const expense = await expensesApi.update(projectId, expenseId, data);
        return expense;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update expense";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useAddInvestor: Mutation to add investor
// ============================================================================

export function useAddInvestor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, data: Parameters<typeof investorsApi.add>[1]) => {
      try {
        setLoading(true);
        setError(null);
        const investor = await investorsApi.add(projectId, data);
        return investor;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add investor";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useDeleteInvestor: Mutation to delete investor
// ============================================================================

export function useDeleteInvestor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, investorId: string) => {
      try {
        setLoading(true);
        setError(null);
        await investorsApi.delete(projectId, investorId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete investor";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useRevokeAccess: Mutation to revoke project access
// ============================================================================

export function useRevokeAccess() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (projectId: string, userId: string) => {
      try {
        setLoading(true);
        setError(null);
        await accessApi.revoke(projectId, userId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to revoke access";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

// ============================================================================
// useDeleteProject: Mutation to delete project
// ============================================================================

export function useDeleteProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        await projectsApi.delete(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete project";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}
