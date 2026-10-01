# CLAUDE.md — Negocios App (N$)

## Qué es
Sistema de seguimiento de inversiones en casas y autos ("flips"). Registra compra, costos de obra, gastos mensuales, inversores, presupuestos con cotizaciones de proveedores (IA extrae de PDF). Calcula resultado y margen. Maneja plata real con varias cuentas (multicuenta con `Organization`).

## Stack
- **Next.js 14** (App Router) + TypeScript
- **Prisma 5** + PostgreSQL en Neon
- **NextAuth** (JWT, roles: admin/colaborador/vista + superadmin)
- **Deploy en Vercel**
- **API de Anthropic** para OCR de comprobantes y presupuestos
- **Vitest** para tests unitarios
- **Multimoneda:** base USD, carga ARS con dólar blue (dolarapi / bluelytics)

## Reglas que no se negocian

1. **PROHIBIDO tocar la base de producción.** El `.env` apunta a producción. No correr: `prisma db push`, `prisma migrate`, `prisma studio`, `npm run prisma:seed`, ni scripts de `prisma/`. Sí se puede: `prisma generate`, `prisma validate`, `prisma format`.
2. **Secretos:** no leer ni imprimir valores de `.env*`.
3. **Git:** rama nueva desde `main`, commits chicos en español con el estilo `fix(costos): ...`, `feat(presupuestos): ...`. No push ni merge sin OK del dueño.
4. **No borrar datos ni archivos** sin preguntar.
5. **Cambios en schema:** aditivos y compatibles. Dejar `PASOS-*.md` con los comandos para que los corra el dueño.
6. **Patrones existentes:** `getCurrentUser`, `checkProjectAccess`, `orgScope`, `findProjectInOrg`, Zod para validación, `TimelineEvent` para registro, `notifyProjectUsers` para notificaciones. Tokens de `globals.css`. Tipografía Inter.
7. **Idioma:** español, corto y claro.

## Comandos útiles

```bash
npm run dev          # Servidor local (turbo)
npm run build        # Build de producción
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm test             # Vitest (73 tests)
npm run test:watch   # Vitest en modo watch
npx prisma generate  # Regenerar cliente Prisma
npx prisma validate  # Validar schema
npx prisma format    # Formatear schema
```

## Arquitectura clave

### Cálculos financieros
`src/lib/financial.ts` es la **única fuente de verdad**. Nadie más calcula totales, márgenes ni inversión.
- **Margen** = ganancia / inversión × 100 — siempre sobre lo invertido
- **Inversión** = buyPrice + totalCosts + totalExpenses
- `computeProjectFinancials()` — totales e inversión
- `computeBudgetProjection()` — presupuesto vs real por rubro
- `computeObraProyeccion()` — proyección de cierre de obra
- `computeRitmoObra()` — ritmo de gasto vs avance físico
- `margenSobreInversion()` — única fórmula de margen (ganancia/inversión)
- `computeHoldingMetrics()` — días de tenencia y rentabilidad anualizada

### Reglas de moneda y fechas
- **ARS sin TC no se suma:** si un registro en ARS no tiene `amountUsd` ni `exchangeRate`, se excluye del total (`sinTcCount` lo cuenta)
- **Fechas solo-fecha:** usar `fmtFecha()` de `src/lib/format.ts` con `timeZone: "UTC"` (buyDate, saleDate, period, paidDate, dueDate)
- **Formato argentino:** miles con punto, decimales con coma. `fmt()` → "USD 270.419", `fmtPct()` → "7,2%"

### Imputación automática
`src/lib/imputacion.ts` — asigna costos a presupuestos por nombre de proveedor. Regla: ante la duda, no imputar. Cascada solo entre presupuestos del mismo proveedor.

### Seguridad
- Toda ruta filtra por `organizationId` del usuario (multicuenta)
- `checkProjectAccess()` verifica org ANTES que roles
- Rate limit en memoria (mitigación temporal, no Redis)
- Tokens de verificación/reset hasheados con SHA-256 y de un solo uso

### Modales
Los 9 modales usan:
- `useModalA11y()` para focus trap + Escape
- `role="dialog"`, `aria-modal`, `aria-labelledby`
- Clases CSS: `.modal-overlay`, `.modal-panel`, `.modal-title`, `.modal-label`, `.modal-actions`

### Tests
- `src/lib/__tests__/financial.test.ts` — 46 tests de cálculos financieros
- `src/lib/__tests__/imputacion.test.ts` — 27 tests de auto-imputación
- Total: 73 tests, todos verdes

## Archivos clave
- `prisma/schema.prisma` — 14 modelos
- `src/lib/financial.ts` — cálculos financieros (~580 líneas)
- `src/lib/imputacion.ts` — imputación automática (~430 líneas)
- `src/lib/api-helpers.ts` — getCurrentUser, checkProjectAccess, orgScope, schemas Zod
- `src/lib/auth.ts` — NextAuth config con JWT (7 días)
- `src/lib/dolar.ts` — cotización blue con fallback
- `src/app/globals.css` — sistema de tokens CSS + clases de modal
- `src/app/project/[id]/page.tsx` — detalle de proyecto (~900 líneas)
- `src/components/ObraDetalle.tsx` — detalle de obra con proyección
- `src/hooks/useModalA11y.ts` — focus trap y Escape para modales
