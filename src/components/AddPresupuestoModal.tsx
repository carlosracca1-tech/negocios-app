"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ParsedBudget, Partida, ScopeItem } from "@/types";
import { budgetApi, partidasApi, cotizacionesApi } from "@/lib/api-client";
import { categoriesByProjectType } from "@/lib/constants";
import { modalInputStyle, focusInput, blurInput } from "@/lib/constants";

interface Props {
  projectId: string;
  projectType: string;
  partidas: Partida[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "idle" | "analyzing" | "extracted" | "saving";

const analyzeSteps = [
  "Leyendo el documento...",
  "Extrayendo alcance y partidas...",
  "Detectando valores y moneda...",
  "Identificando tiempos y condiciones...",
  "Asignando al rubro y comparando...",
];

export default function AddPresupuestoModal({ projectId, projectType, partidas, isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [parsed, setParsed] = useState<ParsedBudget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields from extraction
  const [provider, setProvider] = useState("");
  const [category, setCategory] = useState("");
  const [partidaName, setPartidaName] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Dólar blue automático (promedio compra/venta) — mismo patrón que AddCostModal
  const [blueRate, setBlueRate] = useState<{ compra: number; venta: number; promedio: number } | null>(null);
  const [blueLoading, setBlueLoading] = useState(false);
  const [blueError, setBlueError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const categories = categoriesByProjectType[projectType] || categoriesByProjectType.Casa;

  const fetchBlueRate = useCallback(async () => {
    setBlueLoading(true);
    setBlueError("");
    try {
      const res = await fetch("/api/dolar-blue");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setBlueRate({ compra: data.compra, venta: data.venta, promedio: data.promedio });
    } catch {
      setBlueError("No se pudo obtener el dólar blue. Reintentá.");
    } finally {
      setBlueLoading(false);
    }
  }, []);

  // Traer el blue al abrir el modal (lo necesitamos si la cotización es en ARS)
  useEffect(() => {
    if (isOpen && !blueRate && !blueLoading) {
      fetchBlueRate();
    }
  }, [isOpen, blueRate, blueLoading, fetchBlueRate]);

  // Mantener el tipo de cambio sincronizado con el promedio del blue cuando es ARS
  useEffect(() => {
    if (currency === "ARS" && blueRate) {
      setExchangeRate(blueRate.promedio);
    }
  }, [currency, blueRate]);

  const reset = useCallback(() => {
    setFile(null);
    setStep("idle");
    setActiveStep(-1);
    setDoneSteps(new Set());
    setParsed(null);
    setError(null);
    setSaving(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");
    setError(null);
    setActiveStep(0);

    // Animate steps
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < analyzeSteps.length - 1) {
          setDoneSteps((ds) => new Set(ds).add(prev));
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    try {
      const result = await budgetApi.analyze(projectId, file);
      clearInterval(stepInterval);
      // Mark all steps as done
      setDoneSteps(new Set(analyzeSteps.map((_, i) => i)));
      setActiveStep(-1);

      setParsed(result);
      setProvider(result.provider || "");
      setCategory(result.category || categories[0]?.value || "");
      setPartidaName(result.suggestedPartidaName || "");
      setAmount(result.amount || 0);
      setCurrency(result.currency || "USD");

      setTimeout(() => setStep("extracted"), 400);
    } catch (err) {
      clearInterval(stepInterval);
      setStep("idle");
      setActiveStep(-1);
      setDoneSteps(new Set());
      setError(err instanceof Error ? err.message : "Error al analizar");
    }
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    setSaving(true);
    setError(null);

    try {
      // Find or create partida
      const existingPartida = partidas.find(
        (p) => p.category === category && p.name.toLowerCase() === partidaName.toLowerCase()
      );

      let partidaId: string;
      if (existingPartida) {
        partidaId = existingPartida.id;
      } else {
        const newPartida = await partidasApi.create(projectId, {
          name: partidaName,
          category,
        });
        partidaId = newPartida.id;
      }

      // Calculate amountUsd
      let amountUsd: number | null = null;
      if (currency === "ARS" && exchangeRate && exchangeRate > 0) {
        amountUsd = amount / exchangeRate;
      } else if (currency === "USD") {
        amountUsd = amount;
      }

      // Create cotizacion
      await cotizacionesApi.create(projectId, partidaId, {
        provider,
        amount,
        currency,
        exchangeRate,
        scopeItems: parsed.scopeItems,
        leadTimeDays: parsed.leadTimeDays,
        leadTimeText: parsed.leadTimeText,
        paymentTerms: parsed.paymentTerms,
        warranty: parsed.warranty,
        validityDays: parsed.validityDays,
        notes: parsed.notes,
      });

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const scope = (parsed?.scopeItems || []) as ScopeItem[];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(5px)", display: "flex", alignItems: "flex-start",
        justifyContent: "center", zIndex: 50, padding: "24px 16px", overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--surface-solid)", border: "1px solid var(--border-default)",
          borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "calc(100vh - 48px)",
          margin: "auto", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-elevated)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "17px 20px", borderBottom: "1px solid var(--border-default)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, background: "var(--surface-solid)",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 9, color: "var(--text-primary)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Subir presupuesto
          </h3>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>
          {/* File chip / drop zone */}
          {!file ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "var(--surface-1)", border: "1px dashed var(--border-default)",
                borderRadius: 10, padding: "20px 14px", marginBottom: 20,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10, background: "var(--surface-3)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Subi el presupuesto en PDF
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Arrastra o hace click. <span style={{ color: "var(--success)", fontWeight: 600 }}>La IA extrae todo automaticamente.</span>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--surface-2)", border: "1px solid var(--border-default)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 20,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: "var(--danger-soft)", color: "var(--danger)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                PDF
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{file.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{(file.size / 1024).toFixed(0)} KB</div>
              </div>
              {step === "extracted" && (
                <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>✓ Analizado</span>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "var(--danger-soft)", border: "1px solid var(--danger-border)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
              fontSize: 12.5, color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          {/* Analyzing steps */}
          {step === "analyzing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {analyzeSteps.map((s, i) => {
                const isDone = doneSteps.has(i);
                const isActive = i === activeStep;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 11,
                      fontSize: 13,
                      color: isDone ? "var(--success)" : isActive ? "var(--text-secondary)" : "var(--text-tertiary)",
                      opacity: isDone || isActive ? 1 : 0.45,
                      transition: "all 0.3s",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      border: isDone ? "2px solid var(--success)" : "2px solid var(--surface-3)",
                      background: isDone ? "var(--success)" : "transparent",
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#04130d",
                      ...(isActive ? {
                        borderColor: "var(--text-primary)",
                        borderTopColor: "transparent",
                        animation: "spin 0.7s linear infinite",
                      } : {}),
                    }}>
                      {isDone ? "✓" : ""}
                    </div>
                    {s}
                  </div>
                );
              })}
            </div>
          )}

          {/* Extracted data */}
          {step === "extracted" && parsed && (
            <div style={{ animation: "fadeIn 0.4s" }}>
              <div style={{
                background: "var(--success-soft)", border: "1px solid var(--success-border)",
                borderRadius: 10, padding: "11px 14px", fontSize: 12.5,
                color: "var(--success)", marginBottom: 16,
                display: "flex", gap: 8, alignItems: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Listo — lo extraje del PDF. Revisa y confirma.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 }}>
                <div>
                  <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Proveedor</label>
                  <input
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    style={modalInputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Rubro</label>
                  <input
                    value={partidaName}
                    onChange={(e) => setPartidaName(e.target.value)}
                    style={modalInputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 13 }}>
                <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ ...modalInputStyle, appearance: "auto" } as React.CSSProperties}
                  onFocus={focusInput as any}
                  onBlur={blurInput as any}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 }}>
                <div>
                  <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Valor</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as "USD" | "ARS")}
                      style={{ ...modalInputStyle, width: 80, appearance: "auto" } as React.CSSProperties}
                      onFocus={focusInput as any}
                      onBlur={blurInput as any}
                    >
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                    <input
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      style={{ ...modalInputStyle, flex: 1 }}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                  </div>
                </div>
                {currency === "ARS" && (
                  <div>
                    <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Tipo cambio · dólar blue</span>
                      <button
                        type="button"
                        onClick={fetchBlueRate}
                        disabled={blueLoading}
                        style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: blueLoading ? "wait" : "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}
                        title="Actualizar cotización"
                      >
                        {blueLoading ? "…" : "↻"}
                      </button>
                    </label>
                    <div style={{ ...modalInputStyle, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "default" }}>
                      {blueLoading && !blueRate ? (
                        <span style={{ color: "var(--text-tertiary)" }}>Cargando…</span>
                      ) : blueRate ? (
                        <>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>${blueRate.promedio.toLocaleString("es-AR")}</span>
                          <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>
                            Compra ${blueRate.compra} · Venta ${blueRate.venta}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: "var(--danger)", fontSize: 11 }}>{blueError || "Sin cotización"}</span>
                      )}
                    </div>
                    {blueRate && amount > 0 && (
                      <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 4 }}>
                        ≈ USD {(amount / blueRate.promedio).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                )}
                {currency === "USD" && parsed.leadTimeText && (
                  <div>
                    <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Tiempo de obra</label>
                    <div style={{ ...modalInputStyle, background: "var(--surface-2)" }}>{parsed.leadTimeText || `${parsed.leadTimeDays} dias`}</div>
                  </div>
                )}
              </div>

              {/* Scope */}
              {scope.length > 0 && (
                <div style={{ marginBottom: 13 }}>
                  <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Alcance detectado</label>
                  <ul style={{
                    listStyle: "none", display: "flex", flexDirection: "column", gap: 5,
                    background: "var(--surface-2)", border: "1px solid var(--border-default)",
                    borderRadius: 8, padding: "11px 13px",
                  }}>
                    {scope.map((s, i) => (
                      <li key={i} style={{
                        fontSize: 12.5, color: s.included ? "var(--text-secondary)" : "var(--text-tertiary)",
                        display: "flex", gap: 7, alignItems: "flex-start",
                        textDecoration: s.included ? "none" : "line-through",
                      }}>
                        <span style={{ color: s.included ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>
                          {s.included ? "\u2713" : "\u2715"}
                        </span>
                        {s.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Payment + warranty */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {parsed.paymentTerms && (
                  <div>
                    <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Forma de pago</label>
                    <div style={{ ...modalInputStyle, background: "var(--surface-2)" }}>{parsed.paymentTerms}</div>
                  </div>
                )}
                {(parsed.warranty || parsed.validityDays) && (
                  <div>
                    <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-tertiary)", marginBottom: 5, display: "block" }}>Garantia / Validez</label>
                    <div style={{ ...modalInputStyle, background: "var(--surface-2)" }}>
                      {[parsed.warranty, parsed.validityDays ? `vig. ${parsed.validityDays} dias` : ""].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "15px 20px", borderTop: "1px solid var(--border-default)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 10, flexWrap: "wrap", flexShrink: 0,
          background: "var(--surface-solid)",
        }}>
          <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", flex: 1, minWidth: 140 }}>
            {step === "idle" && "Analizo el PDF y completo todo. Vos solo confirmas."}
            {step === "analyzing" && "Procesando el documento con IA..."}
            {step === "extracted" && `Se carga al rubro ${category} · ${partidaName}`}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleClose}
              style={{
                padding: "8px 14px", borderRadius: 8,
                border: "1px solid var(--border-default)", background: "transparent",
                color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            {step === "idle" && (
              <button
                onClick={handleAnalyze}
                disabled={!file}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: file ? "var(--accent)" : "var(--surface-3)",
                  color: file ? "var(--accent-on)" : "var(--text-tertiary)",
                  fontSize: 13, fontWeight: 600,
                  cursor: file ? "pointer" : "not-allowed",
                }}
              >
                Analizar con IA
              </button>
            )}
            {step === "extracted" && (
              <button
                onClick={handleConfirm}
                disabled={saving || !provider || !partidaName || !amount}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: "var(--accent)", color: "var(--accent-on)",
                  fontSize: 13, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Guardando..." : "Confirmar y guardar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
