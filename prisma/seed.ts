import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const mockProjects = [
  {
    name: "Casa Florida",
    type: "Casa",
    address: "Calle Principal 123, Florida",
    buyPrice: 250000,
    salePrice: 380000,
    listingPrice: 385000,
    buyDate: new Date("2023-01-15"),
    costs: [
      { concept: "Reparación de techo", amount: 5000, category: "Obra", costType: "material" },
      { concept: "Mano de obra techo", amount: 8000, category: "Obra", costType: "mano_de_obra" },
      { concept: "Pintura exterior", amount: 3000, category: "Estética", costType: "material" },
      { concept: "Pintura interior", amount: 2000, category: "Estética", costType: "material" },
      { concept: "Reparación de pisos", amount: 4500, category: "Obra", costType: "material" },
    ],
    investors: [{ name: "Roberto Racca", capitalPercentage: 100, profitPercentage: 100 }],
  },
  {
    name: "Casa Quilmes",
    type: "Casa",
    address: "Avenida San Martín 456, Quilmes",
    buyPrice: 180000,
    salePrice: 280000,
    listingPrice: 285000,
    buyDate: new Date("2023-03-20"),
    costs: [
      { concept: "Refacción integral", amount: 15000, category: "Obra", costType: "mano_de_obra" },
      { concept: "Materiales construcción", amount: 12000, category: "Obra", costType: "material" },
      { concept: "Remodelación baños", amount: 6000, category: "Estética", costType: "material" },
      { concept: "Electricista", amount: 3500, category: "Profesionales", costType: "mano_de_obra" },
    ],
    investors: [{ name: "Roberto Racca", capitalPercentage: 100, profitPercentage: 100 }],
  },
  {
    name: "Casa Avellaneda",
    type: "Casa",
    address: "Pasaje del Comercio 789, Avellaneda",
    buyPrice: 210000,
    salePrice: 320000,
    listingPrice: 325000,
    buyDate: new Date("2023-05-10"),
    costs: [
      { concept: "Estructuras", amount: 20000, category: "Obra", costType: "material" },
      { concept: "Mano de obra estructuras", amount: 10000, category: "Obra", costType: "mano_de_obra" },
      { concept: "Pisos y revestimientos", amount: 8000, category: "Estética", costType: "material" },
      { concept: "Plomería", amount: 4000, category: "Profesionales", costType: "mano_de_obra" },
    ],
    investors: [{ name: "Roberto Racca", capitalPercentage: 100, profitPercentage: 100 }],
  },
  {
    name: "Casa Temperley",
    type: "Casa",
    address: "Camino de Cintura 234, Temperley",
    buyPrice: 195000,
    salePrice: 295000,
    listingPrice: 300000,
    buyDate: new Date("2023-07-05"),
    costs: [
      { concept: "Refacción parcial", amount: 10000, category: "Obra", costType: "mano_de_obra" },
      { concept: "Pintura fachada", amount: 2500, category: "Estética", costType: "material" },
      { concept: "Reparación ventanas", amount: 1500, category: "Obra", costType: "material" },
    ],
    investors: [{ name: "Roberto Racca", capitalPercentage: 100, profitPercentage: 100 }],
  },
  {
    name: "Auto Hilux 2010",
    type: "Auto",
    address: "Depósito Centro",
    buyPrice: 18000,
    salePrice: 26000,
    listingPrice: 27000,
    buyDate: new Date("2023-02-01"),
    costs: [
      { concept: "Revisión mecánica completa", amount: 800, category: "Mecánica", costType: "mano_de_obra" },
      { concept: "Cambio de aceite y filtros", amount: 250, category: "Mecánica", costType: "material" },
      { concept: "Reparación amortiguadores", amount: 600, category: "Mecánica", costType: "material" },
      { concept: "Pintura y detallado", amount: 1500, category: "Estética", costType: "mano_de_obra" },
      { concept: "Tapizado interior", amount: 900, category: "Estética", costType: "material" },
      { concept: "Neumáticos nuevos", amount: 800, category: "Mecánica", costType: "material" },
    ],
    investors: [
      { name: "Roberto Racca", capitalPercentage: 60, profitPercentage: 60 },
      { name: "Martín López", capitalPercentage: 40, profitPercentage: 40 },
    ],
  },
  {
    name: "Casa Belgrano",
    type: "Casa",
    address: "Avenida del Libertador 890, Belgrano",
    buyPrice: 320000,
    salePrice: 480000,
    listingPrice: 490000,
    buyDate: new Date("2023-04-12"),
    costs: [
      { concept: "Reforma integral", amount: 45000, category: "Obra", costType: "mano_de_obra" },
      { concept: "Materiales reforma", amount: 35000, category: "Obra", costType: "material" },
      { concept: "Diseño interior", amount: 5000, category: "Profesionales", costType: "mano_de_obra" },
      { concept: "Acabados premium", amount: 8000, category: "Estética", costType: "material" },
    ],
    investors: [
      { name: "Roberto Racca", capitalPercentage: 50, profitPercentage: 50 },
      { name: "Ana García", capitalPercentage: 50, profitPercentage: 50 },
    ],
  },
  {
    name: "Auto Ford Ranger 2008",
    type: "Auto",
    address: "Depósito Centro",
    buyPrice: 15000,
    salePrice: 22000,
    listingPrice: 23000,
    buyDate: new Date("2023-06-15"),
    costs: [
      { concept: "Motor revisado", amount: 1200, category: "Mecánica", costType: "mano_de_obra" },
      { concept: "Frenos nuevos", amount: 500, category: "Mecánica", costType: "material" },
      { concept: "Pintura parcial", amount: 1000, category: "Estética", costType: "mano_de_obra" },
      { concept: "Nuevos neumáticos", amount: 600, category: "Mecánica", costType: "material" },
    ],
    investors: [{ name: "Roberto Racca", capitalPercentage: 100, profitPercentage: 100 }],
  },
  {
    name: "Casa San Justo",
    type: "Casa",
    address: "Ruta Nacional 5 km 23, San Justo",
    buyPrice: 165000,
    salePrice: 245000,
    listingPrice: 250000,
    buyDate: new Date("2023-08-20"),
    costs: [
      { concept: "Limpieza y demolición selectiva", amount: 3000, category: "Obra", costType: "mano_de_obra" },
      { concept: "Reconstrucción parcial", amount: 12000, category: "Obra", costType: "material" },
      { concept: "Nuevas instalaciones", amount: 5000, category: "Profesionales", costType: "mano_de_obra" },
    ],
    investors: [{ name: "Roberto Racca", capitalPercentage: 100, profitPercentage: 100 }],
  },
];

