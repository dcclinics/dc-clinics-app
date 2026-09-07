# DC Clinic App

App para pacientes de DC Clinic: agendamiento de citas y biblioteca de videos
educativos sobre cuidados pre y post-operatorios. Incluye dos partes:

- **`server/` + `public/`** — la app real y funcional, hoy mismo: un backend
  (Node puro, sin dependencias que instalar) + un frontend que se puede
  **instalar en el celular como una app** (PWA) sin pasar por ninguna tienda.
- **`mobile/`** — el punto de partida para la versión nativa que algún día se
  sube a la App Store (React Native / Expo), lista para que un desarrollador
  la termine.

## 1. Correrla en tu computador (2 minutos)

```bash
cd server
npm start          # no hay que instalar nada — solo usa Node
```

Abre `http://localhost:3000` en el navegador. Ya puedes agendar una cita y ver
los videos (de ejemplo). Requiere **Node 22.5 o más nuevo** (usa el módulo
`node:sqlite` incluido en Node, así no dependemos de compilar nada).

## 2. Conectar tus herramientas reales

Copia `server/.env.example` a `server/.env` y llena lo que ya tienes:

**Stripe** (para cobrar la valoración inicial al agendar):
1. En tu cuenta de Stripe, crea un producto "Valoración inicial DC Clinic" con
   su precio.
2. Copia el *Price ID* a `STRIPE_PRICE_ID` y tu clave secreta a
   `STRIPE_SECRET_KEY`.
3. En Stripe, configura un webhook hacia `https://tu-dominio.com/api/webhooks/stripe`
   escuchando el evento `checkout.session.completed`, y copia el *signing
   secret* a `STRIPE_WEBHOOK_SECRET`.
4. Si dejas esto vacío, la app sigue funcionando: agenda la cita directo, sin
   cobrar (útil para probar).

**WhatsApp** (confirmaciones y recordatorios):
- Si sigues con tu bot en **BuilderBot**, la forma más simple es exponer un
  endpoint en ese mismo servidor (por ejemplo `POST /enviar`) que reciba
  `{ phone, message }` y use la sesión de WhatsApp ya conectada del bot para
  mandarlo. Pon esa URL en `BUILDERBOT_WEBHOOK_URL`.
- Si en algún momento migras a la WhatsApp Cloud API de Meta directamente,
  usa `WHATSAPP_CLOUD_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` en su lugar.
- Sin ninguna de las dos, la app solo deja un registro en la consola (modo
  desarrollo) — no falla, simplemente no envía nada real todavía.

**Calendario / disponibilidad:**
Por ahora los horarios disponibles se generan dentro de la propia app (cada
90 minutos, de 8 a.m. a 5 p.m. — ajústalo en `server/db.js`,
`DAY_START_HOUR` / `DAY_END_HOUR` / `SLOT_MINUTES`). Si más adelante quieres
que se sincronice con Google Calendar en vez de vivir solo aquí, es un paso
aparte que se agrega después con la API de Google Calendar — lo dejamos por
fuera de esta primera versión para no bloquear el lanzamiento.

**Tus videos reales:** hoy la tabla `videos` tiene 8 entradas de ejemplo con
`video_url` vacío. Reemplázalos por tus videos reales (edítalos directo en
`server/db.js` antes de sembrar la base de datos, o pídeme que te arme un
panel simple para subirlos sin tocar código).

## 3. Ponerla disponible para tus pacientes ya (sin App Store)

Esto es lo más rápido: subir el proyecto a un hosting y que tus pacientes
entren desde el link — en iPhone, "Compartir → Agregar a pantalla de inicio"
la deja igual de instalada que una app de la App Store, con su propio ícono.

Opciones sencillas y gratis para empezar: **Render.com** o **Railway.app**
(conectas tu repositorio de GitHub, eligen "Node" automáticamente, y con
`npm start` como comando de arranque ya queda corriendo).

**Aviso importante sobre los datos:** la base de datos vive en un archivo
(`server/data.db`). En el plan gratuito de la mayoría de estos hostings el
disco se reinicia en cada despliegue nuevo, así que las citas guardadas se
perderían. Para producción real (una vez tengas pacientes agendando de
verdad), lo correcto es mover esa misma lógica a una base de datos hospedada
con capa gratuita como **Supabase** o **Neon** (Postgres). Es un cambio
acotado a `server/db.js` — avísame cuando llegues a ese punto y lo hacemos.

## 4. El camino hacia la App Store

Esto no lo puedo hacer yo por ti — Apple exige que sea tu propia cuenta la
que publique la app. Pasos reales:

1. **Cuenta de Apple Developer** (developer.apple.com/programs): USD 99/año,
   a tu nombre o al de tu LLC (una cuenta de organización pide número
   D-U-N-S, que es gratis pero puede tardar unos días en asignarse).
2. **Terminar la app nativa**: usa `mobile/` como punto de partida — ya tiene
   las 3 pantallas (Inicio, Agendar, Videos) conectadas a la misma API del
   backend, con el mismo diseño. Le falta pulir detalles de UI y probarla a
   fondo; esto se lo puedes encargar a un desarrollador de React Native, o
   seguimos trabajándolo juntos.
3. **Construir y enviar**: con Expo (`npx eas build --platform ios` y luego
   `npx eas submit`) se genera el archivo y se sube a App Store Connect sin
   necesitas una Mac.
4. **Revisión de Apple**: normalmente toma de 1 a 3 días. Piden política de
   privacidad (con qué datos de salud/contacto se quedan) y una cuenta de
   prueba si la app requiere login.

Mientras tanto, la versión web instalable del paso 3 le da a tus pacientes
casi la misma experiencia hoy mismo, sin esperar la aprobación de Apple.

## Estructura del proyecto

```
server/     Backend (Node puro): API de citas, videos, Stripe, WhatsApp
public/     Frontend web instalable (PWA) que consume esa API
mobile/     Punto de partida de la app nativa (Expo/React Native)
```
