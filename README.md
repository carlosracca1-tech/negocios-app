# Negocios App

Sistema de seguimiento de inversiones en casas y autos. Next.js 14 + PostgreSQL + Prisma + NextAuth.

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL y NEXTAUTH_SECRET

# 3. Base de datos
npx prisma generate
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts

# 4. Correr
npm run dev
# Abrir http://localhost:3000
```

## Credenciales de prueba

- **Admin:** admin@negocios.com / admin123
- **Usuario 1:** martin@mail.com / user123
- **Usuario 2:** ana@mail.com / user123

## Deploy en Vercel + Neon (PostgreSQL)

### 1. Base de datos (Neon)
1. Crear cuenta en [neon.tech](https://neon.tech)
2. Crear proyecto, copiar connection string
3. Usarla como `DATABASE_URL`

### 2. Deploy (Vercel)
1. Subir repo a GitHub
2. Importar en [vercel.com](https://vercel.com)
3. Variables de entorno:
   - `DATABASE_URL` = connection string de Neon
   - `NEXTAUTH_SECRET` = generar con `openssl rand -base64 32`
   - `NEXTAUTH_URL` = URL de tu deploy
4. Build command: `npx prisma generate && next build`
5. Deploy

### 3. Seed en producción
```bash
DATABASE_URL="tu-connection-string" npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

## Estructura

```
negocios-app/
├── prisma/
│   ├── schema.prisma      # 7 modelos: User, Project, Cost, Investor, ProjectAccess, TimelineEvent
│   └── seed.ts            # Datos iniciales (8 proyectos, 3 usuarios)
├── src/
│   ├── app/
│   │   ├── api/           # 9 API routes (projects, costs, investors, access, timeline, users, alerts)
│   │   ├── login/         # Página de login
│   │   ├── project/[id]/  # Dashboard por proyecto
│   │   └── page.tsx       # Grid de tarjetas (home)
│   ├── components/        # 14 componentes (Header, ProjectCard, modals, etc.)
│   ├── hooks/             # useProjects, useProject, useAlerts
│   ├── lib/               # Prisma client, auth config, API helpers
│   └── types/             # TypeScript interfaces
```
