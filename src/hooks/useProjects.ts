"use client";

import { useState, useEffect, useCallback } from "react";
import { Project, Cost, TimelineEvent, ProjectAccess } from "@/types";
import { projectsApi, costsApi, timelineApi, accessApi, Alert, alertsApi } from "@/lib/api-client";

export interface ProjectDetail extends Project {
  costs?: Cost[];
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
      const [proj, costs, timeline, access] = await Promise.all([
        projectsApi.get(id),
        costsApi.list(id),
        timelineApi.list(id),
        accessApi.list(id),
      ]);
      setProject({ ...proj, costs, timeline, access });
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
