# PASOS — Tanda 6: campo dueDate en Expense

## Cambio en schema
Se agrega `dueDate DateTime?` al modelo `Expense`.
Campo opcional con default null: los gastos existentes quedan iguales.

## Pasos

### 1. Backup
```bash
# Descargar un snapshot de la base antes de tocar nada.
# Desde Neon dashboard: Settings > Branching > Create Branch
# O exportar con pg_dump si tenés acceso directo.
```

### 2. Aplicar el cambio
```bash
cd negocios-app
npx prisma db push
```

Esto agrega la columna `dueDate` (nullable) a la tabla `Expense`.
No borra ni modifica datos existentes.

### 3. Verificar
```sql
-- En la consola SQL de Neon:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Expense' AND column_name = 'dueDate';
-- Deberia devolver: dueDate | timestamp without time zone | YES
```

### 4. Probar en la app
- Cargar un gasto con fecha de vencimiento
- Verificar que aparezca en alertas cuando falten <= 7 dias

## Rollback
Si algo sale mal:
```sql
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "dueDate";
```
