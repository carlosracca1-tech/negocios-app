import { describe, it, expect } from "vitest";
import { fmtFecha, fmtFechaInput, diasHasta, textoVencimiento, fmtMoney, fmtPct } from "../format";

describe("fmtFecha()", () => {
  it("formatea buyDate sin correrse un día", () => {
    expect(fmtFecha("2023-12-07T00:00:00.000Z")).toBe("07/12/2023");
  });

  it("no se corre con 2/8/2026", () => {
    expect(fmtFecha("2026-08-02T00:00:00.000Z")).toBe("02/08/2026");
  });

  it("sinAnio muestra d/m", () => {
    const r = fmtFecha("2026-08-02T00:00:00.000Z", { sinAnio: true });
    expect(r).toMatch(/2\/8|02\/08/);
  });

  it("null → —", () => {
    expect(fmtFecha(null)).toBe("—");
  });
});

describe("fmtFechaInput()", () => {
  it("devuelve yyyy-MM-dd en UTC", () => {
    expect(fmtFechaInput("2023-12-07T00:00:00.000Z")).toBe("2023-12-07");
  });

  it("null → vacío", () => {
    expect(fmtFechaInput(null)).toBe("");
  });
});

describe("diasHasta()", () => {
  it("null → null", () => {
    expect(diasHasta(null)).toBeNull();
  });
});

describe("textoVencimiento()", () => {
  it("null → null", () => {
    expect(textoVencimiento(null)).toBeNull();
  });
});

describe("fmtMoney()", () => {
  it("USD sin decimales", () => {
    expect(fmtMoney(270419)).toBe("USD 270.419");
  });

  it("USD con 2 decimales", () => {
    expect(fmtMoney(1294.5, "USD", { decimales: 2 })).toBe("USD 1.294,50");
  });

  it("ARS sin decimales", () => {
    expect(fmtMoney(2000000, "ARS")).toBe("ARS 2.000.000");
  });

  it("con signo positivo", () => {
    expect(fmtMoney(63593, "USD", { signo: true })).toBe("+USD 63.593");
  });

  it("con signo negativo", () => {
    expect(fmtMoney(-1196, "USD", { signo: true })).toBe("\u2212USD 1.196");
  });

  it("null → USD 0", () => {
    expect(fmtMoney(null)).toBe("USD 0");
  });

  it("redondea sin decimales", () => {
    expect(fmtMoney(108458.3)).toBe("USD 108.458");
  });
});

describe("fmtPct()", () => {
  it("un decimal con coma", () => {
    expect(fmtPct(7.24)).toBe("7,2%");
  });

  it("sin decimales", () => {
    expect(fmtPct(35.1, 0)).toBe("35%");
  });
});
