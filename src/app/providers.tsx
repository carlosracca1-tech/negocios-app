"use client";

import { SessionProvider } from "next-auth/react";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import VerificationBanner from "@/components/VerificationBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ProjectsProvider>
          {/* Cartel de "falta verificar tu email": arriba de todo, en todas las
              pantallas, para las cuentas que todavia no confirmaron. */}
          <VerificationBanner />
          {children}
        </ProjectsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
