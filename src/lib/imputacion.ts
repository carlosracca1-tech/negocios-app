/**
 * Imputación automática de costos a presupuestos.
 *
 * Regla de oro: ante la duda, no imputar. Es preferible dejar un costo sin
 * asignar (queda visible en el aviso amarillo) que meterlo en el presupuesto
 * equivocado y ensuciar el % de avance, que es justamente el numero que se
 * usa para decidir si se esta pagando de mas.
 *
 * Excepcion: cuando el MISMO proveedor tiene varios presupuestos, no hay
 * ambiguedad real sino orden. Los pagos van llenando el primero y cuando se
 * completa siguen en el segundo (ver repartirEnCascada).
 */

import { costArs, partidaProjectedArs } from "./financial";

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
  order?: number;
  cotizaciones?: {
    provider?: string | null;
    amount: number;
    currency?: string | null;
    exchangeRate?: number | null;
    amountUsd?: number | null;
    isChosen?: boolean;
  }[];
}

export interface CostoParaImputar {
  id: string;
  concept: string;
  partidaId?: string | null;
  amount: number;
  currency?: string | null;
  exchangeRate?: number | null;
  amountUsd?: number | null;
  date?: string | Date;
}

/**
 * Señas de identidad de un presupuesto: los nombres por los que se lo puede
 * reconocer en el concepto de un costo.
 *
 * De "Albañil Juan #1 - Revoques" se queda con "Albañil Juan": lo previo al #
 * es el proveedor. La descripcion posterior se descarta porque describe el
 * trabajo, no a quien lo hace, y generaria falsos positivos.
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

/** ¿El concepto sigue la convención "Proveedor #N - detalle"? */
export function tieneNumeroDeOrden(concepto: string): boolean {
  return /#\s*\d/.test(concepto || "");
}

/**
 * Proveedor segun la convención de nombres: lo que va ANTES del #.
 *
 *   "Carpinterias Aberturas #3 - Primer semana" -> [carpinterias, aberturas]
 *   "Electricista #4 - Materiales y mano de obra" -> [electricista]
 *   "Colocador - semana #3" -> [colocador]   ("semana" es palabra vacia)
 *
 * Sin # no se puede saber donde termina el proveedor, asi que se devuelve
 * el concepto entero y el matcheo se hace con la regla estricta.
 */
export function palabrasProveedorDelCosto(concepto: string): string[] {
  // Lo previo al #, y si ahi adentro hay un guion, solo lo previo al guion:
  // "Colocador - semana #3" -> "Colocador".
  const antesDelNumero = (concepto || "").split("#")[0];
  const antesDelGuion = antesDelNumero.split(/\s[-–—]\s/)[0];
  return palabrasClave(antesDelGuion);
}

/**
 * Palabras con las que arranca una COMPRA, no un pago a un proveedor.
 *
 * "Materiales PLOMERO - trabajo plomeria #3" es una compra de materiales
 * para el trabajo del plomero, no plata que cobro Luis. Si se imputa a su
 * presupuesto, el % de avance dice que le pagaste mas de lo que le pagaste.
 *
 * Solo cuenta si el concepto EMPIEZA con una de estas palabras. Si el
 * proveedor va adelante ("Electricista #4 - Materiales y mano de obra"),
 * eso si es un pago al electricista e incluye sus materiales.
 */
const ARRANQUES_DE_COMPRA = ["material", "materiales", "compra", "corralon", "corralón"];

/** ¿El concepto es una compra de materiales y no un pago al proveedor? */
export function esCompraDeMateriales(concepto: string): boolean {
  const primera = normalizar(concepto).split(" ")[0];
  return ARRANQUES_DE_COMPRA.includes(primera);
}

/** Cuantas palabras comparten dos nombres de proveedor. */
function palabrasEnComun(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((p) => setB.has(p)).length;
}

/**
 * Puntaje de afinidad entre un costo y un presupuesto. 0 = no tienen nada que ver.
 *
 * Con numero de orden se comparan proveedor contra proveedor, y alcanza con
 * que compartan una palabra: "Carpinterias Aberturas" y "Aberturas de
 * aluminio" son el mismo proveedor aunque no se escriban igual. Comparar
 * nombres cortos entre si es seguro; el que gana es el de mayor puntaje.
 *
 * Sin numero de orden no se sabe donde termina el proveedor dentro del
 * concepto, asi que se exige la regla estricta: todas las palabras del
 * presupuesto tienen que estar en el concepto.
 */
