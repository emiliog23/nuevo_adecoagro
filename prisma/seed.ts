import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const rawUrl = process.env.DATABASE_URL as string;
const connectionString = rawUrl.replace(/^railwaypostgresql:\/\//, "postgresql://");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding producción...");

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const pwd = await bcrypt.hash("Mantenimiento", 10);

  const usuarios = [
    { email: "nlasala",     name: "Nicolas Lasala",     role: "SUPERVISOR", color: "BLANCO"   },
    { email: "edelvilano",  name: "Emilio Delvilano",   role: "SUPERVISOR", color: "AZUL"     },
    { email: "jburgueno",   name: "Juan Burgueño",      role: "SUPERVISOR", color: "BLANCO"   },
    { email: "adominguez",  name: "Alcides Dominguez",  role: "TECNICO",    color: "AMARILLO" },
    { email: "genecoiz",    name: "Gustavo Enecoiz",    role: "TECNICO",    color: "VERDE"    },
    { email: "sdabi",       name: "Sergio Dabi",        role: "TECNICO",    color: "ROJO"     },
    { email: "abustamante", name: "Agustin Bustamante", role: "TECNICO",    color: "AMARILLO" },
    { email: "jnavas",      name: "Jorge Navas",        role: "TECNICO",    color: "VERDE"    },
    { email: "fortellado",  name: "Franco Ortellado",   role: "TECNICO",    color: "ROJO"     },
    { email: "agrios",      name: "Adrian Rios",        role: "TECNICO",    color: "AZUL"     },
  ];

  for (const u of usuarios) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, color: u.color },
      create: { ...u, password: pwd, activo: true },
    });
  }
  console.log(`✓ ${usuarios.length} usuarios`);

  // ── FÁBRICAS ──────────────────────────────────────────────────────────────
  const FAB_ESTERIL2 = "cmqr6sb960000g8ysxqdlz21m";
  const FAB_CENTRAL  = "cmqr7d9cs0000ubys9e44g2wg";
  const FAB_ESTERIL1 = "cmqr7delv0001ubysz7406obh";

  await prisma.fabrica.upsert({ where: { id: FAB_ESTERIL2 }, update: {}, create: { id: FAB_ESTERIL2, nombre: "Esteril II" } });
  await prisma.fabrica.upsert({ where: { id: FAB_CENTRAL  }, update: {}, create: { id: FAB_CENTRAL,  nombre: "Central"   } });
  await prisma.fabrica.upsert({ where: { id: FAB_ESTERIL1 }, update: {}, create: { id: FAB_ESTERIL1, nombre: "Esteril I" } });
  console.log("✓ 3 fábricas");

  // ── SECTORES ──────────────────────────────────────────────────────────────
  const SEC_ENVASADO   = "cmqr6sggn0001g8ysp45k8yrs";
  const SEC_PALETIZADO = "cmqr6sjtt0002g8yslpdrq9rz";

  await prisma.sector.upsert({ where: { id: SEC_ENVASADO   }, update: {}, create: { id: SEC_ENVASADO,   nombre: "Envasado",   fabricaId: FAB_ESTERIL2 } });
  await prisma.sector.upsert({ where: { id: SEC_PALETIZADO }, update: {}, create: { id: SEC_PALETIZADO, nombre: "Paletizado", fabricaId: FAB_ESTERIL2 } });
  console.log("✓ 2 sectores");

  // ── SUBSECTORES ───────────────────────────────────────────────────────────
  const subsectores = [
    { id: "cmqr6t4ao0003g8ysjm1iynhi", nombre: "Envasado",                sectorId: SEC_ENVASADO   },
    { id: "cmqr6tais0004g8ysahel7ig5", nombre: "Esterilizado",            sectorId: SEC_ENVASADO   },
    { id: "cmqr73kyd000jnqys62a3us5d", nombre: "PALETIZADORES",           sectorId: SEC_PALETIZADO },
    { id: "cmqr749ju000onqys5v7usbtb", nombre: "TRANSPORTE PALLET LLENO", sectorId: SEC_PALETIZADO },
    { id: "cmqr76kyl0010nqysc91au38x", nombre: "ENVOLVEDOR",              sectorId: SEC_PALETIZADO },
    { id: "cmqr77ie80014nqysa6wvp8f9", nombre: "ROBOT DE PALLET VACIOS",  sectorId: SEC_PALETIZADO },
  ];
  for (const s of subsectores) {
    await prisma.subsector.upsert({ where: { id: s.id }, update: {}, create: s });
  }
  console.log(`✓ ${subsectores.length} subsectores`);

  // ── LÍNEAS ────────────────────────────────────────────────────────────────
  const lineas = [
    { id: "cmqr6tr0f0005g8ysxrkm3iim", nombre: "Linea A",                descripcion: "Stelo", subsectorId: "cmqr6t4ao0003g8ysjm1iynhi" },
    { id: "cmqr6wrol0002l7ysy0rh1x04", nombre: "Linea C",                descripcion: "Speed", subsectorId: "cmqr6t4ao0003g8ysjm1iynhi" },
    { id: "cmqr6yoqk0000nqysqw1jxby1", nombre: "FLEX 13",               descripcion: null,    subsectorId: "cmqr6tais0004g8ysahel7ig5" },
    { id: "cmqr6za790003nqysqc0wm09d", nombre: "FLEX 16",               descripcion: null,    subsectorId: "cmqr6tais0004g8ysahel7ig5" },
    { id: "cmqr7036t0006nqys8begkhty", nombre: "TANQUES ASEPTICOS",     descripcion: null,    subsectorId: "cmqr6tais0004g8ysahel7ig5" },
    { id: "cmqr70rvy0009nqysrowc3zh0", nombre: "PREPARADO",             descripcion: null,    subsectorId: "cmqr6tais0004g8ysahel7ig5" },
    { id: "cmqr73nzy000knqysyl2pe4kp", nombre: "A",                     descripcion: null,    subsectorId: "cmqr73kyd000jnqys62a3us5d" },
    { id: "cmqr73qjp000lnqys22mv8yec", nombre: "C",                     descripcion: null,    subsectorId: "cmqr73kyd000jnqys62a3us5d" },
    { id: "cmqr74fap000pnqysayflw1nz", nombre: "MESAS DE RODILLOS",     descripcion: null,    subsectorId: "cmqr749ju000onqys5v7usbtb" },
    { id: "cmqr76s9p0011nqyshgbmd0kp", nombre: "ENVOLVEDOR SAN MARTIN", descripcion: null,    subsectorId: "cmqr76kyl0010nqysc91au38x" },
    { id: "cmqr77vcx0015nqyse8imxt43", nombre: "ROBOT",                 descripcion: null,    subsectorId: "cmqr77ie80014nqysa6wvp8f9" },
  ];
  for (const l of lineas) {
    await prisma.linea.upsert({ where: { id: l.id }, update: {}, create: l });
  }
  console.log(`✓ ${lineas.length} líneas`);

  // ── MÁQUINAS ──────────────────────────────────────────────────────────────
  const maquinas = [
    { id: "cmqr6tz400006g8ysd24k3izh", nombre: "A3 FLEX",               lineaId: "cmqr6tr0f0005g8ysxrkm3iim" },
    { id: "cmqr6u5150007g8ystfz4i7ad", nombre: "HELIX",                  lineaId: "cmqr6tr0f0005g8ysxrkm3iim" },
    { id: "cmqr6w3350000l7ysedwp5hyf", nombre: "CAPPER 40",              lineaId: "cmqr6tr0f0005g8ysxrkm3iim" },
    { id: "cmqr6w8xj0001l7yst6pz7huv", nombre: "CARDBOARD PACKER 34",   lineaId: "cmqr6tr0f0005g8ysxrkm3iim" },
    { id: "cmqr6xb1b0003l7ysct9080gc", nombre: "A3 SPEED",              lineaId: "cmqr6wrol0002l7ysy0rh1x04" },
    { id: "cmqr6xf3e0004l7ysg06txo6u", nombre: "HELIX",                  lineaId: "cmqr6wrol0002l7ysy0rh1x04" },
    { id: "cmqr6xjes0005l7ysvmyvjvx0", nombre: "STRAW APPLICATOR",      lineaId: "cmqr6wrol0002l7ysy0rh1x04" },
    { id: "cmqr6xnmp0006l7yshlsyzyoc", nombre: "MEURER",                 lineaId: "cmqr6wrol0002l7ysy0rh1x04" },
    { id: "cmqr6xubx0007l7ysrzbxlivv", nombre: "CARDBOARD 30 SPEED",    lineaId: "cmqr6wrol0002l7ysy0rh1x04" },
    { id: "cmqr6ytjx0001nqysth8r3v1c", nombre: "HOMOGENEIZADOR",        lineaId: "cmqr6yoqk0000nqysqw1jxby1" },
    { id: "cmqr6z1d70002nqysfzayxp9s", nombre: "TUBO RETENCION",        lineaId: "cmqr6yoqk0000nqysqw1jxby1" },
    { id: "cmqr6zfnh0004nqysb69qtm7h", nombre: "HOMOGENEIZADOR",        lineaId: "cmqr6za790003nqysqc0wm09d" },
    { id: "cmqr6zjit0005nqys4qxhkvif", nombre: "TUBO RETENCION",        lineaId: "cmqr6za790003nqysqc0wm09d" },
    { id: "cmqr70gbm0007nqysgyqevxdx", nombre: "20 M3",                 lineaId: "cmqr7036t0006nqys8begkhty" },
    { id: "cmqr70llf0008nqys4vcnbyjv", nombre: "30 M3",                 lineaId: "cmqr7036t0006nqys8begkhty" },
    { id: "cmqr70vfe000anqys7lr1vzgk", nombre: "ALMIX 1",               lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr713x3000bnqysf3t7jon5", nombre: "ALMIX 2",               lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr72083000cnqysccibz4zx", nombre: "TANQUE DE PREPARADO 1", lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr72ae4000dnqys3b7f7sfq", nombre: "TANQUE DE PREPARADO 2", lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr72k4b000enqysrrlp6jbv", nombre: "TANQUE DE FERMENTO 1",  lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr72ofp000fnqys4208voh0", nombre: "TANQUE DE FERMENTO 2",  lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr72vjb000gnqys594wxrqt", nombre: "TANQUE PECTINA",        lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr731dt000hnqyse6cflnpl", nombre: "TANQUE BASE BLANCA",    lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr738ja000inqys7fcivqq5", nombre: "ALDOSE",                lineaId: "cmqr70rvy0009nqysrowc3zh0" },
    { id: "cmqr73ymy000mnqyse517px3e", nombre: "ROBOT",                 lineaId: "cmqr73nzy000knqysyl2pe4kp" },
    { id: "cmqr741w3000nnqys2t2b54y6", nombre: "ROBOT",                 lineaId: "cmqr73qjp000lnqys22mv8yec" },
    { id: "cmqr756na000qnqyszsduc8fz", nombre: "MESA 01",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr759xp000rnqysvh3x8vw7", nombre: "MESA 02",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75dgn000snqysnde7343x", nombre: "MESA 03",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75gu7000tnqys1fmsbb5j", nombre: "MESA 04",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75ju8000unqysfsg7ule8", nombre: "MESA 05",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75o4t000vnqys8y1byqv1", nombre: "MESA 06",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75r3n000wnqyspokifveq", nombre: "MESA 07",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75u3z000xnqys3h60u86s", nombre: "MESA 08",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75ws9000ynqyszuukdfeu", nombre: "MESA 09",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr75zye000znqysze1pcmnc", nombre: "MESA 10",               lineaId: "cmqr74fap000pnqysayflw1nz" },
    { id: "cmqr76xzo0012nqys1taxtjye", nombre: "ENVOLVEDOR",            lineaId: "cmqr76s9p0011nqyshgbmd0kp" },
    { id: "cmqr772to0013nqyshxmuec5y", nombre: "IMPRESORA DE ETIQUETA", lineaId: "cmqr76s9p0011nqyshgbmd0kp" },
    { id: "cmqr77yve0016nqyszrprcuih", nombre: "ROBOT",                 lineaId: "cmqr77vcx0015nqyse8imxt43" },
  ];
  for (const m of maquinas) {
    await prisma.maquina.upsert({ where: { id: m.id }, update: {}, create: m });
  }
  console.log(`✓ ${maquinas.length} máquinas`);

  console.log("\n✅ Seed completado.");
  console.log("   Usuarios: contraseña 'Mantenimiento'");
  console.log("   Estructura: Esteril II, Central, Esteril I");
}

main().catch(console.error).finally(() => prisma.$disconnect());
