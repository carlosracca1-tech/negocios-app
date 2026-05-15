"use client";

import { useState, useRef, useEffect } from "react";
import { useCreateExpense, useParseReceipt } from "@/hooks/useProjects";
import { modalInputStyle as inputStyle, focusInput, blurInput } from "@/lib/constants";

interface AddExpenseModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddExpenseModal({ projectId, isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateAuto, setRateAuto] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [paidDate, setPaidDate] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [dataExtracted, setDataExtracted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createExpense, loading: creating, error: createError } = useCreateExpense();
  const { mutate: parseReceipt, loading: parsing, error: parseError } = useParseReceipt();

  // Auto-fetch dólar blue al abrir el modal (sólo si el campo está vacío y la moneda es ARS)
  useEffect(() => {
    if (!isOpen) return;
    if (exchangeRate) return; // no pisar lo que ya cargó el user
    let cancelled = false;
    setRateLoading(true);
    fetch("/api/dolar-blue")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.promedio) return;
        setExchangeRate(String(data.promedio));
        setRateAuto(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRateLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetForm = () => {
    setConcept("");
    setAmount("");
    setCurrency("ARS");
    setExchangeRate("");
    setRateAuto(false);
    const now = new Date();
    setPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    setPaidDate("");
    setNotes("");
    setReceiptFile(null);
    setReceiptPreview(null);
    setDataExtracted(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setDataExtracted(false);

    // Show preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }

    // Auto-parse with Claude
    try {
      const parsed = await parseReceipt(projectId, file);
      if (parsed.concept) setConcept(parsed.concept);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.currency) setCurrency(parsed.currency);
      if (parsed.period) {
        // El parser devuelve "YYYY-MM-01" o un ISO. Tomamos UTC para no perder el mes
        // por la zona horaria del cliente.
        const raw = String(parsed.period);
        const direct = raw.match(/^(\d{4})-(\d{2})/);
        if (direct) {
          setPeriod(`${direct[1]}-${direct[2]}`);
        } else {
          const d = new Date(raw);
          setPeriod(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
        }
      }
      if (parsed.paidDate) setPaidDate(parsed.paidDate);
      if (parsed.notes) setNotes(parsed.notes);
      setDataExtracted(true);
    } catch {
      // Parsing failed — user can fill manually
      setDataExtracted(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Mediodía UTC para que ningún huso horario lo tire al mes anterior.
      const periodDate = new Date(`${period}-01T12:00:00.000Z`).toISOString();

      await createExpense(projectId, {
        concept,
        amount: parseFloat(amount),
        currency,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
        period: periodDate,
        paidDate: paidDate ? new Date(paidDate).toISOString() : null,
        notes: notes || null,
        receiptName: receiptFile?.name || null,
        // receiptUrl would be set after file upload to storage — for now we store the name
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .upload-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div
        className="modal-content"
        style={{
          background: "var(--surface-glass)", backdropFilter: "blur(20px)",
          borderRadius: 16, padding: 24, width: 480, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.1), 0 0 40px rgba(56, 189, 248, 0.05)",
          border: "1px solid var(--border-default)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          Agregar gasto mensual
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>
          Subí un comprobante para completar automáticamente, o cargá los datos manualmente.
        </p>

        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed rgba(212, 165, 116, 0.2)", borderRadius: 12, padding: "20px 16px",
            textAlign: "center", cursor: "pointer", marginBottom: 20,
            background: parsing ? "rgba(212, 165, 116, 0.08)" : dataExtracted ? "rgba(16, 185, 129, 0.05)" : "var(--surface-1)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!parsing && !dataExtracted) {
              e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.4)";
              e.currentTarget.style.background = "rgba(212, 165, 116, 0.08)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.2)";
            e.currentTarget.style.background = parsing ? "rgba(212, 165, 116, 0.08)" : dataExtracted ? "rgba(16, 185, 129, 0.05)" : "var(--surface-1)";
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {parsing ? (
            <div>
              <div className="upload-spinner" style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "3px solid rgba(212, 165, 116, 0.2)", borderTopColor: "var(--text-primary)",
                margin: "0 auto 8px",
              }} />
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>Interpretando documento...</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Extrayendo monto, concepto y período</div>
            </div>
          ) : receiptFile ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
                {receiptPreview && (
                  <img src={receiptPreview} alt="preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(212, 165, 116, 0.2)" }} />
                )}
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{receiptFile.name}</div>
                  <div style={{ fontSize: 11, color: dataExtracted ? "#10b981" : "var(--text-primary)" }}>
                    {dataExtracted ? "Datos extraídos automáticamente" : "Comprobante cargado — Hacé click para cambiar"}
                  </div>
                </div>
              </div>
              {dataExtracted && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(16, 185, 129, 0.15)", color: "#10b981",
                  padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  marginTop: 10, border: "1px solid rgba(16, 185, 129, 0.3)",
                }}>
                  <span style={{ fontSize: 14 }}>✓</span> Datos extraídos automáticamente
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📎</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                Subí una imagen o PDF de tu gasto
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                Ej: expensas, factura, recibo
              </div>
            </div>
          )}
        </div>

        {parseError && (
          <div style={{ fontSize: 12, color: "var(--warning)", background: "var(--warning-soft)", padding: "8px 12px", borderRadius: 8, marginBottom: 12, border: "1px solid var(--warning-border)" }}>
            No se pudo leer el comprobante automáticamente. Completá los datos manualmente.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Concepto</label>
            <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: Expensas, Seguro, Patente" required style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Monto</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" step="0.01" min="0" required style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as "ARS" | "USD")} style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusInput} onBlur={blurInput}>
                <option value="ARS">ARS (Pesos)</option>
                <option value="USD">USD (Dólares)</option>
              </select>
            </div>
          </div>

          {currency === "ARS" && (
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Tipo de cambio (Dólar Blue)
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  {rateLoading ? " — cargando cotización..." : rateAuto ? " — auto (dolarapi.com)" : " — opcional, para calcular USD"}
                </span>
              </label>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => { setExchangeRate(e.target.value); setRateAuto(false); }}
                placeholder={rateLoading ? "Cargando..." : "Ej: 1200"}
                step="0.01"
                min="0"
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
              {exchangeRate && amount && (
                <div style={{ fontSize: 11, color: "var(--text-primary)", marginTop: 4 }}>
                  ≈ U$D {(parseFloat(amount) / parseFloat(exchangeRate)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Período (mes)</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Fecha de pago</label>
              <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Notas (opcional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Incluye multa por velocidad" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          {createError && (
            <div style={{ fontSize: 12, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--danger-border)" }}>
              {createError}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button type="button" onClick={() => { resetForm(); onClose(); }} style={{
              flex: 1, padding: "10px 16px", borderRadius: 10,
              border: "1px solid var(--border-default)", background: "transparent",
              fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-1)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.12)"; }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={creating || parsing} style={{
              flex: 1, padding: "10px 16px", borderRadius: 10, border: "none",
              background: "var(--accent)",
              fontSize: 13, fontWeight: 600, color: "var(--accent-on)",
              cursor: creating || parsing ? "not-allowed" : "pointer",
              opacity: creating || parsing ? 0.6 : 1,
              boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
            }}
              onMouseEnter={(e) => !(creating || parsing) && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)")}
            >
              {creating ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
