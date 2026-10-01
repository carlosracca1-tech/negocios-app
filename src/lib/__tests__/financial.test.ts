import { describe, it, expect } from "vitest";
import {
  safe,
  margenSobreInversion,
  computeProjectFinancials,
  computeBudgetProjection,
  computeObraProyeccion,
  computeAvancePonderado,
  computeRitmoObra,
  computeHoldingMetrics,
  semaforoMargen,
  cotizacionUsd,
  costUsd,
  ETAPAS_PESOS,
} from "../financial";

// ============================================================================
// safe()
// ============================================================================

describe("safe()", () => {
  it("devuelve 0 para null, undefined, NaN, Infinity", () => {
    expect(safe(null)).toBe(0);
    expect(safe(undefined)).toBe(0);
    expect(safe(NaN)).toBe(0);
    expect(safe(Infinity)).toBe(0);
    expect(safe(-Infinity)).toBe(0);
  });

  it("devuelve el número cuando es válido", () => {
    expect(safe(42)).toBe(42);
    expect(safe(-5.5)).toBe(-5.5);
    expect(safe(0)).toBe(0);
  });
});

// ============================================================================
// margenSobreInversion()
// ============================================================================

describe("margenSobreInversion()", () => {
  it("Golfers 3610: venta 290.000, inversión 270.419,28 → 7,24%", () => {
    const ganancia = 290000 - 270419.28;
    expect(margenSobreInversion(ganancia, 270419.28)).toBeCloseTo(7.24, 1);
  });

  it("Golfers 1614: publicación 430.000, inversión 318.271,16 → 35,10%", () => {
    const ganancia = 430000 - 318271.16;
    expect(margenSobreInversion(ganancia, 318271.16)).toBeCloseTo(35.10, 1);
  });

  it("inversión 0 → devuelve 0", () => {
    expect(margenSobreInversion(50000, 0)).toBe(0);
  });

  it("ganancia negativa → margen negativo", () => {
    expect(margenSobreInversion(-10000, 100000)).toBe(-10);
  });
});

// ============================================================================
// computeProjectFinancials()
// ============================================================================

describe("computeProjectFinancials()", () => {
  it("casa con costos en ARS y USD", () => {
    const project = { buyPrice: 100000, salePrice: null, listingPrice: 300000 };
    const costs = [
      { amount: 5000, currency: "USD", amountUsd: 5000 },
      { amount: 2000000, currency: "ARS", amountUsd: 1666.67 },
      { amount: 3000, currency: "USD", amountUsd: 3000 },
    ];
    const expenses = [
      { amount: 50000, currency: "ARS", amountUsd: 38.46 },
      { amount: 500, currency: "USD", amountUsd: 500 },
    ];

    const r = computeProjectFinancials(project, costs, expenses);

    expect(r.totalCosts).toBeCloseTo(9666.67, 1);
    expect(r.totalExpenses).toBeCloseTo(538.46, 1);
    expect(r.investment).toBeCloseTo(110205.13, 0);
    // Sin venta → resultado 0
    expect(r.result).toBe(0);
    expect(r.margin).toBe(0);
    // Margen estimado sobre inversión: (300k - 110205.13) / 110205.13 × 100 ≈ 172.2%
    expect(r.estimatedMargin).toBeCloseTo(172.2, 0);
  });

  it("auto vendido con pérdida", () => {
    const project = { buyPrice: 15000, salePrice: 20000, listingPrice: null };
    const costs = [{ amount: 8000, currency: "USD" }];
    const expenses = [{ amount: 4000, currency: "USD" }];

    const r = computeProjectFinancials(project, costs, expenses);

    expect(r.investment).toBe(27000);
    expect(r.result).toBe(-7000);
    // Margen sobre inversión: -7000 / 27000 × 100 ≈ -25.93%
    expect(r.margin).toBeCloseTo(-25.93, 1);
  });

  it("proyecto sin venta ni listingPrice", () => {
    const project = { buyPrice: 200000, salePrice: null, listingPrice: null };
    const costs = [{ amount: 50000, currency: "USD" }];

    const r = computeProjectFinancials(project, costs);

    expect(r.investment).toBe(250000);
    expect(r.result).toBe(0);
    expect(r.margin).toBe(0);
    expect(r.estimatedMargin).toBe(0);
  });

  it("costo ARS sin amountUsd usa amount directo (fallback defensivo)", () => {
    const project = { buyPrice: 100000, salePrice: null, listingPrice: null };
    // Costo viejo: currency ARS pero sin amountUsd → usa amount (que está en ARS)
    // Esto es un caso legacy, el número será incorrecto pero no debe romper
    const costs = [{ amount: 500000, currency: "ARS", amountUsd: null }];

    const r = computeProjectFinancials(project, costs);

    // Sin amountUsd, cae al else → usa amount directo (500000)
    expect(r.totalCosts).toBe(500000);
  });

  it("margen se calcula sobre inversión, no sobre venta", () => {
    // inversión 200k, venta 250k → resultado 50k
    // sobre inversión: 50k/200k = 25%
    const project = { buyPrice: 200000, salePrice: 250000, listingPrice: null };
    const r = computeProjectFinancials(project, []);
    expect(r.result).toBe(50000);
    expect(r.margin).toBeCloseTo(25, 1); // 50k/200k = 25% (sobre inversión)
  });

  it("margen estimado se calcula sobre inversión", () => {
    // inversión 200k, listingPrice 250k
    // (250k-200k)/200k = 25%
    const project = { buyPrice: 200000, salePrice: null, listingPrice: 250000 };
    const r = computeProjectFinancials(project, []);
    expect(r.estimatedMargin).toBeCloseTo(25, 1);
  });

  it("expenses undefined → totalExpenses es 0", () => {
    const project = { buyPrice: 100000, salePrice: null, listingPrice: null };
    const costs = [{ amount: 5000, currency: "USD" }];

    const r = computeProjectFinancials(project, costs);

    expect(r.totalExpenses).toBe(0);
    expect(r.investment).toBe(105000);
  });
});

