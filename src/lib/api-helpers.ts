import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { z } from "zod";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Get the authenticated user from the request
 */
export async function getCurrentUser(
  req?: NextRequest
): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const user = session.user as any;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "user",
  };
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

/**
 * Check if user has access to a project
 * Admin always has access. Non-admin must have ProjectAccess record.
 * If requiredRole is specified, check exact role match.
 */
export async function checkProjectAccess(
  userId: string,
  projectId: string,
  requiredRole?: "ver" | "interactuar"
): Promise<boolean> {
  // Get user to check if admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // Admin has full access
  if (user.role === "admin") return true;

  // Non-admin must have ProjectAccess record
  const access = await prisma.projectAccess.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!access) return false;

  // Check role if required
  if (requiredRole && access.role !== requiredRole) {
    return false;
  }

  return true;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  type: z.enum(["Casa", "Auto"], { errorMap: () => ({ message: "Invalid project type" }) }),
  buyPrice: z.number().positive("Buy price must be positive"),
  buyDate: z.string().datetime("Invalid date format"),
  salePrice: z.number().positive().optional().nullable(),
  listingPrice: z.number().positive().optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(["activo", "pausado", "vendido"]).optional().default("activo"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["activo", "pausado", "vendido"]).optional(),
  salePrice: z.number().positive().optional().nullable(),
  listingPrice: z.number().positive().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const createCostSchema = z.object({
  concept: z.string().min(1, "Concept is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(
    ["Obra", "Mecánica", "Estética", "Profesionales", "Servicios"],
    { errorMap: () => ({ message: "Invalid category" }) }
  ),
  costType: z.enum(["material", "mano_de_obra"], {
    errorMap: () => ({ message: "Invalid cost type" }),
  }),
  date: z.string().datetime("Invalid date format"),
});

export const updateCostSchema = z.object({
  concept: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z
    .enum(["Obra", "Mecánica", "Estética", "Profesionales", "Servicios"])
    .optional(),
  costType: z.enum(["material", "mano_de_obra"]).optional(),
  date: z.string().datetime().optional(),
});

export const addInvestorSchema = z.object({
  name: z.string().min(1, "Investor name is required"),
  percentage: z
    .number()
    .min(0, "Percentage must be >= 0")
    .max(100, "Percentage must be <= 100"),
});

export const grantAccessSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ver", "interactuar"], {
    errorMap: () => ({ message: "Invalid role" }),
  }),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).optional().default("user"),
});
