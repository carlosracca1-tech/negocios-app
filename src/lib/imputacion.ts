/**
 * Imputación automática de costos a presupuestos.
 *
 * Regla de oro: ante la duda, no imputar. Es preferible dejar un costo sin
 * asignar (queda visible en el aviso amarillo) que meterlo en el presupuesto
 * equivocado y ensuciar el % de avance, que es justamente el numero que se
 * usa para decidir si se esta pagando de mas.
 */

/** Palabras genericas que aparecen en cualquier obra y no identifican a nadie. */
const PALABRAS_VACIAS = new Set([
  "obra", "pago", "pagos", "anticipo", "adelanto", "saldo", "cuota", "seña", "sena",
  "semana", "quincena", "mes", "mensual", "dia", "dias", "jornada", "jornal",
  "material", "materiales", "mano", "trabajo", "trabajos", "servicio", "servicios",
  "compra", "gasto", "gastos", "costo", "costos", "factura", "recibo", "total",
  "para", "por", "con", "sin", "del", "los", "las", "una", "uno", "que", "más", "mas",
  "casa", "planta", "parte", "extra", "varios", "otro", "otros", "final",
]);

/** minusculas, sin acentos, sin puntuacion, espacios colapsados */
export function normalizar(texto: string): string {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras significativas: 4+ letras y que no sean genericas de obra. */
export function palabrasClave(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p.length >= 4 && !PALABRAS_VACIAS.has(p) && !/^\d+$/.test(p));
}

export interface PartidaParaImputar {
  id: string;
  name: string;
  cotizaciones?: { provider?: string | null }[];
}

export interface CostoParaImputar {
  id: string;
  concept: string;
  partidaId?: string | null;
}

/**
 * Señas de identidad de un presupuesto: los nombres por los que se lo puede
 * reconocer en el concepto de un costo.
 *
 * Del nombre "Albañil Juan #1 - Revoques" se queda con "Albañil Juan": lo que
 * va antes del # es el proveedor. La descripcion posterior se descarta porque
 * describe el trabajo, no a quien lo hace, y generaria falsos positivos.
 * Suma tambien los proveedores de las cotizaciones.
 */
export function señasDePartida(p: PartidaParaImputar): string[][] {
  const señas: string[][] = [];

  const antesDelNumeral = p.name.split("#")[0];
  const base = antesDelNumeral.includes(" - ")
    ? antesDelNumeral.split(" - ")[0]
    : antesDelNumeral;

  const delNombre = palabrasClave(base);
  if (delNombre.length > 0) señas.push(delNombre);

  (p.cotizaciones || []).forEach((c) => {
    const delProveedor = palabrasClave(c?.provider || "");
    if (delProveedor.length > 0) señas.push(delProveedor);
  });

  return señas;
}

/** ¿Estan TODAS las palabras de la seña en el concepto? El orden no importa. */
function coincide(seña: string[], palabrasDelConcepto: Set<string>): boolean {
  return seña.length > 0 && seña.every((p) => palabrasDelConcepto.has(p));
}

export type MotivoNoImputado = "sin_coincidencia" | "ambiguo";

export interface Imputacion {
  costId: string;
  concept: string;
  partidaId: string;
  partidaName: string;
  /** las palabras que hicieron el match, para poder auditarlo */
  porque: string[];
}

export interface NoImputado {
  costId: string;
  concept: string;
  motivo: MotivoNoImputado;
  /** si fue ambiguo, los presupuestos que competian */
  candidatos?: string[];
}

export interface PlanDeImputacion {
  imputar: Imputacion[];
  dejar: NoImputado[];
}

/**
 * Arma el plan sin escribir nada.
 *
 * Solo toca costos que hoy no tienen presupuesto: nunca pisa una imputacion
 * que ya hizo el usuario. Si a un costo le calzan dos presupuestos distintos,
 * lo deja quieto y lo reporta como ambiguo.
 */
export function planificarImputacion(
  costos: CostoParaImputar[],
  partidas: PartidaParaImputar[]
): PlanDeImputacion {
  const conSeñas = partidas
    .map((p) => ({ partida: p, señas: señasDePartida(p) }))
    .filter((x) => x.señas.length > 0);

  const imputar: Imputacion[] = [];
  const dejar: NoImputado[] = [];

  costos
    .filter((c) => !c.partidaId)
    .forEach((costo) => {
      const palabras = new Set(normalizar(costo.concept).split(" "));

      const candidatos = conSeñas
        .map((x) => {
          const señaQueCalza = x.señas.find((s) => coincide(s, palabras));
          return señaQueCalza ? { partida: x.partida, porque: señaQueCalza } : null;
        })
        .filter((x): x is { partida: PartidaParaImputar; porque: string[] } => x !== null);

      // Varias señas pueden apuntar al mismo presupuesto: eso no es ambiguedad.
      const idsDistintos = new Set(candidatos.map((c) => c.partida.id));

      if (idsDistintos.size === 1) {
        const elegido = candidatos[0];
        imputar.push({
          costId: costo.id,
          concept: costo.concept,
          partidaId: elegido.partida.id,
          partidaName: elegido.partida.name,
          porque: elegido.porque,
        });
      } else if (idsDistintos.size > 1) {
        dejar.push({
          costId: costo.id,
          concept: costo.concept,
          motivo: "ambiguo",
          candidatos: Array.from(new Set(candidatos.map((c) => c.partida.name))),
        });
      } else {
        dejar.push({ costId: costo.id, concept: costo.concept, motivo: "sin_coincidencia" });
      }
    });

  return { imputar, dejar };
}