// ============================================================================
// computeAvancePonderado()
// ============================================================================

describe("computeAvancePonderado()", () => {
  it("devuelve 0 para null/undefined", () => {
    expect(computeAvancePonderado(null)).toBe(0);
    expect(computeAvancePonderado(undefined)).toBe(0);
  });

  it("calcula ponderado correctamente", () => {
    // estructura:100 → 15, instalaciones:50 → 6, resto 0
    const etapas = { estructura: 100, instalaciones: 50, obraGruesa: 0, terminaciones: 0, exterior: 0 };
    expect(computeAvancePonderado(etapas)).toBe(21);
  });

  it("todo al 100% da 100", () => {
    const etapas = { estructura: 100, instalaciones: 100, obraGruesa: 100, terminaciones: 100, exterior: 100 };
    expect(computeAvancePonderado(etapas)).toBe(100);
  });

  it("clampea valores fuera de rango", () => {
    const etapas = { estructura: 150, instalaciones: -10 };
    const resultado = computeAvancePonderado(etapas);
    // estructura: min(100, max(0, 150)) = 100 → 15
    // instalaciones: min(100, max(0, -10)) = 0 → 0
    expect(resultado).toBe(15);
  });

  it("pesos suman 100", () => {
    const total = Object.values(ETAPAS_PESOS).reduce((s, v) => s + v, 0);
    expect(total).toBe(100);
  });
});

// ============================================================================
// semaforoMargen()
// ============================================================================

describe("semaforoMargen()", () => {
  it("verde >= 15%", () => expect(semaforoMargen(15)).toBe("verde"));
  it("verde > 15%", () => expect(semaforoMargen(25)).toBe("verde"));
  it("ambar >= 10%", () => expect(semaforoMargen(10)).toBe("ambar"));
  it("ambar entre 10 y 15", () => expect(semaforoMargen(12)).toBe("ambar"));
  it("rojo < 10%", () => expect(semaforoMargen(9.9)).toBe("rojo"));
  it("rojo negativo", () => expect(semaforoMargen(-5)).toBe("rojo"));
});

// ============================================================================
// computeBudgetProjection()
// ============================================================================

