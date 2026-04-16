import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ====================================================================
// Casa Golfers - Datos reales extraídos del Excel original
// Valor de publicación: USD 290,000
// Total invertido: USD 251,234.61
// ====================================================================

const casaGolfersCosts = [
    { concept: "Reserva de la casa", amount: 2000, category: "Servicios", costType: "material", date: new Date("2023-12-07T00:00:00.000Z") },
    { concept: "Membresía de Golfers", amount: 15000, category: "Servicios", costType: "material", date: new Date("2023-12-07T00:00:00.000Z") },
    { concept: "Comisión inmobiliaria", amount: 4640, category: "Profesionales", costType: "mano_de_obra", date: new Date("2023-12-07T00:00:00.000Z") },
    { concept: "Gastos de escrituración", amount: 1419.81, category: "Profesionales", costType: "mano_de_obra", date: new Date("2023-12-07T00:00:00.000Z") },
    { concept: "Expensas", amount: 15574.69, category: "Servicios", costType: "material", date: new Date("2023-12-07T00:00:00.000Z") },
    { concept: "Cerco", amount: 641.98, category: "Obra", costType: "material", date: new Date("2024-01-29T00:00:00.000Z") },
    { concept: "Cerco #2", amount: 554.42, category: "Obra", costType: "material", date: new Date("2024-02-22T00:00:00.000Z") },
    { concept: "Techo Chapa", amount: 5500.0, category: "Obra", costType: "material", date: new Date("2024-02-26T00:00:00.000Z") },
    { concept: "Montaños Honorarios", amount: 280.37, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-02-27T00:00:00.000Z") },
    { concept: "Montaños Honorarios #2", amount: 388.35, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-03-03T00:00:00.000Z") },
    { concept: "Volquete", amount: 48.08, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-03-04T00:00:00.000Z") },
    { concept: "Baño quimico", amount: 37.5, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-03-04T00:00:00.000Z") },
    { concept: "Volquete #2", amount: 49.75, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-03-05T00:00:00.000Z") },
    { concept: "Porcelanatos galeria", amount: 1618.37, category: "Obra", costType: "material", date: new Date("2024-03-07T00:00:00.000Z") },
    { concept: "Techo Chapa #2", amount: 512.82, category: "Obra", costType: "material", date: new Date("2024-03-08T00:00:00.000Z") },
    { concept: "Montaños Honorarios #3", amount: 323.08, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-03-08T00:00:00.000Z") },
    { concept: "Corralon materiales", amount: 1033.33, category: "Obra", costType: "material", date: new Date("2024-03-08T00:00:00.000Z") },
    { concept: "Montaños Honorarios #4", amount: 154.62, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-03-11T00:00:00.000Z") },
    { concept: "Techo Chapa #3", amount: 507.61, category: "Obra", costType: "material", date: new Date("2024-03-11T00:00:00.000Z") },
    { concept: "Pago rafia y flete", amount: 117.65, category: "Obra", costType: "material", date: new Date("2024-03-20T00:00:00.000Z") },
    { concept: "Techo Chapa #4", amount: 392.16, category: "Obra", costType: "material", date: new Date("2024-03-21T00:00:00.000Z") },
    { concept: "Montaños Honorarios #5", amount: 495.05, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-03-25T00:00:00.000Z") },
    { concept: "Corralon materiales #2", amount: 171.01, category: "Obra", costType: "material", date: new Date("2024-03-26T00:00:00.000Z") },
    { concept: "Volquete #3", amount: 50.0, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-03-26T00:00:00.000Z") },
    { concept: "Montaños Honorarios #6", amount: 200.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-03-28T00:00:00.000Z") },
    { concept: "Techo Chapa #5", amount: 1002.5, category: "Obra", costType: "material", date: new Date("2024-04-04T00:00:00.000Z") },
    { concept: "Plano Sanchez", amount: 150.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-04-04T00:00:00.000Z") },
    { concept: "Poda", amount: 274.11, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-04-11T00:00:00.000Z") },
    { concept: "Montaños Honorarios #7", amount: 406.09, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-04-12T00:00:00.000Z") },
    { concept: "Hierros Pergola", amount: 3601.72, category: "Obra", costType: "material", date: new Date("2024-04-17T00:00:00.000Z") },
    { concept: "Corralon materiales #3", amount: 108.77, category: "Obra", costType: "material", date: new Date("2024-04-17T00:00:00.000Z") },
    { concept: "Corralon materiales #4", amount: 72.51, category: "Obra", costType: "material", date: new Date("2024-05-09T00:00:00.000Z") },
    { concept: "Montaños Honorarios #8", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-05-10T00:00:00.000Z") },
    { concept: "Montaños Honorarios #9", amount: 273.97, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-05-18T00:00:00.000Z") },
    { concept: "Materiales montaño", amount: 182.65, category: "Obra", costType: "material", date: new Date("2024-05-18T00:00:00.000Z") },
    { concept: "Montaños Honorarios #10", amount: 601.64, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-05-21T00:00:00.000Z") },
    { concept: "Montaños Honorarios #11", amount: 411.52, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-05-31T00:00:00.000Z") },
    { concept: "Materiales montaño #2", amount: 486.42, category: "Obra", costType: "material", date: new Date("2024-05-31T00:00:00.000Z") },
    { concept: "Montaños Honorarios #12", amount: 396.83, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-06-08T00:00:00.000Z") },
    { concept: "Corralon materiales #5", amount: 150.59, category: "Obra", costType: "material", date: new Date("2024-06-25T00:00:00.000Z") },
    { concept: "Montaños Honorarios #13", amount: 446.1, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-06-27T00:00:00.000Z") },
    { concept: "Corralon materiales #6", amount: 135.19, category: "Obra", costType: "material", date: new Date("2024-06-28T00:00:00.000Z") },
    { concept: "Montaños Honorarios #14", amount: 354.61, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-07-05T00:00:00.000Z") },
    { concept: "Montaños Honorarios #15", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-07-16T00:00:00.000Z") },
    { concept: "Materiales montaño #3", amount: 261.65, category: "Obra", costType: "material", date: new Date("2024-07-16T00:00:00.000Z") },
    { concept: "Porcelanatos interior", amount: 90.57, category: "Obra", costType: "material", date: new Date("2024-07-22T00:00:00.000Z") },
    { concept: "Porcelanatos interior #2", amount: 265.73, category: "Obra", costType: "material", date: new Date("2024-07-23T00:00:00.000Z") },
    { concept: "Rejillas de ducha", amount: 50.35, category: "Obra", costType: "material", date: new Date("2024-07-23T00:00:00.000Z") },
    { concept: "Columna barral ducha", amount: 110.93, category: "Obra", costType: "material", date: new Date("2024-07-23T00:00:00.000Z") },
    { concept: "Juego baño completo", amount: 245.24, category: "Obra", costType: "material", date: new Date("2024-07-23T00:00:00.000Z") },
    { concept: "Inodoro largo con", amount: 134.97, category: "Obra", costType: "material", date: new Date("2024-07-23T00:00:00.000Z") },
    { concept: "Corralon materiales #7", amount: 79.47, category: "Obra", costType: "material", date: new Date("2024-08-01T00:00:00.000Z") },
    { concept: "Montaños Honorarios #16", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-08-01T00:00:00.000Z") },
    { concept: "Montaños Honorarios #17", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-08-08T00:00:00.000Z") },
    { concept: "Materiales montaño #4", amount: 404.41, category: "Obra", costType: "material", date: new Date("2024-08-08T00:00:00.000Z") },
    { concept: "Techo Chapa #6", amount: 1338.29, category: "Obra", costType: "material", date: new Date("2024-08-15T00:00:00.000Z") },
    { concept: "Montaños Honorarios #18", amount: 444.44, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-08-22T00:00:00.000Z") },
    { concept: "Materiales montaño #5", amount: 200.0, category: "Obra", costType: "material", date: new Date("2024-08-22T00:00:00.000Z") },
    { concept: "Corralon materiales #8", amount: 187.57, category: "Obra", costType: "material", date: new Date("2024-08-29T00:00:00.000Z") },
    { concept: "Materiales montaño #6", amount: 435.1, category: "Obra", costType: "material", date: new Date("2024-08-29T00:00:00.000Z") },
    { concept: "Montaños Honorarios #19", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-08-29T00:00:00.000Z") },
    { concept: "Montaños Honorarios #20", amount: 600.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-09-06T00:00:00.000Z") },
    { concept: "Materiales montaño #7", amount: 112.8, category: "Obra", costType: "material", date: new Date("2024-09-06T00:00:00.000Z") },
    { concept: "Losa Radiante", amount: 704.0, category: "Obra", costType: "material", date: new Date("2024-09-06T00:00:00.000Z") },
    { concept: "Montaños Honorarios #21", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-09-12T00:00:00.000Z") },
    { concept: "Corralon materiales #9", amount: 100.43, category: "Obra", costType: "material", date: new Date("2024-09-19T00:00:00.000Z") },
    { concept: "Puerta ventana", amount: 240.0, category: "Obra", costType: "material", date: new Date("2024-09-19T00:00:00.000Z") },
    { concept: "Montaños Honorarios #22", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-09-19T00:00:00.000Z") },
    { concept: "Montaños Honorarios #23", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-09-26T00:00:00.000Z") },
    { concept: "Materiales montaño #8", amount: 553.28, category: "Obra", costType: "material", date: new Date("2024-09-26T00:00:00.000Z") },
    { concept: "Techo Chapa #7", amount: 1106.56, category: "Obra", costType: "material", date: new Date("2024-09-29T00:00:00.000Z") },
    { concept: "Techo Chapa #8", amount: 163.27, category: "Obra", costType: "material", date: new Date("2024-10-01T00:00:00.000Z") },
    { concept: "Corralon materiales #10", amount: 124.28, category: "Obra", costType: "material", date: new Date("2024-10-03T00:00:00.000Z") },
    { concept: "Montaños Honorarios #24", amount: 600.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-10-03T00:00:00.000Z") },
    { concept: "Volquete #4", amount: 62.24, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-10-03T00:00:00.000Z") },
    { concept: "Volquete #5", amount: 64.1, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-10-10T00:00:00.000Z") },
    { concept: "Montaños Honorarios #25", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-10-10T00:00:00.000Z") },
    { concept: "Montaños Honorarios #26", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-10-17T00:00:00.000Z") },
    { concept: "Volquete #6", amount: 61.98, category: "Servicios", costType: "mano_de_obra", date: new Date("2024-10-17T00:00:00.000Z") },
    { concept: "Pintura", amount: 314.05, category: "Obra", costType: "material", date: new Date("2024-10-17T00:00:00.000Z") },
    { concept: "Materiales montaño #9", amount: 63.22, category: "Obra", costType: "material", date: new Date("2024-10-17T00:00:00.000Z") },
    { concept: "Lavarropas", amount: 545.45, category: "Obra", costType: "material", date: new Date("2024-10-17T00:00:00.000Z") },
    { concept: "Lavavajillas", amount: 247.93, category: "Obra", costType: "material", date: new Date("2024-10-17T00:00:00.000Z") },
    { concept: "Montaños Honorarios #27", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-10-22T00:00:00.000Z") },
    { concept: "Aire Acondicionado", amount: 809.72, category: "Obra", costType: "material", date: new Date("2024-10-22T00:00:00.000Z") },
    { concept: "Puerta ventana #2", amount: 1295.55, category: "Obra", costType: "material", date: new Date("2024-10-22T00:00:00.000Z") },
    { concept: "Agrimensura", amount: 244.44, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-11-19T00:00:00.000Z") },
    { concept: "Montaños Honorarios #28", amount: 600.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-12-23T00:00:00.000Z") },
    { concept: "Materiales montaño #10", amount: 33.61, category: "Obra", costType: "material", date: new Date("2024-12-23T00:00:00.000Z") },
    { concept: "Montaños Honorarios #29", amount: 16.81, category: "Profesionales", costType: "mano_de_obra", date: new Date("2024-12-23T00:00:00.000Z") },
    { concept: "Corralon materiales #11", amount: 195.12, category: "Obra", costType: "material", date: new Date("2025-01-23T00:00:00.000Z") },
    { concept: "Piso simil madera", amount: 1066.36, category: "Obra", costType: "material", date: new Date("2025-01-23T00:00:00.000Z") },
    { concept: "Montaños Honorarios #30", amount: 800.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-01-27T00:00:00.000Z") },
    { concept: "Materiales montaño #11", amount: 121.81, category: "Obra", costType: "material", date: new Date("2025-01-29T00:00:00.000Z") },
    { concept: "Volquete #7", amount: 80.0, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-01-31T00:00:00.000Z") },
    { concept: "Materiales montaño #12", amount: 348.12, category: "Obra", costType: "material", date: new Date("2025-02-07T00:00:00.000Z") },
    { concept: "Montaños Honorarios #31", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-02-12T00:00:00.000Z") },
    { concept: "Montaños Honorarios #32", amount: 700.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-02-25T00:00:00.000Z") },
    { concept: "Corralon materiales #12", amount: 883.27, category: "Obra", costType: "material", date: new Date("2025-02-25T00:00:00.000Z") },
    { concept: "Montaños Honorarios #33", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-03-07T00:00:00.000Z") },
    { concept: "Montaños Honorarios #34", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-03-17T00:00:00.000Z") },
    { concept: "Materiales montaño #13", amount: 1315.0, category: "Obra", costType: "material", date: new Date("2025-03-17T00:00:00.000Z") },
    { concept: "Placares habitaciones", amount: 1479.52, category: "Obra", costType: "material", date: new Date("2025-03-18T00:00:00.000Z") },
    { concept: "Losa Radiante #2", amount: 300.0, category: "Obra", costType: "material", date: new Date("2025-03-18T00:00:00.000Z") },
    { concept: "Montaños Honorarios #35", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-03-27T00:00:00.000Z") },
    { concept: "Materiales montaño #14", amount: 392.31, category: "Obra", costType: "material", date: new Date("2025-04-04T00:00:00.000Z") },
    { concept: "Corralon materiales #13", amount: 340.74, category: "Obra", costType: "material", date: new Date("2025-04-11T00:00:00.000Z") },
    { concept: "Escalera", amount: 925.93, category: "Obra", costType: "material", date: new Date("2025-04-11T00:00:00.000Z") },
    { concept: "Montaños Honorarios #36", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-04-11T00:00:00.000Z") },
    { concept: "Nivelacion terreno", amount: 1233.48, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-04-21T00:00:00.000Z") },
    { concept: "Sistema de riego", amount: 1000.0, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-04-22T00:00:00.000Z") },
    { concept: "Sistema de riego #2", amount: 1100.0, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-04-26T00:00:00.000Z") },
    { concept: "Nivelacion terreno #2", amount: 652.36, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-04-24T00:00:00.000Z") },
    { concept: "Montaños Honorarios #37", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-04-28T00:00:00.000Z") },
    { concept: "Carpintero Mueble cocina", amount: 847.46, category: "Obra", costType: "material", date: new Date("2025-05-06T00:00:00.000Z") },
    { concept: "Losa Radiante #3", amount: 34.19, category: "Obra", costType: "material", date: new Date("2025-05-08T00:00:00.000Z") },
    { concept: "Montaños Honorarios #38", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-05-08T00:00:00.000Z") },
    { concept: "Montaños Honorarios #39", amount: 500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-05-15T00:00:00.000Z") },
    { concept: "Corralon materiales #14", amount: 181.82, category: "Obra", costType: "material", date: new Date("2025-05-15T00:00:00.000Z") },
    { concept: "Montaños Honorarios #40", amount: 414.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-05-22T00:00:00.000Z") },
    { concept: "Escalera #2", amount: 541.13, category: "Obra", costType: "material", date: new Date("2025-05-22T00:00:00.000Z") },
    { concept: "Zocalos", amount: 129.87, category: "Obra", costType: "material", date: new Date("2025-05-22T00:00:00.000Z") },
    { concept: "Nivelacion terreno #3", amount: 689.66, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-05-30T00:00:00.000Z") },
    { concept: "Perforacion bomba", amount: 1189.66, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-05-30T00:00:00.000Z") },
    { concept: "Volquete #8", amount: 86.21, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-05-30T00:00:00.000Z") },
    { concept: "Pintura #15", amount: 517.24, category: "Obra", costType: "material", date: new Date("2025-05-30T00:00:00.000Z") },
    { concept: "Materiales montaño #15", amount: 545.69, category: "Obra", costType: "material", date: new Date("2025-05-30T00:00:00.000Z") },
    { concept: "Zocalos #2", amount: 129.31, category: "Obra", costType: "material", date: new Date("2025-05-30T00:00:00.000Z") },
    { concept: "Montaños Honorarios #41", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-05-05T00:00:00.000Z") },
    { concept: "Montaños Honorarios #42", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-06-05T00:00:00.000Z") },
    { concept: "Montaños Honorarios #43", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-06-17T00:00:00.000Z") },
    { concept: "Electricidad Parque", amount: 474.96, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-06-19T00:00:00.000Z") },
    { concept: "Reflectores parque", amount: 127.04, category: "Obra", costType: "material", date: new Date("2025-05-31T00:00:00.000Z") },
    { concept: "materiales montaño #16", amount: 656.65, category: "Obra", costType: "material", date: new Date("2025-06-23T00:00:00.000Z") },
    { concept: "Sistema de riego #3", amount: 461.67, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-07-01T00:00:00.000Z") },
    { concept: "Bacha blanca baño arriba", amount: 62.5, category: "Obra", costType: "material", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Bacha lavadero", amount: 34.62, category: "Obra", costType: "material", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Bacha negra baño abajo", amount: 64.38, category: "Obra", costType: "material", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Griferia bidet", amount: 40.19, category: "Obra", costType: "material", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Monocomando negra", amount: 17.16, category: "Obra", costType: "material", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Monocomando blanca", amount: 20.77, category: "Obra", costType: "material", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Montaños Honorarios #44", amount: 1500.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-06-26T00:00:00.000Z") },
    { concept: "Montaños Honorarios #45", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-07-03T00:00:00.000Z") },
    { concept: "Montaños Honorarios #46", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Escalera #4", amount: 480.77, category: "Obra", costType: "material", date: new Date("2025-07-10T00:00:00.000Z") },
    { concept: "Lampara ratan D42", amount: 182.48, category: "Obra", costType: "material", date: new Date("2025-07-03T00:00:00.000Z") },
    { concept: "Lampara ratan D31", amount: 59.5, category: "Obra", costType: "material", date: new Date("2025-07-03T00:00:00.000Z") },
    { concept: "Griferia", amount: 24.0, category: "Obra", costType: "material", date: new Date("2025-07-17T00:00:00.000Z") },
    { concept: "Montaños Honorarios #47", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-07-17T00:00:00.000Z") },
    { concept: "materiales montaño #17", amount: 336.0, category: "Obra", costType: "material", date: new Date("2025-07-17T00:00:00.000Z") },
    { concept: "Montaños Honorarios #48", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-07-25T00:00:00.000Z") },
    { concept: "Mueble lavadero Montaño", amount: 324.43, category: "Obra", costType: "material", date: new Date("2025-07-29T00:00:00.000Z") },
    { concept: "Montaños Honorarios #48", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-08-05T00:00:00.000Z") },
    { concept: "Mesada afuera", amount: 217.56, category: "Obra", costType: "material", date: new Date("2025-08-14T00:00:00.000Z") },
    { concept: "Frente parrilla", amount: 572.52, category: "Obra", costType: "material", date: new Date("2025-08-14T00:00:00.000Z") },
    { concept: "Montaños Honorarios #49", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-08-14T00:00:00.000Z") },
    { concept: "Marmol silestone cocina", amount: 1000.0, category: "Obra", costType: "material", date: new Date("2025-08-20T00:00:00.000Z") },
    { concept: "Iluminacion Center", amount: 263.16, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-08-23T00:00:00.000Z") },
    { concept: "Herrajes puertas interiores", amount: 54.89, category: "Obra", costType: "material", date: new Date("2025-08-23T00:00:00.000Z") },
    { concept: "Marmol silestone cocina #2", amount: 920.0, category: "Obra", costType: "material", date: new Date("2025-08-29T00:00:00.000Z") },
    { concept: "Anafe y campana", amount: 488.89, category: "Obra", costType: "material", date: new Date("2025-08-27T00:00:00.000Z") },
    { concept: "Montaños Honorarios #50", amount: 1000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2025-08-28T00:00:00.000Z") },
    { concept: "Mueble lavadero Montaño #2", amount: 314.81, category: "Obra", costType: "material", date: new Date("2025-08-28T00:00:00.000Z") },
    { concept: "Mesada afuera #2", amount: 622.22, category: "Obra", costType: "material", date: new Date("2025-08-28T00:00:00.000Z") },
    { concept: "Accesorios baños", amount: 53.78, category: "Obra", costType: "material", date: new Date("2025-09-04T00:00:00.000Z") },
    { concept: "Cama con cajones", amount: 333.09, category: "Obra", costType: "material", date: new Date("2025-09-08T00:00:00.000Z") },
    { concept: "Mesa exterior con banquetas", amount: 214.29, category: "Obra", costType: "material", date: new Date("2025-09-08T00:00:00.000Z") },
    { concept: "Mesa exterior con banquetas #2", amount: 393.33, category: "Obra", costType: "material", date: new Date("2025-09-19T00:00:00.000Z") },
    { concept: "materiales montaño #17", amount: 1565.57, category: "Obra", costType: "material", date: new Date("2025-09-23T00:00:00.000Z") },
    { concept: "Electricidad Parque #2", amount: 181.16, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-09-24T00:00:00.000Z") },
    { concept: "Placares habitaciones #2", amount: 836.49, category: "Obra", costType: "material", date: new Date("2025-10-01T00:00:00.000Z") },
    { concept: "Carpintero Mueble cocina #2", amount: 1358.32, category: "Obra", costType: "material", date: new Date("2025-10-01T00:00:00.000Z") },
    { concept: "Electricidad Parque #3", amount: 449.12, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-10-01T00:00:00.000Z") },
    { concept: "Porton Herrero", amount: 408.42, category: "Obra", costType: "material", date: new Date("2025-10-01T00:00:00.000Z") },
    { concept: "Arreglo Aire", amount: 81.91, category: "Obra", costType: "material", date: new Date("2025-10-10T00:00:00.000Z") },
    { concept: "Porton Herrero #2", amount: 112.28, category: "Obra", costType: "material", date: new Date("2025-10-17T00:00:00.000Z") },
    { concept: "Porton Herrero #3", amount: 157.24, category: "Obra", costType: "material", date: new Date("2025-10-26T00:00:00.000Z") },
    { concept: "Mesada afuera #3", amount: 181.52, category: "Obra", costType: "material", date: new Date("2025-10-23T00:00:00.000Z") },
    { concept: "Frente parrilla #2", amount: 495.05, category: "Obra", costType: "material", date: new Date("2025-10-23T00:00:00.000Z") },
    { concept: "Mampara", amount: 413.79, category: "Obra", costType: "material", date: new Date("2025-11-06T00:00:00.000Z") },
    { concept: "Flete plantas", amount: 59.03, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-11-26T00:00:00.000Z") },
    { concept: "Trabajo tierra albino", amount: 833.33, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-12-01T00:00:00.000Z") },
    { concept: "Compra tierra", amount: 104.17, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-11-26T00:00:00.000Z") },
    { concept: "Vivero Daloro", amount: 351.65, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-12-02T00:00:00.000Z") },
    { concept: "Mosquitero", amount: 157.89, category: "Obra", costType: "material", date: new Date("2025-12-05T00:00:00.000Z") },
    { concept: "Mosquitero #2", amount: 152.03, category: "Obra", costType: "material", date: new Date("2025-12-14T00:00:00.000Z") },
    { concept: "Mampara #2", amount: 405.41, category: "Obra", costType: "material", date: new Date("2025-12-17T00:00:00.000Z") },
    { concept: "Colocacion piedritas Albino", amount: 135.14, category: "Servicios", costType: "mano_de_obra", date: new Date("2025-12-17T00:00:00.000Z") },
    { concept: "Ventiladores Galeria", amount: 159.32, category: "Obra", costType: "material", date: new Date("2025-12-22T00:00:00.000Z") },
    { concept: "Montaños Honorarios #51", amount: 2000.0, category: "Profesionales", costType: "mano_de_obra", date: new Date("2026-01-24T00:00:00.000Z") },
    { concept: "Arreglo Aire #2", amount: 155.93, category: "Obra", costType: "material", date: new Date("2026-01-24T00:00:00.000Z") },
    { concept: "Instalacion Cerradura y arreglo cloaca", amount: 245.61, category: "Servicios", costType: "mano_de_obra", date: new Date("2026-02-24T00:00:00.000Z") },
];

async function main() {
  console.log("Seeding database with Casa Golfers real data...");

  // 1. Create admin user
  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const hashedUserPassword = await bcrypt.hash("user123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@negocios.com" },
    update: {},
    create: {
      email: "admin@negocios.com",
      name: "Admin",
      password: hashedAdminPassword,
      role: "admin",
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: "viewer@negocios.com" },
    update: {},
    create: {
      email: "viewer@negocios.com",
      name: "Viewer",
      password: hashedUserPassword,
      role: "user",
    },
  });

  console.log("Users created:", { admin: adminUser.id, viewer: viewerUser.id });

  // 2. Delete existing Casa Golfers if exists (clean re-seed)
  const existing = await prisma.project.findFirst({ where: { name: "Casa Golfers" } });
  if (existing) {
    await prisma.project.delete({ where: { id: existing.id } });
    console.log("Deleted existing Casa Golfers project");
  }

  // 3. Create Casa Golfers project
  const project = await prisma.project.create({
    data: {
      name: "Casa Golfers",
      type: "Casa",
      status: "activo",
      buyPrice: 116000,
      listingPrice: 290000,
      address: "Golfers Country Club",
      buyDate: new Date("2023-12-07"),
    },
  });

  console.log("Project created:", project.id);

  // 4. Create all costs (192 items from real Excel data)
  let created = 0;
  for (const cost of casaGolfersCosts) {
    await prisma.cost.create({
      data: {
        projectId: project.id,
        concept: cost.concept,
        amount: cost.amount,
        category: cost.category,
        costType: cost.costType,
        date: cost.date,
      },
    });
    created++;
  }

  console.log(`Created ${created} cost items`);

  // 5. Create investor
  await prisma.investor.create({
    data: {
      projectId: project.id,
      name: "Roberto Racca",
      capitalPercentage: 100,
      profitPercentage: 100,
    },
  });

  // 6. Grant access
  await prisma.projectAccess.create({
    data: {
      projectId: project.id,
      userId: adminUser.id,
      role: "interactuar",
    },
  });

  await prisma.projectAccess.create({
    data: {
      projectId: project.id,
      userId: viewerUser.id,
      role: "ver",
    },
  });

  // 7. Timeline events
  await prisma.timelineEvent.create({
    data: {
      projectId: project.id,
      action: "Proyecto creado",
      detail: "Proyecto Casa Golfers creado con datos reales del Excel",
      date: new Date("2023-12-07"),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      projectId: project.id,
      action: "Compra realizada",
      detail: "Compra de casa en Golfers Country Club por USD 116,000",
      date: new Date("2023-12-07"),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      projectId: project.id,
      action: "Inicio de obra",
      detail: "Inicio de trabajos de refacción con Montaño",
      date: new Date("2024-01-29"),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      projectId: project.id,
      action: "Publicado",
      detail: "Publicado a USD 290,000",
      date: new Date("2026-03-01"),
    },
  });

  // 8. Verify totals
  const totalCosts = await prisma.cost.aggregate({
    where: { projectId: project.id },
    _sum: { amount: true },
    _count: true,
  });

  const investment = 116000 + (totalCosts._sum.amount || 0);

  console.log("\n=== RESUMEN CASA GOLFERS ===");
  console.log(`Precio compra: USD ${(116000).toLocaleString()}`);
  console.log(`Total costos (${totalCosts._count} items): USD ${totalCosts._sum.amount?.toLocaleString()}`);
  console.log(`Total invertido: USD ${investment.toLocaleString()}`);
  console.log(`Valor publicación: USD ${(290000).toLocaleString()}`);
  console.log(`Margen estimado: ${(((290000 - investment) / 290000) * 100).toFixed(1)}%`);
  console.log("============================\n");

  console.log("Seed completed successfully!");
  console.log("Login: admin@negocios.com / admin123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
