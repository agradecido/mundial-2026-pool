import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env en lugar de env() para que `prisma generate` no falle
    // si la variable no está disponible (p.ej. en entornos sin BD)
    url: process.env.PORRA_POSTGRES_URL_NON_POOLING ?? "",
  },
});
