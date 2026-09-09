# Multi-cuenta — qué cambió y cómo se activa

## La idea en una línea

Antes el rol `admin` veía **todos** los proyectos de la base. Ahora cada proyecto
y cada usuario pertenecen a una **cuenta** (`Organization`), y todas las consultas
filtran por la cuenta del usuario logueado. Vos seguís siendo admin de la tuya y
ves exactamente lo de siempre; tu amigo entra a una cuenta nueva y ve el sistema vacío.

## Lo que hay que correr (en tu Mac, en la carpeta `negocios-app`)

> Estos pasos tocan la base de producción. El paso 1 no es opcional.

```bash
# 1. Backup completo de la base a un JSON (queda en ./backups/)
npx tsx prisma/backup-datos.ts

# 2. Regenerar el cliente de Prisma con los modelos nuevos
npx prisma generate

# 3. Crear en la base la tabla Organization y las columnas nuevas
#    (son columnas opcionales: no borra ni modifica ningún dato existente)
npx prisma db push

# 4. Meter todo lo que ya existe dentro de tu cuenta y marcarte como superadmin
npx tsx prisma/migrar-a-multicuenta.ts "Charlie" carlosracca1@gmail.com

# 5. Verificar que compila
npm run build
```

El paso 4 imprime cuántos usuarios y proyectos asignó y verifica que no haya
quedado nada suelto. Si algo falla, no aplica nada (va todo en una transacción).

## Después de migrar

1. **Cerrá sesión y volvé a entrar.** Tu sesión vieja no sabe que sos superadmin.
2. Te aparece el botón **"Cuentas"** en la barra de arriba (`/admin/cuentas`).
3. Ahí creás la cuenta de tu amigo: nombre de la cuenta, nombre del admin, email
   y una contraseña inicial que le pasás. Entra directo, sin verificar mail.
4. Él ve el sistema vacío, crea sus proyectos y suma a su propia gente.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Modelo `Organization`; `organizationId` e `isSuperAdmin` en `User`; `organizationId` en `Project` |
| `src/lib/api-helpers.ts` | `getCurrentUser` trae la cuenta desde la base; `orgScope()`, `findProjectInOrg()`, `findUserInOrg()`; `checkProjectAccess` corta por cuenta **antes** de mirar el rol |
| `src/lib/notifications.ts` | Las notificaciones ya no van a todos los admins del sistema, solo a los de la cuenta dueña del proyecto |
| `src/lib/auth.ts`, `src/types/next-auth.d.ts` | La sesión lleva `organizationId` e `isSuperAdmin` |
| 12 rutas de `/api/projects/...` | `project.findUnique({id})` → `findFirst({id, organizationId})` |
| `/api/projects`, `/api/alerts` | Los listados filtran por cuenta; el proyecto nuevo nace en la cuenta de quien lo crea |
| `/api/users`, `/api/auth/register` | Listar y crear usuarios, solo dentro de la propia cuenta |
| `/api/projects/[id]/access` | Solo se comparte con usuarios de la misma cuenta |
| `/api/superadmin/cuentas` + `/admin/cuentas` | Alta y listado de cuentas (solo superadmin) |

## Decisiones que conviene tener presentes

- **El superadmin no espía.** Ve la lista de cuentas y cuántos proyectos tiene
  cada una, pero no puede abrir los datos de otra cuenta. Si alguna vez querés
  entrar a la de tu amigo para ayudarlo, se agrega aparte.
- **Un email = un usuario en todo el sistema.** No se puede usar el mismo mail
  en dos cuentas distintas.
- **Un usuario sin cuenta no entra a nada.** Es a propósito: preferimos dejar a
  alguien afuera antes que mostrarle datos ajenos por un filtro mal comparado.
- Las columnas nuevas son opcionales en la base para que la migración no rompa
  filas viejas. El código igual exige que estén.

## Si algo sale mal

El backup del paso 1 tiene todas las tablas en JSON. Las columnas que agregamos
son nuevas y opcionales: volver atrás es sacar el código (`git checkout main`) —
la base con columnas de más sigue funcionando con el código viejo.
