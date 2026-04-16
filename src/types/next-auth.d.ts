import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "colaborador" | "vista";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "admin" | "colaborador" | "vista";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "admin" | "colaborador" | "vista";
  }
}
