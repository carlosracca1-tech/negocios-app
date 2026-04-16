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

  return {
    id: session.user.id,
    email: session.user.email || "",
    name: session.user.name || "",
    role: session.user.role || "vista",
  };
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

/**
 * Check if user is admin or colaborador (can edit)
 */
export function canEdit(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.role === "colaborador";
}

/**
 * Check if user is admin (can manage access, capital, roles)
 */
export function canManage(user: AuthUser | null): boolean {
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
  saleDate: z.string().datetime().optional().nullable(),
  buyerName: z.string().optional().nullable(),
});

const allCategories = [
  "Obra", "Mecánica", "Estética", "Profesionales", "Servicios",
  "Estructura", "Terminaciones", "Equipamiento", "Exterior",
  "Motor", "Carrocería", "Interior", "Electrónica", "Neumáticos", "Documentación",
] as const;

const allCostTypes = ["material", "mano_de_obra", "servicio", "tramite", "repuesto"] as const;

export const createCostSchema = z.object({
  concept: z.string().min(1, "Concept is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(allCategories, {
    errorMap: () => ({ message: "Invalid category" }),
  }),
  costType: z.enum(allCostTypes, {
    errorMap: () => ({ message: "Invalid cost type" }),
  }),
  date: z.string().datetime("Invalid date format"),
  currency: z.enum(["ARS", "USD"]).optional().default("USD"),
  exchangeRate: z.number().positive().optional().nullable(),
});

export const updateCostSchema = z.object({
  concept: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.enum(allCategories).optional(),
  costType: z.enum(allCostTypes).optional(),
  date: z.string().datetime().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  exchangeRate: z.number().positive().optional().nullable(),
});

export const addInvestorSchema = z.object({
  name: z.string().min(1, "Investor name is required"),
  capitalPercentage: z.number().min(0).max(100),
  profitPercentage: z.number().min(0).max(100),
  amountInvested: z.number().min(0).optional().default(0),
  userId: z.string().optional().nullable(),
});

export const updateInvestorSchema = z.object({
  investorId: z.string().min(1, "investorId is required"),
  name: z.string().min(1).optional(),
  capitalPercentage: z.number().min(0).max(100).optional(),
  profitPercentage: z.number().min(0).max(100).optional(),
  amountInvested: z.number().min(0).optional(),
  userId: z.string().optional().nullable(),
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
  role: z.enum(["admin", "colaborador", "vista"]).optional().default("vista"),
});
