import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desdeRaw = searchParams.get("desde")
    ? new Date(searchParams.get("desde")!)
    : new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const desde = new Date(desdeRaw);
  desde.setUTCHours(0, 0, 0, 0);

  // Set hasta to end of UTC day so all timezones are covered
  const hastaRaw = searchParams.get("hasta") ? new Date(searchParams.get("hasta")!) : new Date();
  const hasta = new Date(hastaRaw);
  hasta.setUTCHours(23, 59, 59, 999);

  const userId = session.user.id as string;
  // archivado is per-user now — exclude docs this user has archived
  const where = {
    createdAt: { gte: desde, lte: hasta },
    NOT: { documentoUsuarios: { some: { userId, archivado: true } } },
  };

  try {
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
      maquinasRaw,
      tecnicosInterv,
      descargaItems,
      otsPorTecnicoRaw,
      totalOT,
      docsConColor,
      reportesConColor,
    ] = await Promise.all([
      prisma.documento.count({ where }),
      prisma.documento.groupBy({ by: ["tipo"], where, _count: { _all: true } }),
      prisma.reporteIntervencion.findMany({
        where: { documento: { createdAt: { gte: desde, lte: hasta } } },
        select: { fechaInicio: true, fechaFin: true, tipoFalla: true, tecnicoId: true },
      }),
      prisma.ordenTrabajo.count({ where: { estado: { in: ["PENDIENTE", "EN_CURSO"] }, documento: { createdAt: { gte: desde, lte: hasta } } } }),
      prisma.ordenTrabajo.count({ where: { estado: { in: ["COMPLETADA", "COMPLETADA_CON_PROBLEMAS"] }, documento: { createdAt: { gte: desde, lte: hasta } } } }),
      prisma.ordenTrabajo.groupBy({ by: ["estado"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: { _all: true } }),
      prisma.ordenTrabajo.groupBy({ by: ["prioridad"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: { _all: true } }),
      prisma.reporteIntervencion.groupBy({ by: ["tipoFalla"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: { _all: true } }),
      prisma.cierreTurno.groupBy({ by: ["turno"], where: { documento: { createdAt: { gte: desde, lte: hasta } } }, _count: { _all: true } }),
      prisma.documento.findMany({ where, select: { createdAt: true, tipo: true } }),
      // Sin orderBy en groupBy para mayor compatibilidad; ordenamos en JS
      prisma.documento.groupBy({
        by: ["maquinaId"],
        where: { ...where, tipo: { in: ["REPORTE_INTERVENCION", "MEJORA_MODIFICACION"] }, maquinaId: { not: null } },
        _count: { _all: true },
      }),
      prisma.reporteIntervencion.groupBy({
        by: ["tecnicoId"],
        where: { documento: { createdAt: { gte: desde, lte: hasta } } },
        _count: { _all: true },
      }),
      prisma.descargaRepuestos.findMany({
        where: { documento: { createdAt: { gte: desde, lte: hasta } } },
        select: { items: true },
      }),
      prisma.ordenTrabajo.groupBy({
        by: ["tecnicoId"],
        where: { tecnicoId: { not: null }, documento: { createdAt: { gte: desde, lte: hasta } } },
        _count: { _all: true },
      }),
      prisma.ordenTrabajo.count({ where: { documento: { createdAt: { gte: desde, lte: hasta } } } }),
      // Documentos con color del creador
      prisma.documento.findMany({
        where,
        select: { creadoPor: { select: { color: true } } },
      }),
      // Reportes con color del creador y duración
      prisma.reporteIntervencion.findMany({
        where: { documento: { createdAt: { gte: desde, lte: hasta } } },
        select: {
          fechaInicio: true, fechaFin: true,
          documento: { select: { creadoPor: { select: { color: true } } } },
        },
      }),
    ]);

    // Duración promedio
    const duraciones = reportes
      .filter((r) => r.fechaFin)
      .map((r) => new Date(r.fechaFin!).getTime() - new Date(r.fechaInicio).getTime());
    const avgDuracionMin = duraciones.length > 0
      ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length / 60000) : 0;

    // Documentos por semana
    const byWeek: Record<string, number> = {};
    docsPorDia.forEach((d) => {
      const week = new Date(d.createdAt);
      week.setDate(week.getDate() - week.getDay());
      const key = week.toISOString().slice(0, 10);
      byWeek[key] = (byWeek[key] ?? 0) + 1;
    });
    const semanas = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, count]) => ({ semana, count }));

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
    const repuestosTop = Object.entries(repuestoCount)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    // Ordenar máquinas en JS y enriquecer
    const maqSorted = maquinasRaw
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 8);
    const maqIds = maqSorted.map((m) => m.maquinaId).filter(Boolean) as string[];
    const maqNombres = await prisma.maquina.findMany({ where: { id: { in: maqIds } }, select: { id: true, nombre: true } });
    const maqMap = Object.fromEntries(maqNombres.map((m) => [m.id, m.nombre]));

    // Ordenar técnicos en JS y enriquecer
    const tecIntervSorted = tecnicosInterv.sort((a, b) => b._count._all - a._count._all).slice(0, 8);
    const otsTecSorted = otsPorTecnicoRaw.sort((a, b) => b._count._all - a._count._all).slice(0, 8);
    const tecIds = [...new Set([
      ...tecIntervSorted.map((t) => t.tecnicoId),
      ...otsTecSorted.map((t) => t.tecnicoId),
    ].filter(Boolean))] as string[];
    const tecNombres = await prisma.user.findMany({ where: { id: { in: tecIds } }, select: { id: true, name: true, color: true } });
    const tecMap = Object.fromEntries(tecNombres.map((t) => [t.id, { name: t.name, color: t.color }]));

    // ── Nuevos KPIs ─────────────────────────────────────────────────────────

    // Tiempo promedio por tipo de falla
    const durPorFalla: Record<string, number[]> = {};
    reportes.filter((r) => r.fechaFin).forEach((r) => {
      const mins = (new Date(r.fechaFin!).getTime() - new Date(r.fechaInicio).getTime()) / 60000;
      if (!durPorFalla[r.tipoFalla]) durPorFalla[r.tipoFalla] = [];
      durPorFalla[r.tipoFalla].push(mins);
    });
    const tiempoPorFalla = Object.entries(durPorFalla)
      .map(([tipoFalla, mins]) => ({
        tipoFalla,
        avgMin: Math.round(mins.reduce((a, b) => a + b, 0) / mins.length),
        count: mins.length,
      }))
      .sort((a, b) => b.avgMin - a.avgMin);

    // Documentos por color de usuario
    const countColor: Record<string, number> = {};
    docsConColor.forEach((d: any) => {
      const c = d.creadoPor?.color ?? "AZUL";
      countColor[c] = (countColor[c] ?? 0) + 1;
    });
    const docsPorColor = Object.entries(countColor).map(([color, count]) => ({ color, count }));

    // Horas de intervención por color de usuario
    const horasColor: Record<string, number> = {};
    reportesConColor.forEach((r: any) => {
      if (!r.fechaFin) return;
      const mins = (new Date(r.fechaFin).getTime() - new Date(r.fechaInicio).getTime()) / 60000;
      const c = r.documento?.creadoPor?.color ?? "AZUL";
      horasColor[c] = (horasColor[c] ?? 0) + mins;
    });
    const horasPorColor = Object.entries(horasColor)
      .map(([color, totalMin]) => ({ color, horas: Math.round(totalMin / 60 * 10) / 10 }));

    return NextResponse.json({
      periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      totalDocumentos,
      ordenesAbiertas,
      ordenesCerradas,
      avgDuracionMin,
      totalOT,
      totalReportes: reportes.length,
      docsPorTipo: docsPorTipo.map((d) => ({ tipo: d.tipo, count: d._count._all })),
      otsPorEstado: otsPorEstado.map((o) => ({ estado: o.estado, count: o._count._all })),
      otsPorPrioridad: otsPorPrioridad.map((o) => ({ prioridad: o.prioridad, count: o._count._all })),
      reportesPorFalla: reportesPorFalla
        .map((r) => ({ tipoFalla: r.tipoFalla, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      cierresPorTurno: cierresPorTurno.map((c) => ({ turno: c.turno, count: c._count._all })),
      semanas,
      maquinasTop: maqSorted.map((m) => ({ nombre: maqMap[m.maquinaId!] ?? "?", count: m._count._all })),
      tecnicosInterv: tecIntervSorted.map((t) => ({ ...tecMap[t.tecnicoId], count: t._count._all })),
      tecnicosOT: otsTecSorted.map((t) => ({ ...tecMap[t.tecnicoId!], count: t._count._all })),
      repuestosTop,
      tiempoPorFalla,
      docsPorColor,
      horasPorColor,
    });
  } catch (error) {
    console.error("[analytics] Error:", error);
    return NextResponse.json(
      { error: "Error al procesar analítica", detail: String(error) },
      { status: 500 }
    );
  }
}
