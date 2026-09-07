// server.js — servidor de la app DC Clinic. Escrito solo con módulos nativos
// de Node (http, fs, node:sqlite) para que corra en cualquier hosting sin
// depender de "npm install" (algunos entornos restringen el registro de npm).
require('./loadEnv')();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { db, generateDaySlots, seed } = require('./db');
const { notifyWhatsApp } = require('./whatsapp');
const { createCheckoutSession, verifyStripeSignature } = require('./stripe');

seed();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return {};
  }
}

function serveStatic(req, res, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400);
    return res.end('URL inválida');
  }
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature'
    });
    return res.end();
  }

  try {
    // ---- Webhook de Stripe (necesita el body crudo para verificar la firma) ----
    if (pathname === '/api/webhooks/stripe' && req.method === 'POST') {
      const raw = await readRawBody(req);
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) return sendJson(res, 200, { received: true, note: 'Stripe webhook no configurado todavía.' });

      const { valid } = verifyStripeSignature(raw, req.headers['stripe-signature'], secret);
      if (!valid) return sendJson(res, 400, { error: 'Firma de webhook inválida.' });

      const event = JSON.parse(raw.toString('utf8'));
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const appt = db.prepare('SELECT * FROM appointments WHERE stripe_session_id = ?').get(session.id);
        if (appt) {
          db.prepare("UPDATE appointments SET status = 'confirmada' WHERE id = ?").run(appt.id);
          await notifyWhatsApp(
            appt.patient_phone,
            `¡Hola ${appt.patient_name}! Tu cita de ${appt.procedure} quedó confirmada para el ${appt.date} a las ${appt.time}. Te esperamos en DC Clinics.`
          );
        }
      }
      return sendJson(res, 200, { received: true });
    }

    // ---- API JSON ----
    if (pathname === '/api/procedures' && req.method === 'GET') {
      return sendJson(res, 200, db.prepare('SELECT id, name FROM procedures ORDER BY id').all());
    }

    if (pathname === '/api/videos' && req.method === 'GET') {
      const category = url.searchParams.get('category');
      const rows =
        category && category !== 'todos'
          ? db.prepare('SELECT * FROM videos WHERE category = ? ORDER BY id').all(category)
          : db.prepare('SELECT * FROM videos ORDER BY id').all();
      return sendJson(res, 200, rows);
    }

    if (pathname === '/api/availability' && req.method === 'GET') {
      const date = url.searchParams.get('date');
      if (!date) return sendJson(res, 400, { error: 'Falta el parámetro date' });
      const allSlots = generateDaySlots();
      const taken = db
        .prepare("SELECT time FROM appointments WHERE date = ? AND status != 'cancelada'")
        .all(date)
        .map((r) => r.time);
      return sendJson(res, 200, { date, slots: allSlots.filter((s) => !taken.includes(s)) });
    }

    if (pathname === '/api/appointments' && req.method === 'POST') {
      const { procedure, date, time, patient_name, patient_phone } = await readJsonBody(req);
      if (!procedure || !date || !time || !patient_name || !patient_phone) {
        return sendJson(res, 400, { error: 'Faltan campos requeridos.' });
      }

      const conflict = db
        .prepare("SELECT id FROM appointments WHERE date = ? AND time = ? AND status != 'cancelada'")
        .get(date, time);
      if (conflict) return sendJson(res, 409, { error: 'Ese horario ya no está disponible.' });

      const info = db
        .prepare('INSERT INTO appointments (procedure, date, time, patient_name, patient_phone) VALUES (?,?,?,?,?)')
        .run(procedure, date, time, patient_name, patient_phone);
      const appointmentId = info.lastInsertRowid;

      const priceId = process.env.STRIPE_PRICE_ID;
      if (process.env.STRIPE_SECRET_KEY && priceId) {
        try {
          const appUrl = process.env.APP_URL || `http://${req.headers.host}`;
          const session = await createCheckoutSession({
            priceId,
            successUrl: `${appUrl}/?confirmada=1`,
            cancelUrl: `${appUrl}/?cancelada=1`,
            metadata: { appointment_id: String(appointmentId) }
          });
          db.prepare('UPDATE appointments SET stripe_session_id = ? WHERE id = ?').run(session.id, appointmentId);
          return sendJson(res, 200, { appointment_id: appointmentId, checkout_url: session.url });
        } catch (err) {
          return sendJson(res, 500, { error: `Error creando el cobro: ${err.message}` });
        }
      }

      // Sin Stripe configurado (modo desarrollo/demo): se confirma directo y se notifica.
      db.prepare("UPDATE appointments SET status = 'confirmada' WHERE id = ?").run(appointmentId);
      await notifyWhatsApp(
        patient_phone,
        `¡Hola ${patient_name}! Tu cita de ${procedure} quedó agendada para el ${date} a las ${time}. Te esperamos en DC Clinics.`
      );
      return sendJson(res, 200, { appointment_id: appointmentId, checkout_url: null });
    }

    const apptMatch = pathname.match(/^\/api\/appointments\/(\d+)$/);
    if (apptMatch && req.method === 'GET') {
      const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(Number(apptMatch[1]));
      if (!row) return sendJson(res, 404, { error: 'No encontrada' });
      return sendJson(res, 200, row);
    }

    if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Ruta no encontrada' });

    // ---- Archivos estáticos (el frontend) ----
    serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`DC Clinic App escuchando en http://localhost:${PORT}`);
});
