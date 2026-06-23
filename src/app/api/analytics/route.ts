import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde")
    ? new Date(searchParams.get("desde")!)
    : new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const hasta = searchParams.get("hasta") ? new Date(searchParams.get("hasta")!) : new Date();

  const where = { createdAt: { gte: desde, lte: hasta }, archivado: false };

  const [
    totalDocumentos,
    docsPorTipo,
    reportes,
    ordenesAbiertas,
    ordenesCerradas,
    otsPorEstado,
    otsPorPrioridad,
    reportesPorFalla,
    cierresPorTurno,
    docsPorDia,
    maquinasConMasInterv,
    tecnicosPorInterv,
    descargaItems,
    otsPorTecnico,
  ] = await Promise.all([
    // Total
    prisma.documento.count({ where }),
    // Por tipo
    prisma.documento.groupBy({ by: ["tipo"], where, _count: true }),
    // Reportes con duración
    prisma.reporteIntervencion.findMany({
      where: { documento: { createdAt: { gte: desde, lte: hasta } } },
      select: { fechaInicio: true, fechaFin: true, tipoFalla: true, tecnicoId: true, documentoId: true },
    }),
    // OT abiertas
    prisma.ordenTrabajo.count({ where: { estado: { in: ["PENDIENTE", "EN_CURSO"] }, documento: { createdAt: { gte: desde, lte: hasta } } } }),
    // OT cerradas
    prisma.ordenTrabajo.count({ where: { estado: { in: ["COMPLETADA", "COMPLETADA_CON_PROBLEMAS"] }, documento: { createdAt: { gte: desde, lte: hasta } } } }),
    // OT por estado
    prisma.ordenTrabajo.groupBy({ by: ["estado"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: true }),
    // OT por prioridad
    prisma.ordenTrabajo.groupBy({ by: ["prioridad"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: true }),
    // Reportes por tipo de falla
    prisma.reporteIntervencion.groupBy({ by: ["tipoFalla"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: true }),
    // Cierres por turno
    prisma.cierreTurno.groupBy({ by: ["turno"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: true }),
    // Documentos por día (raw)
    prisma.documento.findMany({ where, select: { createdAt: true, tipo: true } }),
    // Máquinas con más intervenciones
    prisma.documento.groupBy({
      by: ["maquinaId"],
      where: { ...where, tipo: "REPORTE_INTERVENCION", maquinaId: { not: null } },
      _count: true,
      orderBy: { _count: { maquinaId: "desc" } },
      take: 8,
    }),
    // Técnicos por intervención
    prisma.reporteIntervencion.groupBy({
      by: ["tecnicoId"],
      where: { documento: { createdAt: { gte: desde, lte: hasta } } },
      _count: true,
      orderBy: { _count: { tecnicoId: "desc" } },
      take: 8,
    }),
    // Descargas de repuestos (items raw)
    prisma.descargaRepuestos.findMany({
      where: { documento: { createdAt: { gte: desde, lte: hasta } } },
      select: { items: true },
    }),
    // OT por técnico
    prisma.ordenTrabajo.groupBy({
      by: ["tecnicoId"],
      where: { tecnicoId: { not: null }, documento: { createdAt: { gte: desde, lte: hasta } } },
      _count: true,
      orderBy: { _count: { tecnicoId: "desc" } },
      take: 8,
    }),
  ]);

  // Calcular duración promedio de intervenciones
  const duraciones = reportes
    .filter((r) => r.fechaFin)
    .map((r) => new Date(r.fechaFin!).getTime() - new Date(r.fechaInicio).getTime());
  const avgDuracionMin = duraciones.length > 0 ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length / 60000) : 0;

  // Documentos por semana
  const byWeek: Record<string, number> = {};
  docsPorDia.forEach((d) => {
    const week = new Date(d.createdAt);
    week.setDate(week.getDate() - week.getDay());
    const key = week.toISOString().slice(0, 10);
    byWeek[key] = (byWeek[key] ?? 0) + 1;
  });
  const semanas = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).map(([semana, count]) => ({ semana, count }));

  // Resolución por tipo de día
  const byTipo: Record<string, number> = {};
  docsPorDia.forEach((d) => { byTipo[d.tipo] = (byTipo[d.tipo] ?? 0) + 1; });

  // Repuestos más usados
  const repuestoCount: Record<string, number> = {};
  descargaItems.forEach((d) => {
    try {
      const items = JSON.parse(d.items) as { nombre?: string; descripcion?: string; cantidad?: number }[];
      items.forEach((it) => {
        const nombre = it.nombre || it.descripcion || "?";
        repuestoCount[nombre] = (repuestoCount[nombre] ?? 0) + Number(it.cantidad || 1);
      });
    } catch { /* */ }
  });
  const repuestosTop = Object.entries(repuestoCount).sort(([, a], [, b]) => b - a).slice(0, 10).map(([nombre, cantidad]) => ({ nombre, cantidad }));

  // Enriquecer máquinas
  const maqIds = maquinasConMasInterv.map((m) => m.maquinaId).filter(Boolean) as string[];
  const maqNombres = await prisma.maquina.findMany({ where: { id: { in: maqIds } }, select: { id: true, nombre: true } });
  const maqMap = Object.fromEntries(maqNombres.map((m) => [m.id, m.nombre]));

  // Enriquecer técnicos
  const tecIds = [...new Set([...tecnicosPorInterv.map((t) => t.tecnicoId), ...otsPorTecnico.map((t) => t.tecnicoId)].filter(Boolean))] as string[];
  const tecNombres = await prisma.user.findMany({ where: { id: { in: tecIds } }, select: { id: true, name: true, color: true } });
  const tecMap = Object.fromEntries(tecNombres.map((t) => [t.id, { name: t.name, color: t.color }]));

  return NextResponse.json({
    periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
    totalDocumentos,
    ordenesAbiertas,
    ordenesCerradas,
    avgDuracionMin,
    docsPorTipo: docsPorTipo.map((d) => ({ tipo: d.tipo, count: d._count })),
    otsPorEstado: otsPorEstado.map((o) => ({ estado: o.estado, count: o._count })),
    otsPorPrioridad: otsPorPrioridad.map((o) => ({ prioridad: o.prioridad, count: o._count })),
    reportesPorFalla: reportesPorFalla.map((r) => ({ tipoFalla: r.tipoFalla, count: r._count })).sort((a, b) => b.count - a.count),
    cierresPorTurno: cierresPorTurno.map((c) => ({ turno: c.turno, count: c._count })),
    semanas,
    maquinasTop: maquinasConMasInterv.map((m) => ({ nombre: maqMap[m.maquinaId!] ?? "?", count: m._count })),
    tecnicosInterv: tecnicosPorInterv.map((t) => ({ ...tecMap[t.tecnicoId], count: t._count })),
    tecnicosOT: otsPorTecnico.map((t) => ({ ...tecMap[t.tecnicoId!], count: t._count })),
    repuestosTop,
    totalReportes: reportes.length,
    totalOT: (await prisma.ordenTrabajo.count({ where: { documento: { createdAt: { gte: desde, lte: hasta } } } })),
  });
}
