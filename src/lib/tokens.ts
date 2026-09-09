/**
 * Tokens de un solo uso para verificar el email y restablecer la contrasena.
 *
 * Regla: en la base se guarda SOLO el hash del token (SHA-256). El valor en
 * claro viaja unicamente dentro del mail. Asi, si alguien consigue leer la
 * base, no puede generar links validos ni tomar cuentas.
 */

import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

export const VERIFICACION_HORAS = 24;
export const RESET_MINUTOS = 60;

function hashear(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nuevoToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Crea un token de verificacion de email y devuelve el valor en claro. */
export async function crearTokenVerificacion(userId: string): Promise<string> {
  const token = nuevoToken();
  // Un token vigente por usuario: los anteriores se invalidan.
  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashear(token),
      expiresAt: new Date(Date.now() + VERIFICACION_HORAS * 60 * 60 * 1000),
    },
  });
  return token;
}

/** Crea un token de reset de contrasena y devuelve el valor en claro. */
export async function crearTokenReset(userId: string): Promise<string> {
  const token = nuevoToken();
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashear(token),
      expiresAt: new Date(Date.now() + RESET_MINUTOS * 60 * 1000),
    },
  });
  return token;
}

interface TokenValido {
  id: string;
  userId: string;
}

/** Devuelve el token si existe, no vencio y no se uso. Si no, null. */
export async function validarTokenVerificacion(token: string): Promise<TokenValido | null> {
  const fila = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashear(token) },
  });
  if (!fila || fila.usedAt || fila.expiresAt < new Date()) return null;
  return { id: fila.id, userId: fila.userId };
}

export async function validarTokenReset(token: string): Promise<TokenValido | null> {
  const fila = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashear(token) },
  });
  if (!fila || fila.usedAt || fila.expiresAt < new Date()) return null;
  return { id: fila.id, userId: fila.userId };
}
