"use client";

import { createContext, useContext, ReactNode } from "react";
import { Project } from "@/types";
import { useProjects as useProjectsHook, useAlerts } from "@/hooks/useProjects";
import { Alert } from "@/lib/api-client";

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  alerts: Alert[];
  alertsLoading: boolean;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { projects, loading, error, refetch } = useProjectsHook();
  const { alerts, loading: alertsLoading } = useAlerts();

  return (
    <ProjectsContext.Provider
      value={{ projects, loading, error, refetch, alerts, alertsLoading }}
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
