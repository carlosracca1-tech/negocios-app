/**
 * Shared UI constants for the Negocios app.
 * Single source of truth for repeated visual configurations.
 */

import type React from "react";

export const catColors: Record<string, string> = {
  Obra: "#38bdf8",
  Mecánica: "#fbbf24",
  Estética: "#c084fc",
  Profesionales: "#34d399",
  Servicios: "#d4a574",
  Estructura: "#38bdf8",
  Terminaciones: "#818cf8",
  Equipamiento: "#c084fc",
  Exterior: "#34d399",
  Motor: "#f97316",
  Carrocería: "#fbbf24",
  Interior: "#c084fc",
  Electrónica: "#818cf8",
  Neumáticos: "#64748b",
  Documentación: "#d4a574",
};

/** Categories by project type — controls what appears in the "Agregar Costo" modal */
export const categoriesByProjectType: Record<string, { value: string; label: string; icon: string }[]> = {
  Casa: [
    { value: "Obra", label: "Obra / Albañilería", icon: "🧱" },
    { value: "Estructura", label: "Estructura (techo, hierros)", icon: "🏗️" },
    { value: "Terminaciones", label: "Terminaciones (pisos, pintura)", icon: "🎨" },
    { value: "Equipamiento", label: "Equipamiento (electrodomésticos)", icon: "🔌" },
    { value: "Exterior", label: "Exterior (jardín, piscina)", icon: "🌿" },
    { value: "Profesionales", label: "Profesionales (arquitecto, etc)", icon: "👷" },
    { value: "Servicios", label: "Servicios (gas, agua, luz)", icon: "💡" },
    { value: "Documentación", label: "Documentación (escritura, etc)", icon: "📄" },
  ],
  Auto: [
    { value: "Mecánica", label: "Mecánica (motor, frenos)", icon: "🔧" },
    { value: "Motor", label: "Motor / Tren motriz", icon: "⚙️" },
    { value: "Carrocería", label: "Carrocería / Chapa / Pintura", icon: "🚗" },
    { value: "Interior", label: "Interior (tapizado, tablero)", icon: "💺" },
    { value: "Electrónica", label: "Electrónica (luces, audio)", icon: "📡" },
    { value: "Neumáticos", label: "Neumáticos / Suspensión", icon: "🛞" },
    { value: "Profesionales", label: "Profesionales (mecánico, etc)", icon: "👨‍🔧" },
    { value: "Documentación", label: "Documentación (VTV, transferencia)", icon: "📄" },
  ],
};

/** Cost types by project type */
export const costTypesByProjectType: Record<string, { value: string; label: string }[]> = {
  Casa: [
    { value: "material", label: "Material" },
    { value: "mano_de_obra", label: "Mano de obra" },
    { value: "servicio", label: "Servicio profesional" },
    { value: "tramite", label: "Trámite / Documento" },
  ],
  Auto: [
    { value: "repuesto", label: "Repuesto" },
    { value: "mano_de_obra", label: "Mano de obra" },
    { value: "servicio", label: "Service / Revisión" },
    { value: "tramite", label: "Trámite / Documento" },
  ],
};

export const statusConfig: Record<
  string,
  { bg: string; color: string; t: string; glow: string }
> = {
  vendido: {
    bg: "rgba(52, 211, 153, 0.1)",
    color: "#34d399",
    t: "Vendido",
    glow: "rgba(52, 211, 153, 0.15)",
  },
  activo: {
    bg: "rgba(56, 189, 248, 0.1)",
    color: "#38bdf8",
    t: "Activo",
    glow: "rgba(56, 189, 248, 0.15)",
  },
  pausado: {
    bg: "rgba(136, 153, 176, 0.1)",
    color: "#8899b0",
    t: "Pausado",
    glow: "rgba(136, 153, 176, 0.1)",
  },
};

export const modalInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(56, 189, 248, 0.1)",
  backgroundColor: "rgba(6, 11, 20, 0.6)",
  fontSize: 13,
  outline: "none",
  color: "#e8edf5",
  transition: "all 0.25s",
  backdropFilter: "blur(8px)",
};

export const focusInput = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
) => {
  e.currentTarget.style.borderColor = "#38bdf8";
  e.currentTarget.style.boxShadow =
    "0 0 0 3px rgba(56, 189, 248, 0.1), 0 0 15px rgba(56, 189, 248, 0.08)";
};

export const blurInput = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
) => {
  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.1)";
  e.currentTarget.style.boxShadow = "none";
};
