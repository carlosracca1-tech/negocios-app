import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  checkProjectAccess,
  isAdmin,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Determine media type
    let mediaType = "image/jpeg";
    const name = file.name.toLowerCase();
    if (name.endsWith(".png")) mediaType = "image/png";
    else if (name.endsWith(".gif")) mediaType = "image/gif";
    else if (name.endsWith(".webp")) mediaType = "image/webp";
    else if (name.endsWith(".pdf")) mediaType = "application/pdf";

    // For PDFs, we use the document type; for images, we use image type
    const isPdf = mediaType === "application/pdf";

    const content = isPdf
      ? [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: `Analiza este comprobante/factura/boleta y extrae la siguiente información en formato JSON:
{
  "concept": "nombre del concepto o descripción del gasto (ej: Expensas, Seguro, Patente, Tasa Municipal)",
  "amount": número (monto total a pagar, sin símbolo de moneda),
  "currency": "ARS" o "USD",
  "period": "YYYY-MM-01" (el período/mes al que corresponde el gasto),
  "paidDate": "YYYY-MM-DD" o null (fecha de pago si aparece),
  "notes": "cualquier detalle relevante adicional"
}

IMPORTANTE:
- Si hay múltiples items, suma el total.
- El monto debe ser un número, no string.
- El periodo debe ser el primer día del mes al que corresponde.
- Responde SOLO con el JSON, sin texto adicional ni markdown.`,
          },
        ]
      : [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: `Analiza este comprobante/factura/boleta y extrae la siguiente información en formato JSON:
{
  "concept": "nombre del concepto o descripción del gasto (ej: Expensas, Seguro, Patente, Tasa Municipal)",
  "amount": número (monto total a pagar, sin símbolo de moneda),
  "currency": "ARS" o "USD",
  "period": "YYYY-MM-01" (el período/mes al que corresponde el gasto),
  "paidDate": "YYYY-MM-DD" o null (fecha de pago si aparece),
  "notes": "cualquier detalle relevante adicional"
}

IMPORTANTE:
- Si hay múltiples items, suma el total.
- El monto debe ser un número, no string.
- El periodo debe ser el primer día del mes al que corresponde.
- Responde SOLO con el JSON, sin texto adicional ni markdown.`,
          },
        ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", errBody);
      return NextResponse.json(
        { error: "Failed to analyze receipt. Check your API key." },
        { status: 502 }
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    // Try to parse the JSON from Claude's response
    try {
      // Remove possible markdown code fences
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ data: parsed });
    } catch {
      return NextResponse.json(
        { error: "Could not parse receipt data", rawText: text },
        { status: 422 }
      );
    }
  } catch (error) {
    rethrowNextError(error);
    console.error("Error parsing receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
