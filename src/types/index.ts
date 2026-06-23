export interface UserSession {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
}

export interface SectorWithLineas {
  id: string;
  nombre: string;
  descripcion?: string | null;
  lineas: LineaWithMaquinas[];
}

export interface LineaWithMaquinas {
  id: string;
  nombre: string;
  descripcion?: string | null;
  sectorId: string;
  maquinas: MaquinaBasic[];
}

export interface MaquinaBasic {
  id: string;
  nombre: string;
  estado: string;
  codigo?: string | null;
}

export interface DocumentoWithRelations {
  id: string;
  titulo: string;
  tipo: string;
  maquinaId?: string | null;
  creadoPorId: string;
  createdAt: Date;
  updatedAt: Date;
  maquina?: {
    id: string;
    nombre: string;
    linea: {
      id: string;
      nombre: string;
      sector: {
        id: string;
        nombre: string;
      };
    };
  } | null;
  creadoPor: {
    id: string;
    name: string;
    email: string;
  };
  reporteIntervencion?: ReporteIntervencionData | null;
  ordenTrabajo?: OrdenTrabajoData | null;
  cierreTurno?: CierreTurnoData | null;
}

export interface ReporteIntervencionData {
  id: string;
  fechaInicio: Date;
  fechaFin?: Date | null;
  tipoFalla: string;
  descripcionFalla: string;
  trabajoRealizado: string;
  observaciones?: string | null;
  tecnicoId: string;
  tecnico?: { id: string; name: string };
}

export interface OrdenTrabajoData {
  id: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  fechaVencimiento?: Date | null;
  tecnicoId?: string | null;
  observaciones?: string | null;
  tecnico?: { id: string; name: string } | null;
}

export interface CierreTurnoData {
  id: string;
  fecha: Date;
  turno: string;
  novedades: string;
  trabajosRealizados?: string | null;
  pendientes?: string | null;
  operadorId: string;
  operador?: { id: string; name: string };
}

export interface RepuestoData {
  id: string;
  descripcion: string;
  codigo?: string | null;
  cantidad: number;
  cantidadMin: number;
  estanteria: string;
  estante: string;
  cajon: string;
  unidad: string;
  activo: boolean;
  createdAt: Date;
}
