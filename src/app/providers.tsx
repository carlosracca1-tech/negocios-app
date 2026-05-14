"use client";

import { SessionProvider } from "next-auth/react";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ProjectsProvider>
          {children}
        </ProjectsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
