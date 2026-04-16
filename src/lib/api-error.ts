import { NextResponse } from "next/server";

/**
 * Centralized error handler for API routes.
 * Logs context + error, returns generic 500.
 */
export function handleApiError(error: unknown, context: string) {
  // Log con contexto para debugging
  console.error(`[API Error] ${context}:`, error instanceof Error ? error.message : error);

  // No exponer detalles internos al cliente
  return NextResponse.json(
    { error: "Error interno del servidor" },
    { status: 500 }
  );
}
