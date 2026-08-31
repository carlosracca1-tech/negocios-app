"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza un modal colgado de <body>, fuera del arbol donde se declara.
 *
 * Por que hace falta: `.glass-card` usa `backdrop-filter`, y un elemento con
 * backdrop-filter se convierte en el bloque contenedor de sus descendientes
 * `position: fixed`. Los modales que se declaran adentro de un panel (que a su
 * vez vive dentro de una glass-card) quedaban anclados a la tarjeta en vez de a
 * la pantalla: aparecian abajo de todo y ademas los recortaba el overflow.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  // En el server no hay document: el portal recien existe tras el primer render.
  if (!montado) return null;

  return createPortal(children, document.body);
}
