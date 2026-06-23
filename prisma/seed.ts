import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const adminPwd = await bcrypt.hash("admin123", 10);
  const userPwd = await bcrypt.hash("tecnico123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin" },
    update: {},
    create: { name: "Administrador", email: "admin", password: adminPwd, role: "ADMIN" },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor" },
    update: {},
    create: { name: "Juan Pérez", email: "supervisor", password: userPwd, role: "SUPERVISOR" },
  });

  const tecnico1 = await prisma.user.upsert({
    where: { email: "tecnico1" },
    update: {},
    create: { name: "Carlos García", email: "tecnico1", password: userPwd, role: "TECNICO" },
  });

  const tecnico2 = await prisma.user.upsert({
    where: { email: "tecnico2" },
    update: {},
    create: { name: "Miguel Rodríguez", email: "tecnico2", password: userPwd, role: "TECNICO" },
  });

  const sectorMolienda = await prisma.sector.upsert({
    where: { id: "sector-molienda" },
    update: {},
    create: { id: "sector-molienda", nombre: "Molienda", descripcion: "Área de procesamiento primario" },
  });

  const sectorFermentacion = await prisma.sector.upsert({
    where: { id: "sector-fermentacion" },
    update: {},
    create: { id: "sector-fermentacion", nombre: "Fermentación", descripcion: "Área de fermentación y destilación" },
  });

  const sectorUtilidades = await prisma.sector.upsert({
    where: { id: "sector-utilidades" },
    update: {},
    create: { id: "sector-utilidades", nombre: "Utilidades", descripcion: "Calderas, compresores y servicios generales" },
  });

  // Subsectores (one per sector for seed)
  const subMolienda = await prisma.subsector.upsert({
    where: { id: "sub-sector-molienda" },
    update: {},
    create: { id: "sub-sector-molienda", nombre: "General", sectorId: sectorMolienda.id },
  });
  const subFermentacion = await prisma.subsector.upsert({
    where: { id: "sub-sector-fermentacion" },
    update: {},
    create: { id: "sub-sector-fermentacion", nombre: "General", sectorId: sectorFermentacion.id },
  });
  const subUtilidades = await prisma.subsector.upsert({
    where: { id: "sub-sector-utilidades" },
    update: {},
    create: { id: "sub-sector-utilidades", nombre: "General", sectorId: sectorUtilidades.id },
  });

  const lineaMolinos = await prisma.linea.upsert({
    where: { id: "linea-molinos" },
    update: {},
    create: { id: "linea-molinos", nombre: "Línea de Molinos", subsectorId: subMolienda.id },
  });

  const lineaPreparacion = await prisma.linea.upsert({
    where: { id: "linea-preparacion" },
    update: {},
    create: { id: "linea-preparacion", nombre: "Preparación de Caña", subsectorId: subMolienda.id },
  });

  const lineaDornas = await prisma.linea.upsert({
    where: { id: "linea-dornas" },
    update: {},
    create: { id: "linea-dornas", nombre: "Dornas de Fermentación", subsectorId: subFermentacion.id },
  });

  const lineaDestilacion = await prisma.linea.upsert({
    where: { id: "linea-destilacion" },
    update: {},
    create: { id: "linea-destilacion", nombre: "Destilación", subsectorId: subFermentacion.id },
  });

  const lineaCalderas = await prisma.linea.upsert({
    where: { id: "linea-calderas" },
    update: {},
    create: { id: "linea-calderas", nombre: "Calderas", subsectorId: subUtilidades.id },
  });

  await Promise.all([
    prisma.maquina.upsert({ where: { id: "maq-molino1" }, update: {}, create: { id: "maq-molino1", nombre: "Molino #1", codigo: "MOL-001", lineaId: lineaMolinos.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-molino2" }, update: {}, create: { id: "maq-molino2", nombre: "Molino #2", codigo: "MOL-002", lineaId: lineaMolinos.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-molino3" }, update: {}, create: { id: "maq-molino3", nombre: "Molino #3", codigo: "MOL-003", lineaId: lineaMolinos.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-conductor" }, update: {}, create: { id: "maq-conductor", nombre: "Conductor de Caña", codigo: "COND-001", lineaId: lineaPreparacion.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-desfibrador" }, update: {}, create: { id: "maq-desfibrador", nombre: "Desfibrador", codigo: "DESF-001", lineaId: lineaPreparacion.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-dorna1" }, update: {}, create: { id: "maq-dorna1", nombre: "Dorna D-01", codigo: "DORN-001", lineaId: lineaDornas.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-dorna2" }, update: {}, create: { id: "maq-dorna2", nombre: "Dorna D-02", codigo: "DORN-002", lineaId: lineaDornas.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-columna" }, update: {}, create: { id: "maq-columna", nombre: "Columna de Destilación A", codigo: "COL-001", lineaId: lineaDestilacion.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-caldera1" }, update: {}, create: { id: "maq-caldera1", nombre: "Caldera #1", codigo: "CAL-001", lineaId: lineaCalderas.id, } }),
    prisma.maquina.upsert({ where: { id: "maq-caldera2" }, update: {}, create: { id: "maq-caldera2", nombre: "Caldera #2", codigo: "CAL-002", lineaId: lineaCalderas.id, } }),
  ]);

  // Descarga de repuestos de ejemplo
  await prisma.documento.upsert({
    where: { id: "doc-004" },
    update: {},
    create: { id: "doc-004", titulo: "Descarga repuestos - Reparación Molino #2", tipo: "DESCARGA_REPUESTOS", maquinaId: "maq-molino2", creadoPorId: tecnico1.id },
  });
  await prisma.descargaRepuestos.upsert({
    where: { documentoId: "doc-004" },
    update: {},
    create: {
      documentoId: "doc-004",
      fecha: new Date("2026-06-20T09:00:00"),
      items: JSON.stringify([
        { descripcion: "Rodamiento SKF 6306", cantidad: 1, unidad: "unid", ubicacion: "A / 1 / A2" },
        { descripcion: "Grasa Shell Alvania EP2", cantidad: 0.5, unidad: "kg", ubicacion: "C / 1 / A2" },
      ]),
      observaciones: "Utilizado en reparación de cojinete lado libre del Molino #2.",
    },
  });

  await prisma.documento.upsert({
    where: { id: "doc-001" },
    update: {},
    create: { id: "doc-001", titulo: "Falla en cojinete del Molino #2", tipo: "REPORTE_INTERVENCION", maquinaId: "maq-molino2", creadoPorId: tecnico1.id },
  });
  await prisma.reporteIntervencion.upsert({
    where: { documentoId: "doc-001" },
    update: {},
    create: {
      documentoId: "doc-001",
      fechaInicio: new Date("2026-06-20T08:30:00"),
      fechaFin: new Date("2026-06-20T12:00:00"),
      tipoFalla: "Mecánica",
      descripcionFalla: "Vibración excesiva en el cojinete lado libre del molino #2. Temperatura elevada detectada por sensor.",
      trabajoRealizado: "Se reemplazó el rodamiento SKF 6306. Se lubricó correctamente y se verificó alineación.",
      observaciones: "Se recomienda programar revisión preventiva mensual del sistema de lubricación.",
      tecnicoId: tecnico1.id,
    },
  });

  await prisma.documento.upsert({
    where: { id: "doc-002" },
    update: {},
    create: { id: "doc-002", titulo: "OT - Mantenimiento preventivo Caldera #1", tipo: "ORDEN_TRABAJO", maquinaId: "maq-caldera1", creadoPorId: supervisor.id },
  });
  await prisma.ordenTrabajo.upsert({
    where: { documentoId: "doc-002" },
    update: {},
    create: {
      documentoId: "doc-002",
      descripcion: "Mantenimiento preventivo trimestral: limpieza de hogar, revisión de válvulas de seguridad, análisis de agua y ajuste de quemadores.",
      prioridad: "ALTA",
      estado: "PENDIENTE",
      fechaVencimiento: new Date("2026-07-01"),
      tecnicoId: tecnico2.id,
      observaciones: "Coordinar con producción para parada programada.",
    },
  });

  await prisma.documento.upsert({
    where: { id: "doc-003" },
    update: {},
    create: { id: "doc-003", titulo: "Cierre de Turno Tarde 22/06", tipo: "CIERRE_TURNO", creadoPorId: tecnico2.id },
  });
  await prisma.cierreTurno.upsert({
    where: { documentoId: "doc-003" },
    update: {},
    create: {
      documentoId: "doc-003",
      fecha: new Date("2026-06-22T22:00:00"),
      turno: "TARDE",
      novedades: "Turno sin novedades mayores. Molino #2 continúa fuera de servicio. Producción al 75%.",
      trabajosRealizados: "- Lubricación semanal de conductores\n- Ajuste de tensión en correas del desfibrador",
      pendientes: "Completar reparación del Molino #2 en turno noche.",
      operadorId: tecnico2.id,
    },
  });

  console.log("✅ Seed completado!");
  console.log("\n📋 Credenciales:");
  console.log("  admin     / admin123   (ADMIN)");
  console.log("  supervisor / tecnico123 (SUPERVISOR)");
  console.log("  tecnico1  / tecnico123 (TECNICO)");
  console.log("  tecnico2  / tecnico123 (TECNICO)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
