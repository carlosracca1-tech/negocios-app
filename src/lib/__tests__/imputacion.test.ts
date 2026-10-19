import { describe, it, expect } from "vitest";
import {
  normalizar,
  palabrasClave,
  señasDePartida,
  puntaje,
  tieneNumeroDeOrden,
  palabrasProveedorDelCosto,
  esCompraDeMateriales,
  numeroDePartida,
  planificarImputacion,
  type PartidaParaImputar,
  type CostoParaImputar,
} from "../imputacion";

// ============================================================================
// Helpers de texto
// ============================================================================

describe("normalizar()", () => {
  it("minusculas, sin acentos, sin puntuacion", () => {
    expect(normalizar("Albañil José #2")).toBe("albanil jose 2");
  });

  it("string vacio o null-ish", () => {
    expect(normalizar("")).toBe("");
    expect(normalizar(null as unknown as string)).toBe("");
  });

  it("colapsa espacios", () => {
    expect(normalizar("  Pago   mensual  ")).toBe("pago mensual");
  });
});

describe("palabrasClave()", () => {
  it("filtra palabras cortas y genéricas", () => {
    // "pago" (genérica), "del" (genérica), "mes" (genérica) → se van
    // "electricista" (11 letras, no genérica) → se queda
    expect(palabrasClave("Pago del mes electricista")).toEqual(["electricista"]);
  });

  it("excluye números puros y palabras genéricas", () => {
    // "factura" tiene 7 letras pero es genérica (está en PALABRAS_VACIAS)
    expect(palabrasClave("Factura 12345 plomero")).toEqual(["plomero"]);
  });
});

describe("tieneNumeroDeOrden()", () => {
  it("detecta #N", () => {
    expect(tieneNumeroDeOrden("Albañil #3 - semana")).toBe(true);
    expect(tieneNumeroDeOrden("Albañil # 3")).toBe(true);
  });

  it("no detecta sin #", () => {
    expect(tieneNumeroDeOrden("Albañil - semana 3")).toBe(false);
    expect(tieneNumeroDeOrden("")).toBe(false);
  });
});

describe("esCompraDeMateriales()", () => {
  it("detecta si arranca con 'Materiales' o 'Compra'", () => {
    expect(esCompraDeMateriales("Materiales PLOMERO #3")).toBe(true);
    expect(esCompraDeMateriales("Compra de ladrillos")).toBe(true);
    expect(esCompraDeMateriales("Corralon Martinez")).toBe(true);
  });

  it("no detecta si el proveedor va adelante", () => {
    expect(esCompraDeMateriales("Electricista #4 - Materiales")).toBe(false);
    expect(esCompraDeMateriales("Plomero #1 - compra de caños")).toBe(false);
  });
});

describe("palabrasProveedorDelCosto()", () => {
  it("toma lo que va antes del #", () => {
    expect(palabrasProveedorDelCosto("Carpinterias Aberturas #3 - Primer semana"))
      .toEqual(["carpinterias", "aberturas"]);
  });

  it("toma lo previo al guion si hay guion antes del #", () => {
    expect(palabrasProveedorDelCosto("Colocador - semana #3"))
      .toEqual(["colocador"]);
  });

  it("sin # devuelve palabras clave del concepto entero", () => {
    expect(palabrasProveedorDelCosto("Electricista general")).toEqual(["electricista", "general"]);
  });
});

