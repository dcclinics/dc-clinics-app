// db.js — base de datos local (SQLite) para citas y videos.
// Para producción real en un hosting sin disco persistente (muchos free tiers),
// lo más seguro es migrar esta misma lógica a una base de datos hospedada
// (por ejemplo Postgres en Supabase o Neon, ambos con capa gratuita) para que
// las citas no se pierdan en cada despliegue. Ver README.md.

const path = require('path');
// Usamos el módulo SQLite incorporado en Node (18.4+ / recomendado 22+), así no
// dependemos de compilar un binario nativo (better-sqlite3) en cada servidor
// donde despliegues esto. Es "experimental" en Node pero estable para este uso.
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, 'data.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS procedures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    duration TEXT NOT NULL,
    category TEXT NOT NULL,      -- antes | despues | procedimiento
    video_url TEXT NOT NULL DEFAULT ''   -- pon aquí el link real de tu video (YouTube sin listar, Vimeo, o tu propio hosting)
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    procedure TEXT NOT NULL,
    date TEXT NOT NULL,          -- YYYY-MM-DD
    time TEXT NOT NULL,          -- ej. "09:30"
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente_pago',  -- pendiente_pago | confirmada | cancelada
    stripe_session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Testimonios: fotos de resultados + comentario del paciente, para mostrar
  -- en la sección "Resultados" de la app. Se cargan desde /admin.html (el
  -- doctor las sube después de tener el permiso del paciente), no las suben
  -- los pacientes directamente.
  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL DEFAULT 'Paciente de DC Clinics',
    procedure TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    photo_path TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Horario base: se generan cupos cada 90 min entre estas horas, todos los días.
// Ajusta esto a la agenda real de la clínica.
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 17;
const SLOT_MINUTES = 90;

function generateDaySlots() {
  const slots = [];
  let totalMinutes = DAY_START_HOUR * 60;
  const endMinutes = DAY_END_HOUR * 60;
  while (totalMinutes < endMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    totalMinutes += SLOT_MINUTES;
  }
  return slots;
}

function seed() {
  const procedureNames = [
    'Lipoescultura con lipoinjerto glúteo',
    'Abdominoplastia',
    'Mastopexia',
    'Mamoplastia de aumento',
    'Explantación mamaria',
    'Reducción mamaria'
  ];

  const insertProc = db.prepare('INSERT INTO procedures (name) VALUES (?)');
  const countProc = db.prepare('SELECT COUNT(*) AS c FROM procedures').get().c;
  if (countProc === 0) {
    procedureNames.forEach((n) => insertProc.run(n));
    console.log(`Sembrados ${procedureNames.length} procedimientos.`);
  }

  const videos = [
    ['Qué esperar en tu valoración pre-quirúrgica', '4:12', 'antes', ''],
    ['Cómo prepararte la semana antes de tu cirugía', '6:30', 'antes', ''],
    ['Cuidados en las primeras 48 horas', '5:45', 'despues', ''],
    ['Uso correcto de la faja postquirúrgica', '3:58', 'despues', ''],
    ['Señales de alarma en tu recuperación', '4:40', 'despues', ''],
    ['Lipoescultura con lipoinjerto glúteo: guía completa', '8:20', 'procedimiento', ''],
    ['Abdominoplastia: antes, durante y después', '7:15', 'procedimiento', ''],
    ['Mastopexia vs. aumento: ¿cuál necesito?', '6:02', 'procedimiento', '']
  ];
  const insertVideo = db.prepare('INSERT INTO videos (title, duration, category, video_url) VALUES (?,?,?,?)');
  const countVideo = db.prepare('SELECT COUNT(*) AS c FROM videos').get().c;
  if (countVideo === 0) {
    videos.forEach((r) => insertVideo.run(...r));
    console.log(`Sembrados ${videos.length} videos de ejemplo — reemplaza video_url con tus links reales en la tabla "videos".`);
  }
}

if (require.main === module && process.argv.includes('--seed')) {
  seed();
  console.log('Listo. Ya puedes correr: npm start');
  process.exit(0);
}

module.exports = { db, generateDaySlots, seed };