describe("computeBudgetProjection()", () => {
  it("3 partidas con costos imputados", () => {
    const partidas = [
      {
        id: "p1", name: "Albañil", category: "Obra",
        cotizaciones: [{ amount: 5000, currency: "USD", isChosen: true }],
      },
      {
        id: "p2", name: "Electricista", category: "Obra",
        cotizaciones: [{ amount: 3000, currency: "USD", isChosen: true }],
      },
      {
        id: "p3", name: "Pintor", category: "Terminaciones",
        estimatedAmount: 2000,
        cotizaciones: [],
      },
    ];
    const costs = [
      { amount: 4000, currency: "USD", amountUsd: 4000, partidaId: "p1" },
      { amount: 3500, currency: "USD", amountUsd: 3500, partidaId: "p2" },
      // Costo sin imputar
      { amount: 1000, currency: "USD", amountUsd: 1000, partidaId: null },
    ];

    const r = computeBudgetProjection(partidas, costs);

    expect(r.totalProjected).toBe(10000); // 5000+3000+2000
    expect(r.totalExecuted).toBe(7500); // 4000+3500 (sin el huérfano)
    expect(r.deviation).toBe(2500);

    // Rubro excedido: electricista 3500 > 3000
    const elec = r.byRubro.find((b) => b.partidaId === "p2")!;
    expect(elec.executed).toBe(3500);
    expect(elec.deviation).toBe(-500);

    // Huérfanos
    expect(r.unassignedCount).toBe(1);
    expect(r.unassignedUsd).toBe(1000);
  });

  it("partida sin cotizaciones ni estimado → projected 0", () => {
    const partidas = [{ id: "p1", name: "X", category: "Obra" }];
    const costs: any[] = [];

    const r = computeBudgetProjection(partidas, costs);
    expect(r.byRubro[0].projected).toBe(0);
  });

  it("partida con cotización elegida en ARS y costos en ARS", () => {
    const partidas = [
      {
        id: "p1", name: "Albañil", category: "Obra",
        cotizaciones: [
          { amount: 3000000, currency: "ARS", exchangeRate: 1200, amountUsd: 2500, isChosen: true },
        ],
      },
    ];
    const costs = [
      { amount: 1500000, currency: "ARS", exchangeRate: 1200, amountUsd: 1250, partidaId: "p1" },
    ];

    const r = computeBudgetProjection(partidas, costs);

    expect(r.byRubro[0].projectedArs).toBe(3000000);
    expect(r.byRubro[0].executedArs).toBe(1500000);
    expect(r.byRubro[0].pctArs).toBeCloseTo(50, 1);
  });

  it("cotización no elegida → usa la menor en USD", () => {
    const partidas = [
      {
        id: "p1", name: "Pintor", category: "Terminaciones",
        cotizaciones: [
          { amount: 3000, currency: "USD", isChosen: false },
          { amount: 2000, currency: "USD", isChosen: false },
          { amount: 4000, currency: "USD", isChosen: false },
        ],
      },
    ];
    const costs: any[] = [];

    const r = computeBudgetProjection(partidas, costs);

    expect(r.byRubro[0].projected).toBe(2000); // min
  });

  it("sin partidas → totales en 0, todos los costos son huérfanos", () => {
    const partidas: any[] = [];
    const costs = [
      { amount: 5000, currency: "USD", amountUsd: 5000, partidaId: null },
    ];

    const r = computeBudgetProjection(partidas, costs);

    expect(r.totalProjected).toBe(0);
    expect(r.totalExecuted).toBe(0);
    expect(r.unassignedCount).toBe(1);
    expect(r.unassignedUsd).toBe(5000);
  });
});

// ============================================================================
// computeObraProyeccion()
// ============================================================================

