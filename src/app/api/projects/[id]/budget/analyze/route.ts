import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { prisma } from "@/lib/prisma";
import { categoriesByProjectType } from "@/lib/constants";
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
    const rawText = ((formData.get("text") as string | null) || "").trim();

    if (!file && !rawText) {
      return NextResponse.json(
        { error: "Mandá un archivo o describí el presupuesto en texto." },
        { status: 400 }
      );
    }

    if (!file && rawText.length > 4000) {
      return NextResponse.json(
        { error: "El texto es demasiado largo (máximo 4000 caracteres)." },
        { status: 400 }
      );
    }

    // Forma del JSON, compartida por los dos modos (documento y texto libre).
    const jsonShape = `{
  "provider": "nombre del proveedor/empresa",
  "category": "una de: ${validCategories.join("|")}",
  "suggestedPartidaName": "descripcion corta del trabajo, 2 a 5 palabras, SIN el nombre del proveedor (ej: Revoques y contrapisos)",
  "amount": 0,
  "currency": "ARS o USD",
  "scopeItems": [{ "label": "descripcion del item", "included": true }],
  "leadTimeDays": null,
  "leadTimeText": "texto libre del tiempo de entrega o null",
  "paymentTerms": "condiciones de pago o null",
  "warranty": "garantia o null",
  "validityDays": null,
  "notes": "detalles relevantes adicionales o null"
}`;

    // ======================= MODO TEXTO LIBRE =======================
    if (!file) {
      const textPrompt = `Sos un experto en presupuestos de obra en Argentina. El usuario te describe en lenguaje coloquial un presupuesto que le paso un proveedor. Extrae la informacion en JSON.

Texto del usuario:
<<<
${rawText}
>>>

Categorias validas para este proyecto (tipo ${project.type}): ${validCategories.join(", ")}

Responde SOLO con este JSON, sin texto adicional ni markdown:
${jsonShape}

IMPORTANTE:
- En Argentina los montos se dicen en PESOS por defecto. Usa currency "ARS" salvo que el texto diga explicitamente dolares, USD, u$s o verdes.
- FORMATO ARGENTINO: el punto es separador de MILES y la coma es decimal. "16.000.000" son dieciseis millones (16000000), NO dieciseis. "1.500.000" es 1500000. "1,5" es uno coma cinco.
- Expandi las abreviaturas de monto a numero entero: "16 millones" / "16M" / "16 palos" = 16000000. "500 mil" / "500k" = 500000. "1,5 millones" = 1500000.
- El monto que buscas es el TOTAL del presupuesto. Si el texto lista varios trabajos y despues dice un precio unico ("todo le cuesta X"), ese es el total.
- El texto puede venir desprolijo: sin puntuacion, con errores de tipeo, en varias lineas sueltas o copiado de un WhatsApp. Interpretalo igual, es como habla la gente de obra.
- Si el proveedor aclara que algo NO esta incluido o queda "a definir" (materiales, por ejemplo), agregalo a scopeItems con included: false.
- El monto debe ser un numero, no string, sin puntos ni comas.
- provider: el nombre del proveedor como lo nombra el usuario, prolijo y capitalizado (ej: "el albañil juan" -> "Albañil Juan").
- suggestedPartidaName: describi el trabajo. NUNCA incluyas el nombre del proveedor ni numeros de orden.
- scopeItems: un item por cada trabajo que menciona el usuario. Si dice que algo NO esta incluido, included: false.
- Si un dato no aparece en el texto, poné null. No inventes plazos, garantias ni condiciones de pago.`;

      const textResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          max_tokens: 4096,
          system: SYSTEM_JSON,
          messages: [
            { role: "user", content: [{ type: "text", text: textPrompt }] },
          ],
        }),
      });

      if (!textResponse.ok) {
        const errBody = await textResponse.text();
        console.error("Anthropic API error (texto):", textResponse.status, errBody);
        return NextResponse.json(
          { error: describeAnthropicError(textResponse.status, errBody) },
          { status: 502 }
        );
      }

      const textResult = await textResponse.json();
      const outText = textoDeRespuesta(textResult);
      const parsedText = extraerJson(outText);

      if (!parsedText) {
        console.error("Respuesta ilegible (texto):", textResult?.stop_reason, outText);
        return NextResponse.json(
          { error: errorDeLectura(outText, textResult?.stop_reason), rawText: outText },
          { status: 422 }
        );
      }
      return NextResponse.json({ data: parsedText });
    }

    // ==================== MODO DOCUMENTO (PDF / imagen) ====================
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
        model: AI_MODEL,
        max_tokens: 4096,
        system: SYSTEM_JSON,
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
      console.error("Anthropic API error:", response.status, errBody);
      return NextResponse.json(
        { error: describeAnthropicError(response.status, errBody) },
        { status: 502 }
      );
    }

    const result = await response.json();
    const text = textoDeRespuesta(result);
    const parsed = extraerJson(text);

    if (!parsed) {
      console.error("Respuesta ilegible (documento):", result?.stop_reason, text);
      return NextResponse.json(
        { error: errorDeLectura(text, result?.stop_reason), rawText: text },
        { status: 422 }
      );
    }
    return NextResponse.json({ data: parsed });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error analyzing budget:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
