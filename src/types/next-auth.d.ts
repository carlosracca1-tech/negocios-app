import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "colaborador" | "vista";
      /** Cuenta a la que pertenece el usuario. */
      organizationId: string | null;
      /** Dueno del sistema: puede crear cuentas nuevas. */
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "admin" | "colaborador" | "vista";
    organizationId?: string | null;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "admin" | "colaborador" | "vista";
    organizationId?: string | null;
    isSuperAdmin?: boolean;
  }
}