describe("numeroDePartida()", () => {
  it("extrae el número después del #", () => {
    expect(numeroDePartida("Albañil #2 - revoques")).toBe(2);
    expect(numeroDePartida("Pintor #10")).toBe(10);
  });

  it("sin # devuelve MAX_SAFE_INTEGER", () => {
    expect(numeroDePartida("Albañil")).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("señasDePartida()", () => {
  it("extrae del nombre (antes del #)", () => {
    const p: PartidaParaImputar = {
      id: "p1",
      name: "Carpinterias Aberturas #1 - Interior",
      cotizaciones: [],
    };
    const señas = señasDePartida(p);
    expect(señas.length).toBeGreaterThanOrEqual(1);
    expect(señas[0]).toEqual(["carpinterias", "aberturas"]);
  });

  it("incluye nombres de proveedores de cotizaciones", () => {
    const p: PartidaParaImputar = {
      id: "p1",
      name: "Electricista #1",
      cotizaciones: [
        { provider: "Martinez Electricidad", amount: 5000, currency: "USD", isChosen: true },
      ],
    };
    const señas = señasDePartida(p);
    expect(señas.length).toBe(2); // nombre + proveedor
    expect(señas[1]).toEqual(["martinez", "electricidad"]);
  });
});

// ============================================================================
// puntaje()
// ============================================================================

describe("puntaje()", () => {
  it("match exacto con número de orden", () => {
    const señas = [["carpinterias", "aberturas"]];
    const concepto = "Carpinterias Aberturas #3 - Primer semana";
    const palabras = new Set(normalizar(concepto).split(" "));
    const r = puntaje(concepto, señas, palabras);
    expect(r.score).toBe(2);
  });

  it("sin coincidencia da 0", () => {
    const señas = [["plomero"]];
    const concepto = "Electricista #1 - Materiales";
    const palabras = new Set(normalizar(concepto).split(" "));
    const r = puntaje(concepto, señas, palabras);
    expect(r.score).toBe(0);
  });

  it("coincidencia parcial por proveedor", () => {
    const señas = [["aberturas"]];
    const concepto = "Aberturas de aluminio #2";
    const palabras = new Set(normalizar(concepto).split(" "));
    const r = puntaje(concepto, señas, palabras);
    expect(r.score).toBe(1);
  });
});

// ============================================================================
// planificarImputacion() — el orquestador
// ============================================================================

describe("planificarImputacion()", () => {
  it("imputa un costo a su único candidato", () => {
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Electricista #1 - Instalación",
        cotizaciones: [{ amount: 5000, currency: "USD", isChosen: true }],
      },
    ];
    const costos: CostoParaImputar[] = [
      { id: "c1", concept: "Electricista #1 - Primera semana", amount: 2000, currency: "USD", amountUsd: 2000 },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.imputar).toHaveLength(1);
    expect(plan.imputar[0].partidaId).toBe("p1");
    expect(plan.imputar[0].costId).toBe("c1");
    expect(plan.dejar).toHaveLength(0);
  });

  it("no toca costos ya imputados", () => {
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Electricista #1",
        cotizaciones: [{ amount: 5000, currency: "USD", isChosen: true }],
      },
    ];
    const costos: CostoParaImputar[] = [
      // Ya tiene partidaId → no se toca
      { id: "c1", concept: "Electricista #1 - pago", partidaId: "p1", amount: 2000, currency: "USD", amountUsd: 2000 },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.imputar).toHaveLength(0);
    expect(plan.dejar).toHaveLength(0);
  });

  it("deja sin imputar un costo sin coincidencia", () => {
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Electricista #1",
        cotizaciones: [{ amount: 5000, currency: "USD", isChosen: true }],
      },
    ];
    const costos: CostoParaImputar[] = [
      { id: "c1", concept: "Plomero semana 1", amount: 3000, currency: "USD", amountUsd: 3000 },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.imputar).toHaveLength(0);
    expect(plan.dejar).toHaveLength(1);
    expect(plan.dejar[0].motivo).toBe("sin_coincidencia");
  });

  it("cascada: mismo proveedor con dos presupuestos", () => {
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Albañil Juan #1 - Estructura",
        order: 1,
        cotizaciones: [{ amount: 3000, currency: "USD", isChosen: true }],
      },
      {
        id: "p2",
        name: "Albañil Juan #2 - Terminaciones",
        order: 2,
        cotizaciones: [{ amount: 4000, currency: "USD", isChosen: true }],
      },
    ];

    // c1 y c2 ya llenaron p1, c3 debería ir a p2 por cascada
    const costos: CostoParaImputar[] = [
      { id: "c1", concept: "Albañil Juan #1 - semana 1", partidaId: "p1", amount: 2000, currency: "USD", amountUsd: 2000, date: "2026-01-01" },
      { id: "c2", concept: "Albañil Juan #1 - semana 2", partidaId: "p1", amount: 1500, currency: "USD", amountUsd: 1500, date: "2026-01-08" },
      // Este no tiene partidaId, debería imputarse. p1 ya tiene 3500 (>3000 tope), así que va a p2
      { id: "c3", concept: "Albañil Juan #3 - semana 3", amount: 2000, currency: "USD", amountUsd: 2000, date: "2026-01-15" },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.imputar).toHaveLength(1);
    expect(plan.imputar[0].partidaId).toBe("p2");
    expect(plan.imputar[0].porCascada).toBe(true);
  });

  it("ambigüedad: proveedores distintos → no imputa", () => {
    // Para que sea ambiguo, el concepto debe matchear con las señas de ambas
    // partidas con el mismo score. Sin # se usa la regla estricta: TODAS las
    // palabras de la seña deben estar en el concepto.
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Martinez Construcciones",
        cotizaciones: [{ amount: 3000, currency: "USD", isChosen: true }],
      },
      {
        id: "p2",
        name: "Gonzalez Construcciones",
        cotizaciones: [{ amount: 2500, currency: "USD", isChosen: true }],
      },
    ];
    const costos: CostoParaImputar[] = [
      // Concepto que incluye TODAS las palabras clave de ambas señas
      { id: "c1", concept: "Martinez Gonzalez Construcciones sociedad", amount: 1000, currency: "USD", amountUsd: 1000 },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.imputar).toHaveLength(0);
    expect(plan.dejar).toHaveLength(1);
    expect(plan.dejar[0].motivo).toBe("ambiguo");
  });

  it("compra de materiales no se imputa", () => {
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Plomero #1",
        cotizaciones: [{ amount: 5000, currency: "USD", isChosen: true }],
      },
    ];
    const costos: CostoParaImputar[] = [
      { id: "c1", concept: "Materiales plomero - caños y accesorios", amount: 800, currency: "USD", amountUsd: 800 },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.imputar).toHaveLength(0);
    expect(plan.dejar).toHaveLength(1);
    expect(plan.dejar[0].motivo).toBe("compra_de_materiales");
  });

  it("resumen muestra lo nuevo por partida", () => {
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Electricista #1",
        cotizaciones: [{ amount: 5000, currency: "USD", isChosen: true }],
      },
    ];
    const costos: CostoParaImputar[] = [
      { id: "c1", concept: "Electricista #1 - avance", amount: 2000, currency: "USD", amountUsd: 2000 },
      { id: "c2", concept: "Electricista #1 - cierre", amount: 1500, currency: "USD", amountUsd: 1500 },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.resumen).toHaveLength(1);
    expect(plan.resumen[0].partidaId).toBe("p1");
    expect(plan.resumen[0].cantidadNueva).toBe(2);
    expect(plan.resumen[0].nuevo).toBe(3500);
    expect(plan.resumen[0].previo).toBe(0);
  });

  it("excede se marca en cascada cuando el presupuesto se supera", () => {
    // excede solo se marca en el path de cascada (ambiguos con mismo proveedor)
    const partidas: PartidaParaImputar[] = [
      {
        id: "p1",
        name: "Rodriguez Pintor #1",
        cotizaciones: [{ amount: 1000, currency: "USD", isChosen: true }],
      },
      {
        id: "p2",
        name: "Rodriguez Pintor #2",
        cotizaciones: [{ amount: 2000, currency: "USD", isChosen: true }],
      },
    ];
    const costos: CostoParaImputar[] = [
      // p1 ya lleno con 1200
      { id: "c1", concept: "Rodriguez Pintor #1 - avance", partidaId: "p1", amount: 1200, currency: "USD", amountUsd: 1200 },
      // Este va a p2 por cascada, y si lo llena...
      { id: "c2", concept: "Rodriguez Pintor #2 - cierre", amount: 2500, currency: "USD", amountUsd: 2500, date: "2026-02-01" },
    ];

    const plan = planificarImputacion(costos, partidas);

    expect(plan.imputar).toHaveLength(1);
    expect(plan.imputar[0].partidaId).toBe("p2");
    expect(plan.imputar[0].excede).toBe(true);
  });
});