describe("computeObraProyeccion()", () => {
  it("proyección básica con presupuesto por rubro", () => {
    const r = computeObraProyeccion({
      buyPrice: 100000,
      totalCosts: 20000,
      totalExpenses: 5000,
      ventaReferencia: 200000,
      partidas: [
        { id: "p1", name: "A", category: "Obra", cotizaciones: [{ amount: 30000, currency: "USD", isChosen: true }] },
      ],
      costs: [
        { amount: 20000, currency: "USD", amountUsd: 20000, partidaId: "p1" },
      ],
    });

    // inversionActual = 100k + 20k + 5k = 125k
    expect(r.inversionActual).toBe(125000);
    // presupuestoRestante = max(0, 30k - 20k) = 10k
    expect(r.presupuestoRestante).toBe(10000);
    // cierreEstimado = 125k + 10k = 135k
    expect(r.cierreEstimado).toBe(135000);
    // ganancia = 200k - 135k = 65k
    expect(r.ganancia).toBe(65000);
    // margenProyectado = 65k / 135k × 100 ≈ 48.15% (sobre inversión)
    expect(r.margenProyectado).toBeCloseTo(48.15, 0);
    expect(r.semaforo).toBe("verde");
  });

  it("costToFinish manual tiene prioridad sobre presupuesto por rubro", () => {
    const r = computeObraProyeccion({
      buyPrice: 100000,
      totalCosts: 20000,
      totalExpenses: 0,
      ventaReferencia: 200000,
      faltaParaTerminar: 50000,
      partidas: [
        { id: "p1", name: "A", category: "Obra", cotizaciones: [{ amount: 30000, currency: "USD", isChosen: true }] },
      ],
      costs: [
        { amount: 20000, currency: "USD", amountUsd: 20000, partidaId: "p1" },
      ],
    });

    // faltaParaTerminar manual = 50k (no los 10k del presupuesto)
    expect(r.presupuestoRestante).toBe(50000);
    expect(r.faltaEsManual).toBe(true);
    // cierreEstimado = 120k + 50k = 170k
    expect(r.cierreEstimado).toBe(170000);
  });

  it("sin venta referencia → ganancia 0, margen 0", () => {
    const r = computeObraProyeccion({
      buyPrice: 100000,
      totalCosts: 20000,
      totalExpenses: 0,
      ventaReferencia: null,
      partidas: [],
      costs: [],
    });

    expect(r.ganancia).toBe(0);
    expect(r.margenProyectado).toBe(0);
  });

  it("rubro excedido no devuelve plata (piso en 0)", () => {
    const r = computeObraProyeccion({
      buyPrice: 100000,
      totalCosts: 40000,
      totalExpenses: 0,
      ventaReferencia: 200000,
      partidas: [
        { id: "p1", name: "A", category: "Obra", cotizaciones: [{ amount: 30000, currency: "USD", isChosen: true }] },
      ],
      costs: [
        { amount: 40000, currency: "USD", amountUsd: 40000, partidaId: "p1" },
      ],
    });

    // Rubro excedido: 30k presupuestado, 40k gastado → restante = max(0, 30k-40k) = 0
    expect(r.presupuestoRestante).toBe(0);
  });
});

// ============================================================================
// computeRitmoObra()
// ============================================================================

describe("computeRitmoObra()", () => {
  it("sin avance → hayDatos false", () => {
    const r = computeRitmoObra({
      costosObra: 10000,
      buyPrice: 100000,
      totalExpenses: 0,
      ventaReferencia: 200000,
      etapas: null,
    });

    expect(r.hayDatos).toBe(false);
    expect(r.obraAlRitmo).toBeNull();
  });

  it("sin costos pero con avance → hayDatos false", () => {
    const r = computeRitmoObra({
      costosObra: 0,
      buyPrice: 100000,
      totalExpenses: 0,
      ventaReferencia: 200000,
      etapas: { estructura: 50 },
    });
    expect(r.hayDatos).toBe(false);
  });

  it("alerta true cuando margen al ritmo < 10%", () => {
    // Avance bajo con mucho gastado → obra se encarece
    const r = computeRitmoObra({
      costosObra: 80000,
      buyPrice: 100000,
      totalExpenses: 10000,
      ventaReferencia: 200000,
      // Solo estructura al 50% → 7.5% avance
      etapas: { estructura: 50 },
    });
    expect(r.hayDatos).toBe(true);
    expect(r.alerta).toBe(true);
    expect(r.semaforo).toBe("rojo");
  });

  it("avance 50% con 30k gastados → obra cierra en 60k", () => {
    const r = computeRitmoObra({
      costosObra: 30000,
      buyPrice: 100000,
      totalExpenses: 5000,
      ventaReferencia: 200000,
      etapas: { estructura: 100, instalaciones: 100, obraGruesa: 100, terminaciones: 0, exterior: 0 },
    });

    // Avance = 15+12+20 = 47%
    const avanceEsperado = 47;
    expect(r.avancePct).toBe(avanceEsperado);
    expect(r.hayDatos).toBe(true);
    // obraAlRitmo = 30000 / (47/100) ≈ 63829.79
    expect(r.obraAlRitmo).toBeCloseTo(63829.79, 0);
    // cierreAlRitmo = 100k + 5k + 63829.79 ≈ 168829.79
    expect(r.cierreAlRitmo).toBeCloseTo(168829.79, 0);
    // margenAlRitmo = (200k - 168829.79) / 168829.79 × 100 ≈ 18.46% (sobre inversión)
    expect(r.margenAlRitmo).toBeCloseTo(18.46, 0);
    expect(r.semaforo).toBe("verde");
    expect(r.alerta).toBe(false);
  });
});