async function main() {
  console.log("Seeding database...");

  // Usar passwords de env vars o generar aleatorias (NUNCA hardcoded en produccion)
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomUUID().slice(0, 12);
  const userPassword = process.env.SEED_USER_PASSWORD || crypto.randomUUID().slice(0, 12);

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const hashedUserPassword = await bcrypt.hash(userPassword, 10);

  console.log("=== CREDENCIALES DE SEED ===");
  console.log(`Admin:  admin@negocios.com  / ${adminPassword}`);
  console.log(`Martin: martin@negocios.com / ${userPassword}`);
  console.log(`Ana:    ana@negocios.com    / ${userPassword}`);
  console.log("============================");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@negocios.com" },
    update: {},
    create: {
      email: "admin@negocios.com",
      name: "Admin User",
      password: hashedAdminPassword,
      role: "admin",
    },
  });

  const martinUser = await prisma.user.upsert({
    where: { email: "martin@negocios.com" },
    update: {},
    create: {
      email: "martin@negocios.com",
      name: "Martín López",
      password: hashedUserPassword,
      role: "vista",
    },
  });

  const anaUser = await prisma.user.upsert({
    where: { email: "ana@negocios.com" },
    update: {},
    create: {
      email: "ana@negocios.com",
      name: "Ana García",
      password: hashedUserPassword,
      role: "vista",
    },
  });

  console.log("Created users:", { adminUser: adminUser.id, martin: martinUser.id, ana: anaUser.id });

  for (const mockProject of mockProjects) {
    const { costs, investors, ...projectData } = mockProject;

    let project = await prisma.project.findFirst({
      where: { name: projectData.name },
    });
    if (!project) {
      project = await prisma.project.create({
        data: {
          ...projectData,
          buyDate: projectData.buyDate,
        },
      });
    }

    for (const costData of costs) {
      await prisma.cost.upsert({
        where: {
          id: `${project.id}_${costData.concept}`,
        },
        update: {},
        create: {
          projectId: project.id,
          concept: costData.concept,
          amount: costData.amount,
          category: costData.category,
          costType: costData.costType,
          date: new Date(),
        },
      });
    }

    for (const investorData of investors) {
      await prisma.investor.create({
        data: {
          projectId: project.id,
          name: investorData.name,
          capitalPercentage: investorData.capitalPercentage,
          profitPercentage: investorData.profitPercentage,
        },
      });
    }

    await prisma.projectAccess.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: adminUser.id,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        userId: adminUser.id,
        role: "interactuar",
      },
    });

    await prisma.timelineEvent.create({
      data: {
        projectId: project.id,
        action: "created",
        detail: `Project ${projectData.name} created`,
      },
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
