"use client";

import { SessionProvider } from "next-auth/react";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import VerificationBanner from "@/components/VerificationBanner";
import AppShell from "@/components/AppShell";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ProjectsProvider>
          <VerificationBanner />
          <AppShell>
            {children}
          </AppShell>
        </ProjectsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