// ============================================================================
// cotizacionUsd() y costUsd()
// ============================================================================

describe("cotizacionUsd()", () => {
  it("ARS con amountUsd → usa amountUsd", () => {
    expect(cotizacionUsd({ amount: 3000000, currency: "ARS", amountUsd: 2500 })).toBe(2500);
  });

  it("USD → usa amount directo", () => {
    expect(cotizacionUsd({ amount: 5000, currency: "USD" })).toBe(5000);
  });

  it("ARS sin amountUsd → usa amount (fallback)", () => {
    expect(cotizacionUsd({ amount: 3000000, currency: "ARS", amountUsd: null })).toBe(3000000);
  });
});

describe("costUsd()", () => {
  it("con amountUsd → lo usa directo", () => {
    expect(costUsd({ amount: 1200000, currency: "ARS", amountUsd: 1000 })).toBe(1000);
  });

  it("ARS sin amountUsd pero con exchangeRate → calcula", () => {
    expect(costUsd({ amount: 1200000, currency: "ARS", exchangeRate: 1200 })).toBe(1000);
  });

  it("USD sin amountUsd → usa amount", () => {
    expect(costUsd({ amount: 5000, currency: "USD" })).toBe(5000);
  });
});

// ============================================================================
// computeHoldingMetrics()
// ============================================================================

describe("computeHoldingMetrics()", () => {
  it("flip de 6 meses con 20% de margen → ~44% anualizado", () => {
    const r = computeHoldingMetrics({
      buyDate: "2026-01-01",
      saleDate: "2026-07-01",
      investment: 200000,
      result: 50000, // 25% sobre inversión
      marginPct: 20,
    });

    expect(r.daysHeld).toBe(181);
    // (1 + 50000/200000)^(365/181) - 1 ≈ 56%
    expect(r.annualizedPct).toBeGreaterThan(40);
    expect(r.annualizedPct).toBeLessThan(65);
  });

  it("flip de 18 meses con 20% de margen → ~13% anualizado", () => {
    const r = computeHoldingMetrics({
      buyDate: "2025-01-01",
      saleDate: "2026-07-01",
      investment: 200000,
      result: 50000,
      marginPct: 20,
    });

    expect(r.daysHeld).toBe(546);
    expect(r.annualizedPct).toBeGreaterThan(10);
    expect(r.annualizedPct).toBeLessThan(20);
  });

  it("sin fecha de compra → daysHeld 0, sin anualizado", () => {
    const r = computeHoldingMetrics({
      buyDate: null,
      investment: 200000,
      result: 50000,
      marginPct: 20,
    });

    expect(r.daysHeld).toBe(0);
    expect(r.annualizedPct).toBeNull();
  });

  it("proyecto activo (sin saleDate) → días hasta hoy", () => {
    const r = computeHoldingMetrics({
      buyDate: "2026-09-01",
      investment: 200000,
      result: 0,
      marginPct: 0,
    });

    expect(r.daysHeld).toBeGreaterThan(0);
  });

  it("proyecto con pérdida → anualizado negativo", () => {
    const r = computeHoldingMetrics({
      buyDate: "2026-01-01",
      saleDate: "2026-07-01",
      investment: 200000,
      result: -20000,
      marginPct: -10,
    });

    expect(r.annualizedPct).toBeLessThan(0);
  });
});

// ============================================================================
// Inversores: distribución del resultado
// ============================================================================

describe("distribución de inversores", () => {
  it("60/40 cierra exacto", () => {
    const resultado = 100000;
    const inversores = [
      { profitPercentage: 60 },
      { profitPercentage: 40 },
    ];

    const dividendos = inversores.map((i) => (i.profitPercentage / 100) * resultado);
    expect(dividendos[0]).toBe(60000);
    expect(dividendos[1]).toBe(40000);
    expect(dividendos.reduce((s, d) => s + d, 0)).toBe(resultado);
  });

  it("tres inversores con decimales cierran al centavo", () => {
    const resultado = 100000;
    const inversores = [
      { profitPercentage: 33.33 },
      { profitPercentage: 33.33 },
      { profitPercentage: 33.34 },
    ];

    const dividendos = inversores.map((i) => (i.profitPercentage / 100) * resultado);
    const total = dividendos.reduce((s, d) => s + d, 0);
    expect(total).toBeCloseTo(100000, 2);
  });
});
