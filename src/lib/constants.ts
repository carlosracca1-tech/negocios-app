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
    { value: "servicio", label: "Servicio" },
    { value: "tramite", label: "Trámite" },
  ],
  Auto: [
    { value: "repuesto", label: "Repuesto" },
    { value: "mano_de_obra", label: "Mano de obra" },
    { value: "servicio", label: "Service" },
    { value: "tramite", label: "Trámite" },
  ],
};

/**
 * Tipos de costo permitidos por categoría — usa la cabeza.
 * "Profesionales" siempre es servicio, "Documentación" siempre es trámite, etc.
 * Cuando solo hay un tipo permitido, el modal lo selecciona automáticamente y oculta el selector.
 */
export const allowedCostTypesByCategory: Record<string, string[]> = {
  // === Casa ===
  Obra: ["material", "mano_de_obra"],
  Estructura: ["material", "mano_de_obra"],
  Terminaciones: ["material", "mano_de_obra"],
  Equipamiento: ["material", "mano_de_obra"],
  Exterior: ["material", "mano_de_obra"],
  Profesionales: ["servicio"],
  Servicios: ["servicio"],
  Documentación: ["tramite"],

  // === Auto ===
  Mecánica: ["repuesto", "mano_de_obra"],
  Motor: ["repuesto", "mano_de_obra"],
  Carrocería: ["repuesto", "mano_de_obra"],
  Interior: ["repuesto", "mano_de_obra"],
  Electrónica: ["repuesto", "mano_de_obra"],
  Neumáticos: ["repuesto", "mano_de_obra"],
  Estética: ["repuesto", "mano_de_obra"],
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
  border: "1px solid var(--border-default)",
  backgroundColor: "var(--surface-2)",
  fontSize: 13,
  outline: "none",
  color: "var(--text-primary)",
  transition: "all 0.25s",
  backdropFilter: "blur(8px)",
};

export const focusInput = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
) => {
  e.currentTarget.style.borderColor = "var(--accent)";
  e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)";
};

export const blurInput = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
) => {
  e.currentTarget.style.borderColor = "var(--border-default)";
  e.currentTarget.style.boxShadow = "none";
};
