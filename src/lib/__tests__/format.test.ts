import { describe, it, expect } from "vitest";
import { fmtFecha, fmtFechaInput, diasHasta, textoVencimiento, fmtUsd, fmtPctAr } from "../format";

describe("fmtFecha()", () => {
  it("formatea buyDate sin correrse un día", () => {
    // 2023-12-07 almacenado como ISO → debe mostrar 07/12/2023
    expect(fmtFecha("2023-12-07T00:00:00.000Z")).toBe("07/12/2023");
  });

  it("no se corre con 2/8/2026", () => {
    expect(fmtFecha("2026-08-02T00:00:00.000Z")).toBe("02/08/2026");
  });

  it("sinAnio muestra d/m", () => {
    const r = fmtFecha("2026-08-02T00:00:00.000Z", { sinAnio: true });
    // Dependiendo del locale puede ser "02/08" o "2/8"
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

describe("fmtUsd()", () => {
  it("formatea con punto de miles, sin decimales", () => {
    expect(fmtUsd(270419)).toBe("USD 270.419");
  });
});

describe("fmtPctAr()", () => {
  it("un decimal con coma", () => {
    expect(fmtPctAr(7.24)).toBe("7,2%");
  });

  it("sin decimales", () => {
    expect(fmtPctAr(35.1, 0)).toBe("35%");
  });
});
