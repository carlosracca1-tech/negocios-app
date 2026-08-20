import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  checkProjectAccess,
  isAdmin,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import {
  AI_MODEL,
  describeAnthropicError,
  textoDeRespuesta,
  extraerJson,
  errorDeLectura,
  SYSTEM_JSON,
} from "@/lib/ai";

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
        model: AI_MODEL,
        max_tokens: 2048,
        system: SYSTEM_JSON,
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
      console.error("Anthropic API error (comprobante):", response.status, errBody);
      return NextResponse.json(
        { error: describeAnthropicError(response.status, errBody) },
        { status: 502 }
      );
    }

    const result = await response.json();
    const text = textoDeRespuesta(result);
    const parsed = extraerJson(text);

    if (!parsed) {
      console.error("Respuesta ilegible (comprobante):", result?.stop_reason, text);
      return NextResponse.json(
        { error: errorDeLectura(text, result?.stop_reason), rawText: text },
        { status: 422 }
      );
    }
    return NextResponse.json({ data: parsed });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error parsing receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
