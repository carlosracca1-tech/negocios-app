import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { prisma } from "@/lib/prisma";
import { categoriesByProjectType } from "@/lib/constants";

export const dynamic = "force-dynamic";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;

    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured. Please add it to your .env file." },
        { status: 500 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { type: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const validCategories = (categoriesByProjectType[project.type] || [])
      .map((c) => c.value);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    let mediaType = "image/jpeg";
    const name = file.name.toLowerCase();
    if (name.endsWith(".png")) mediaType = "image/png";
    else if (name.endsWith(".gif")) mediaType = "image/gif";
    else if (name.endsWith(".webp")) mediaType = "image/webp";
    else if (name.endsWith(".pdf")) mediaType = "application/pdf";

    const isPdf = mediaType === "application/pdf";

    const promptText = `Sos un experto en presupuestos de construccion/servicios argentinos. Analiza este documento (presupuesto/cotizacion de un proveedor) y extrae la informacion en formato JSON.

Categorias validas para este proyecto (tipo ${project.type}): ${validCategories.join(", ")}

Responde SOLO con este JSON, sin texto adicional ni markdown:
{
  "provider": "nombre del proveedor/empresa",
  "category": "una de: ${validCategories.join("|")}",
  "suggestedPartidaName": "nombre corto del rubro (ej: Techo y estructura, Pintura interior)",
  "amount": 0,
  "currency": "USD o ARS",
  "scopeItems": [{ "label": "descripcion del item", "included": true }],
  "leadTimeDays": null,
  "leadTimeText": "texto libre del tiempo de entrega o null",
  "paymentTerms": "condiciones de pago o null",
  "warranty": "garantia o null",
  "validityDays": null,
  "notes": "detalles relevantes adicionales o null"
}

IMPORTANTE:
- El monto debe ser un numero, no string.
- scopeItems: lista los items del alcance. Si algo esta excluido explicitamente, ponerlo con "included": false.
- Si no podes determinar un campo, pone null.
- Elegí la category que mejor encaje de las validas.`;

    const docContent = isPdf
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: mediaType, data: base64 },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mediaType, data: base64 },
        };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [docContent, { type: "text" as const, text: promptText }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", errBody);
      return NextResponse.json(
        { error: "Failed to analyze budget. Check your API key." },
        { status: 502 }
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ data: parsed });
    } catch {
      return NextResponse.json(
        { error: "Could not parse budget data", rawText: text },
        { status: 422 }
      );
    }
  } catch (error) {
    rethrowNextError(error);
    console.error("Error analyzing budget:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
