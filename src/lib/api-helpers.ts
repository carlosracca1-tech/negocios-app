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
  /** Cuenta a la que pertenece. Nunca es null en un usuario operativo. */
  organizationId: string;
  /** Dueno del sistema: puede crear cuentas nuevas, no ve datos ajenos. */
  isSuperAdmin: boolean;
}

/**
 * Devuelve el usuario logueado, con su cuenta (organizationId).
 *
 * La organizacion se lee de la base y no del token: asi las sesiones que ya
 * estaban abiertas antes de la migracion tambien quedan bien atadas a su
 * cuenta, sin obligar a nadie a volver a entrar.
 *
 * Si el usuario no tiene organizacion devuelve null (queda sin acceso a todo).
 * Es a proposito: preferimos dejar a alguien afuera antes que mostrarle, por un
 * filtro que compara contra null, los datos de otra cuenta.
 */
export async function getCurrentUser(
  req?: NextRequest
): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      isSuperAdmin: true,
    },
  });

  if (!dbUser || !dbUser.organizationId) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organizationId: dbUser.organizationId,
    isSuperAdmin: dbUser.isSuperAdmin,
  };
}

/**
 * Filtro de cuenta para usar en cualquier consulta de Prisma sobre modelos que
 * tienen organizationId. Centralizarlo evita que se escape una consulta sin
 * filtrar.
 *
 *   where: { ...orgScope(user), status: "activo" }
 */
export function orgScope(user: AuthUser): { organizationId: string } {
  return { organizationId: user.organizationId };
}

/**
 * Busca un proyecto verificando que sea de la cuenta del usuario.
 * Devuelve null si no existe o si es de otra cuenta (para el usuario es lo
 * mismo: no existe).
 */
export async function findProjectInOrg(user: AuthUser, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
}

/**
 * Verifica que el usuario pertenezca a la misma cuenta que otro usuario.
 * Se usa antes de compartir un proyecto o vincular un inversor.
 */
export async function findUserInOrg(user: AuthUser, email: string) {
  return prisma.user.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      organizationId: user.organizationId,
    },
  });
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

  // Barrera de cuenta: pase lo que pase con los roles, un usuario nunca toca un
  // proyecto de otra organizacion. Este chequeo va PRIMERO, incluso antes del
  // admin, porque el admin es admin de su cuenta y de ninguna otra.
  if (!user.organizationId) return false;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project || project.organizationId !== user.organizationId) return false;

  // Admin has full access (dentro de su cuenta)
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

/** Avance físico por etapa de obra (0-100 cada una) — pantalla 2a */
export const etapasSchema = z.object({
  estructura: z.number().min(0).max(100).optional(),
  instalaciones: z.number().min(0).max(100).optional(),
  obraGruesa: z.number().min(0).max(100).optional(),
  terminaciones: z.number().min(0).max(100).optional(),
  exterior: z.number().min(0).max(100).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["activo", "pausado", "vendido"]).optional(),
  salePrice: z.number().positive().optional().nullable(),
  listingPrice: z.number().positive().optional().nullable(),
  address: z.string().optional().nullable(),
  saleDate: z.string().datetime().optional().nullable(),
  buyerName: z.string().optional().nullable(),
  etapas: etapasSchema.optional(),
  /** Estimación de lo que falta pagar para terminar la obra — pantalla 2a */
  costToFinish: z.number().min(0).optional().nullable(),
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
  /** Presupuesto (partida) al que se imputa el costo. Opcional. */
  partidaId: z.string().min(1).optional().nullable(),
});

export const updateCostSchema = z.object({
  concept: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.enum(allCategories).optional(),
  costType: z.enum(allCostTypes).optional(),
  date: z.string().datetime().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  exchangeRate: z.number().positive().optional().nullable(),
  partidaId: z.string().min(1).optional().nullable(),
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

// ============================================================================
// PRESUPUESTOS SCHEMAS
// ============================================================================

export const createPartidaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(allCategories, {
    errorMap: () => ({ message: "Invalid category" }),
  }),
  description: z.string().optional().nullable(),
  estimatedAmount: z.number().positive().optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
});

export const updatePartidaSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(allCategories).optional(),
  description: z.string().optional().nullable(),
  estimatedAmount: z.number().positive().optional().nullable(),
  status: z.enum(["pendiente", "elegida", "ejecutada"]).optional(),
  order: z.number().int().min(0).optional(),
});

const scopeItemSchema = z.object({
  label: z.string(),
  included: z.boolean(),
});

export const createCotizacionSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["ARS", "USD"]).optional().default("USD"),
  exchangeRate: z.number().positive().optional().nullable(),
  scopeItems: z.array(scopeItemSchema).optional().nullable(),
  leadTimeDays: z.number().int().positive().optional().nullable(),
  leadTimeText: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  validityDays: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
});

export const updateCotizacionSchema = z.object({
  provider: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  exchangeRate: z.number().positive().optional().nullable(),
  scopeItems: z.array(scopeItemSchema).optional().nullable(),
  leadTimeDays: z.number().int().positive().optional().nullable(),
  leadTimeText: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  validityDays: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
});
