"use client";

import { SessionProvider } from "next-auth/react";
import { ProjectsProvider } from "@/contexts/ProjectsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProjectsProvider>
        {children}
      </ProjectsProvider>
    </SessionProvider>
  );
}
