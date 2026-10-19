"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Hook de accesibilidad para modales:
 * - Cierra con Escape
 * - Atrapa el foco dentro del modal (focus trap)
 * - Mueve el foco al modal cuando se abre
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Guardar el elemento que tenía foco al abrir, restaurarlo al cerrar
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Cierre con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Focus trap: Tab y Shift+Tab se quedan dentro del modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Foco inicial al panel cuando se abre
  useEffect(() => {
    if (!isOpen) return;
    // Pequeño delay para que el portal se monte
    const id = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const autofocus = panel.querySelector<HTMLElement>("[autofocus], input, select, textarea");
      if (autofocus) {
        autofocus.focus();
      } else {
        panel.focus();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  return { panelRef, handleKeyDown };
}
