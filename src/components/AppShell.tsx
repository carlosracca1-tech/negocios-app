"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

const NO_HEADER_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = !NO_HEADER_PATHS.some((p) => pathname.startsWith(p));

  return (
    <>
      {showHeader && <Header />}
      {children}
    </>
  );
}
