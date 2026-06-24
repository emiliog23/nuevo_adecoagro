import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ROLES = {
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  TECNICO: "TECNICO",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  TECNICO: "Técnico",
  VIEWER: "Visualizador",
};

export const TIPO_DOC_LABELS = {
  REPORTE_INTERVENCION: "Reporte de Intervención",
  ORDEN_TRABAJO: "Orden de Trabajo",
  CIERRE_TURNO: "Cierre de Turno",
  DESCARGA_REPUESTOS: "Descarga de Repuestos",
  MEJORA_MODIFICACION: "Mejora/Modificación",
  GENERICO: "Documento",
} as const;

export const PRIORIDAD_LABELS = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
} as const;

export const ESTADO_OT_LABELS = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En Curso",
  COMPLETADA: "Completada",
  COMPLETADA_CON_PROBLEMAS: "Completado con problemas",
  IMPOSIBLE_TERMINAR: "Imposible de terminar",
  CANCELADA: "Cancelada",
} as const;

export const TURNO_LABELS = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  NOCHE: "Noche",
} as const;


export const PRIORIDAD_COLORS = {
  BAJA: "bg-slate-100 text-slate-700",
  MEDIA: "bg-blue-100 text-blue-700",
  ALTA: "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700",
} as const;

export const ESTADO_OT_COLORS = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  EN_CURSO: "bg-blue-100 text-blue-800",
  COMPLETADA: "bg-green-100 text-green-800",
  COMPLETADA_CON_PROBLEMAS: "bg-amber-100 text-amber-800",
  IMPOSIBLE_TERMINAR: "bg-red-100 text-red-800",
  CANCELADA: "bg-gray-100 text-gray-800",
} as const;
