"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Project } from "@/types";
import { projectsApi, Alert, alertsApi } from "@/lib/api-client";

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  alerts: Alert[];
  alertsLoading: boolean;
  refetchAll: () => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasData = useRef(false);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!authenticated) return;
    const isRefresh = hasData.current;
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const data = await projectsApi.list();
      setProjects(data);
      hasData.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  const fetchAlerts = useCallback(async () => {
    if (!authenticated) return;
    try {
      setAlertsLoading(true);
      const data = await alertsApi.list();
      setAlerts(data);
    } catch {
      // silencioso
    } finally {
      setAlertsLoading(false);
    }
  }, [authenticated]);

  // Pide datos cuando la sesión cambia a authenticated
  useEffect(() => {
    if (authenticated) {
      fetchProjects();
      fetchAlerts();
    } else {
      // Sin sesión: limpiar
      setProjects([]);
      setAlerts([]);
      setLoading(false);
      setAlertsLoading(false);
      hasData.current = false;
    }
  }, [authenticated, fetchProjects, fetchAlerts]);

  const refetchAll = useCallback(() => {
    fetchProjects();
    fetchAlerts();
  }, [fetchProjects, fetchAlerts]);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading: !authenticated ? false : loading,
        error,
        refetch: fetchProjects,
        alerts,
        alertsLoading,
        refetchAll,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

/**
 * Use this hook to access the shared projects list.
 * Must be used within a ProjectsProvider.
 */
export function useSharedProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useSharedProjects must be used within a ProjectsProvider");
  }
  return ctx;
}