export function puntaje(
  concepto: string,
  señas: string[][],
  palabrasDelConcepto: Set<string>
): { score: number; porque: string[] } {
  let mejor = { score: 0, porque: [] as string[] };

  if (tieneNumeroDeOrden(concepto)) {
    const delCosto = palabrasProveedorDelCosto(concepto);
    señas.forEach((s) => {
      const n = palabrasEnComun(s, delCosto);
      if (n > mejor.score) {
        mejor = { score: n, porque: s.filter((p) => delCosto.includes(p)) };
      }
    });
    if (mejor.score > 0) return mejor;
  }

  señas.forEach((s) => {
    if (coincide(s, palabrasDelConcepto) && s.length > mejor.score) {
      mejor = { score: s.length, porque: s };
    }
  });

  return mejor;
}

/** Identidad del proveedor de un presupuesto, para saber si dos son el mismo. */
function identidadProveedor(p: PartidaParaImputar): string {
  const señas = señasDePartida(p);
  return señas.length > 0 ? señas[0].slice().sort().join(" ") : p.id;
}

/** Numero del presupuesto dentro del proveedor: "Albañil Juan #2 - ..." -> 2 */
export function numeroDePartida(nombre: string): number {
  const m = nombre.match(/#(\d+)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

export type MotivoNoImputado = "sin_coincidencia" | "ambiguo" | "sin_monto" | "compra_de_materiales";

export interface Imputacion {
  costId: string;
  concept: string;
  partidaId: string;
  partidaName: string;
  /** las palabras que hicieron el match, para poder auditarlo */
  porque: string[];
  /** monto del costo en pesos */
  montoArs: number;
  /** true si entro por cascada tras completarse un presupuesto anterior */
  porCascada?: boolean;
  /** true si con este costo el presupuesto queda excedido */
  excede?: boolean;
}

export interface NoImputado {
  costId: string;
  concept: string;
  motivo: MotivoNoImputado;
  candidatos?: string[];
}

/** Como queda cada presupuesto despues de imputar. */
export interface ResumenPartida {
  partidaId: string;
  partidaName: string;
  presupuestoArs: number;
  /** lo que ya tenia imputado antes de esta corrida */
  previoArs: number;
  /** lo que suma esta corrida */
  nuevoArs: number;
  cantidadNueva: number;
}

export interface PlanDeImputacion {
  imputar: Imputacion[];
  dejar: NoImputado[];
  resumen: ResumenPartida[];
}

function fechaDe(c: CostoParaImputar): number {
  if (!c.date) return 0;
  const t = new Date(c.date).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Arma el plan sin escribir nada.
 *
 * Solo toca costos que hoy no tienen presupuesto: nunca pisa una imputacion
 * que ya hizo el usuario.
 *
 * Cuando a un costo le calzan varios presupuestos DEL MISMO proveedor, no se
 * descarta: se reparte en cascada por fecha, llenando el #1 hasta agotar su
 * monto y siguiendo por el #2. Si los candidatos son de proveedores distintos
 * ahi si es ambiguedad real y no se toca.
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

  // Cuanto lleva consumido cada presupuesto por costos ya imputados a mano.
  const consumido = new Map<string, number>();
  partidas.forEach((p) => consumido.set(p.id, 0));
  costos.forEach((c) => {
    if (c.partidaId && consumido.has(c.partidaId)) {
      consumido.set(c.partidaId, (consumido.get(c.partidaId) || 0) + costArs(c));
    }
  });
  const previo = new Map(consumido);

  const pendientes = costos
    .filter((c) => !c.partidaId)
    .sort((a, b) => fechaDe(a) - fechaDe(b)); // los pagos viejos llenan primero

  // --- 1) los que tienen un unico candidato ---
  const ambiguos: { costo: CostoParaImputar; candidatos: { partida: PartidaParaImputar; porque: string[] }[] }[] = [];

  pendientes.forEach((costo) => {
    // Una compra de materiales no es plata que cobro el proveedor:
    // imputarla a su presupuesto inflaria el avance pagado.
    if (esCompraDeMateriales(costo.concept)) {
      dejar.push({
        costId: costo.id,
        concept: costo.concept,
        motivo: "compra_de_materiales",
      });
      return;
    }

    const palabras = new Set(normalizar(costo.concept).split(" "));

    // Puntaje de cada presupuesto contra este costo; gana el mas especifico.
    const conPuntaje = conSeñas
      .map((x) => ({ partida: x.partida, ...puntaje(costo.concept, x.señas, palabras) }))
      .filter((x) => x.score > 0);

    const mejorScore = conPuntaje.reduce((m, x) => Math.max(m, x.score), 0);
    const lista = conPuntaje
      .filter((x) => x.score === mejorScore)
      .map((x) => ({ partida: x.partida, porque: x.porque }));

    if (lista.length === 1) {
      const elegido = lista[0];
      imputar.push({
        costId: costo.id,
        concept: costo.concept,
        partidaId: elegido.partida.id,
        partidaName: elegido.partida.name,
        porque: elegido.porque,
        montoArs: costArs(costo),
      });
      consumido.set(elegido.partida.id, (consumido.get(elegido.partida.id) || 0) + costArs(costo));
    } else if (lista.length > 1) {
      ambiguos.push({ costo, candidatos: lista });
    } else {
      dejar.push({ costId: costo.id, concept: costo.concept, motivo: "sin_coincidencia" });
    }
  });

  // --- 2) los ambiguos: cascada si son del mismo proveedor ---
  ambiguos.forEach(({ costo, candidatos }) => {
    // Todos los candidatos comparten proveedor si comparten la misma seña.
    const firmas = new Set(candidatos.map((c) => identidadProveedor(c.partida)));
    const mismoProveedor = firmas.size === 1;

    if (!mismoProveedor) {
      dejar.push({
        costId: costo.id,
        concept: costo.concept,
        motivo: "ambiguo",
        candidatos: candidatos.map((c) => c.partida.name),
      });
      return;
    }

    // Orden de llenado: por #N, y si no tienen numero por 'order'.
    const enOrden = candidatos.slice().sort((a, b) => {
      const na = numeroDePartida(a.partida.name);
      const nb = numeroDePartida(b.partida.name);
      if (na !== nb) return na - nb;
      return (a.partida.order ?? 0) - (b.partida.order ?? 0);
    });

    const topes = enOrden.map((c) => partidaProjectedArs(c.partida));
    if (topes.every((t) => t <= 0)) {
      // Sin montos cargados no se puede saber cuando se completa uno.
      dejar.push({
        costId: costo.id,
        concept: costo.concept,
        motivo: "sin_monto",
        candidatos: enOrden.map((c) => c.partida.name),
      });
      return;
    }

    const monto = costArs(costo);

    // El primero que todavia tenga saldo. Si estan todos llenos, va al ultimo:
    // los pagos que sobran son excedente del presupuesto mas reciente.
    let destinoIdx = enOrden.findIndex(
      (c, i) => topes[i] > 0 && (consumido.get(c.partida.id) || 0) < topes[i]
    );
    const porCascada = destinoIdx > 0;
    if (destinoIdx === -1) destinoIdx = enOrden.length - 1;

    const destino = enOrden[destinoIdx];
    const yaTenia = consumido.get(destino.partida.id) || 0;
    const tope = topes[destinoIdx];

    imputar.push({
      costId: costo.id,
      concept: costo.concept,
      partidaId: destino.partida.id,
      partidaName: destino.partida.name,
      porque: destino.porque,
      montoArs: monto,
      porCascada,
      excede: tope > 0 && yaTenia + monto > tope,
    });
    consumido.set(destino.partida.id, yaTenia + monto);
  });

  // --- 3) resumen por presupuesto ---
  const resumen: ResumenPartida[] = partidas
    .map((p) => {
      const nuevos = imputar.filter((i) => i.partidaId === p.id);
      return {
        partidaId: p.id,
        partidaName: p.name,
        presupuestoArs: partidaProjectedArs(p),
        previoArs: previo.get(p.id) || 0,
        nuevoArs: nuevos.reduce((s, i) => s + i.montoArs, 0),
        cantidadNueva: nuevos.length,
      };
    })
    .filter((r) => r.cantidadNueva > 0);

  return { imputar, dejar, resumen };
}
