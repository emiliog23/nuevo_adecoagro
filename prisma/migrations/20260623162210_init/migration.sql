-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TECNICO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sectores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "lineas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "sectorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lineas_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "maquinas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "codigo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'OPERATIVA',
    "lineaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "maquinas_lineaId_fkey" FOREIGN KEY ("lineaId") REFERENCES "lineas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "maquinaId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documentos_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "maquinas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documentos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reportes_intervencion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME,
    "tipoFalla" TEXT NOT NULL,
    "descripcionFalla" TEXT NOT NULL,
    "trabajoRealizado" TEXT NOT NULL,
    "observaciones" TEXT,
    "tecnicoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reportes_intervencion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reportes_intervencion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ordenes_trabajo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaVencimiento" DATETIME,
    "tecnicoId" TEXT,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ordenes_trabajo_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ordenes_trabajo_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cierres_turno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "turno" TEXT NOT NULL,
    "novedades" TEXT NOT NULL,
    "trabajosRealizados" TEXT,
    "pendientes" TEXT,
    "operadorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cierres_turno_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cierres_turno_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "repuestos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT NOT NULL,
    "codigo" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "cantidadMin" INTEGER NOT NULL DEFAULT 0,
    "estanteria" TEXT NOT NULL,
    "estante" TEXT NOT NULL,
    "cajon" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'unid',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "repuestos_usados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repuestoId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repuestos_usados_repuestoId_fkey" FOREIGN KEY ("repuestoId") REFERENCES "repuestos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "repuestos_usados_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_intervencion_documentoId_key" ON "reportes_intervencion"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_trabajo_documentoId_key" ON "ordenes_trabajo"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "cierres_turno_documentoId_key" ON "cierres_turno"("documentoId");
