import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/dolar-blue
 * Obtiene la cotización actual del dólar blue (compra y venta)
 * y devuelve el promedio para usar como tipo de cambio.
 *
 * Fuentes (en orden de prioridad):
 * 1. dolarapi.com
 * 2. bluelytics.com.ar (fallback)
 */
export async function GET() {
  try {
    // Intentar con dolarapi.com primero
    try {
      const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
        next: { revalidate: 300 }, // Cache 5 minutos
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const compra = data.compra;
        const venta = data.venta;
        const promedio = Math.round((compra + venta) / 2);

        return NextResponse.json({
          compra,
          venta,
          promedio,
          source: "dolarapi.com",
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Fallback a bluelytics
    }

    // Fallback: bluelytics
    const res = await fetch("https://api.bluelytics.com.ar/v2/latest", {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const compra = data.blue.value_buy;
      const venta = data.blue.value_sell;
      const promedio = Math.round((compra + venta) / 2);

      return NextResponse.json({
        compra,
        venta,
        promedio,
        source: "bluelytics.com.ar",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "No se pudo obtener la cotización del dólar blue" },
      { status: 502 }
    );
  } catch (error) {
    console.error("Error fetching dolar blue:", error);
    return NextResponse.json(
      { error: "Error al obtener cotización" },
      { status: 500 }
    );
  }
}
