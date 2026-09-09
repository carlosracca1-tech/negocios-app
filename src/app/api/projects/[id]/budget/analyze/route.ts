import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
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

/** Quita acentos y normaliza a minusculas para comparar categorias. */
function slug(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Sinonimos que la IA suele devolver aunque no esten en la lista valida.
 * Clave = valor canonico de la categoria; valores = como puede llamarla el modelo.
 */
const SINONIMOS_CATEGORIA: Record<string, string[]> = {
  Obra: [
    "instalaciones", "instalacion", "electricidad", "electrica", "electricista",
    "plomeria", "plomero", "sanitarios", "gas", "gasista", "albanileria",
    "mano de obra", "obra gruesa", "construccion", "hormigon", "revoques",
  ],
  Estructura: ["techo", "techos", "hierros", "hierro", "losa", "estructural", "carpinteria metalica"],
  Terminaciones: ["pisos", "piso", "pintura", "pintor", "revestimientos", "ceramicos", "durlock", "yeso", "carpinteria"],
  Equipamiento: ["electrodomesticos", "muebles", "amoblamiento", "cocina", "artefactos", "griferia"],
  Exterior: ["jardin", "parquizacion", "piscina", "pileta", "vereda", "paisajismo"],
  Profesionales: ["arquitecto", "ingeniero", "honorarios", "director de obra", "proyecto"],
  Servicios: ["luz", "agua", "servicio", "abono", "conexion", "medidor"],
  Documentacion: ["escritura", "planos", "habilitacion", "municipalidad", "tramite", "tramites", "impuestos"],
  Mecanica: ["mecanico", "frenos", "embrague", "service"],
  Motor: ["tren motriz", "caja", "transmision"],
  Carroceria: ["chapa", "chapa y pintura", "pintura"],
  Interior: ["tapizado", "tablero", "butacas"],
  Electronica: ["luces", "audio", "computadora", "sensores"],
  Neumaticos: ["cubiertas", "gomas", "suspension", "llantas", "tren delantero"],
};

/**
 * La IA a veces devuelve una categoria que no esta en la lista valida del proyecto
 * (ej: "Instalaciones"). Si eso llega al cliente, el <select> muestra la primera opcion
 * pero el POST manda el valor invalido y la API responde 422. Aca lo normalizamos.
 */
function normalizarCategoria(raw: unknown, validas: string[]): string {
  const fallback = validas[0] ?? "";
  if (!validas.length) return typeof raw === "string" ? raw : fallback;
  if (typeof raw !== "string" || !raw.trim()) return fallback;

  const objetivo = slug(raw);

  // 1) Coincidencia exacta (ignorando acentos y mayusculas).
  const exacta = validas.find((v) => slug(v) === objetivo);
  if (exacta) return exacta;

  // 2) Coincidencia por sinonimo conocido, solo si la categoria destino es valida.
  for (const [canonico, sinonimos] of Object.entries(SINONIMOS_CATEGORIA)) {
    const destino = validas.find((v) => slug(v) === slug(canonico));
    if (!destino) continue;
    if (sinonimos.some((s) => objetivo.includes(s) || s.includes(objetivo))) {
      return destino;
    }
  }

  // 3) Coincidencia parcial contra las validas ("terminacion" -> "Terminaciones").
  const parcial = validas.find(
    (v) => slug(v).includes(objetivo) || objetivo.includes(slug(v))
  );
  if (parcial) return parcial;

  console.warn(`[budget/analyze] categoria invalida de la IA: "${raw}" -> "${fallback}"`);
  return fallback;
}

/** Aplica la normalizacion sobre el JSON que devolvio la IA. */
function sanearParsed(parsed: any, validas: string[]) {
  if (parsed && typeof parsed === "object") {
    parsed.category = normalizarCategoria(parsed.category, validas);
  }
  return parsed;
}

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

    // checkProjectAccess ya deja pasar al admin de la cuenta duena del
    // proyecto. Antes esto estaba envuelto en `if (!isAdmin(user))`, y eso
    // hacia que el admin de OTRA cuenta se saltara el chequeo entero.
    const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured. Please add it to your .env file." },
        { status: 500 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: user.organizationId },
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
      return NextResponse.json({ data: sanearParsed(parsedText, validCategories) });
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
    return NextResponse.json({ data: sanearParsed(parsed, validCategories) });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error analyzing budget:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
