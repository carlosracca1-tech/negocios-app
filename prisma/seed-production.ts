import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding production database...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "carlosracca1@gmail.com" },
    update: { role: "admin" },
    create: {
      email: "carlosracca1@gmail.com",
      name: "Carlos Racca",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin user created: carlosracca1@gmail.com");
  console.log("Production seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
