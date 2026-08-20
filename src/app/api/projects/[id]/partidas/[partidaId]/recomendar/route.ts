import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { AI_MODEL, describeAnthropicError } from "@/lib/ai";

export const dynamic = "force-dynamic";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; partidaId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, partidaId } = params;

    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured." },
        { status: 500 }
      );
    }

    const partida = await prisma.partida.findFirst({
      where: { id: partidaId, projectId },
      include: { cotizaciones: true },
    });
    if (!partida) {
      return NextResponse.json({ error: "Partida not found" }, { status: 404 });
    }

    if (partida.cotizaciones.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 cotizaciones para comparar" },
        { status: 422 }
      );
    }

    const cotData = partida.cotizaciones.map((c) => ({
      id: c.id,
      provider: c.provider,
      amount: c.amount,
      currency: c.currency,
      amountUsd: c.amountUsd,
      scopeItems: c.scopeItems,
      leadTimeDays: c.leadTimeDays,
      leadTimeText: c.leadTimeText,
      paymentTerms: c.paymentTerms,
      warranty: c.warranty,
      notes: c.notes,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Sos un asesor de construccion/compras argentino. Compara estas cotizaciones para el rubro "${partida.name}" (${partida.category}) y recomienda la mejor opcion.

Cotizaciones:
${JSON.stringify(cotData, null, 2)}

Compara: alcance (que incluye y que no), valores (normalizados a USD), tiempos de entrega, condiciones de pago, garantia, y costos ocultos (ej: una "barata" que no incluye mano de obra termina siendo la mas cara).

Responde SOLO con este JSON, sin texto adicional ni markdown:
{
  "recommendedCotizacionId": "el id de la cotizacion que recomendas",
  "reasoning": "explicacion corta y concreta en español rioplatense de por que esta es la mejor opcion, mencionando pros y contras de las otras",
  "savingsNote": "cuanto se ahorra o aviso vs otras opciones (ej: 'Ahorro de USD 3.200 vs la mas cara' o 'USD 1.500 mas pero incluye mano de obra')"
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error (recomendacion):", response.status, errBody);
      return NextResponse.json(
        { error: describeAnthropicError(response.status, errBody) },
        { status: 502 }
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Persist aiRecommended + aiReasoning
      await prisma.$transaction(async (tx) => {
        // Clear previous recommendations for this partida
        await tx.cotizacion.updateMany({
          where: { partidaId },
          data: { aiRecommended: false, aiReasoning: null },
        });

        // Set the recommended one
        if (parsed.recommendedCotizacionId) {
          await tx.cotizacion.update({
            where: { id: parsed.recommendedCotizacionId },
            data: {
              aiRecommended: true,
              aiReasoning: parsed.reasoning || null,
            },
          });
        }
      });

      return NextResponse.json({ data: parsed });
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI recommendation", rawText: text },
        { status: 422 }
      );
    }
  } catch (error) {
    rethrowNextError(error);
    console.error("Error getting recommendation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
