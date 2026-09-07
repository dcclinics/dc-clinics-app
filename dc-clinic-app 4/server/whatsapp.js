// whatsapp.js — envío de confirmaciones/recordatorios de cita por WhatsApp.
//
// Soporta dos caminos, en este orden:
//   1) BUILDERBOT_WEBHOOK_URL: si sigues usando tu bot en BuilderBot, expón allí
//      un endpoint (por ejemplo POST /enviar) que reciba { phone, message } y
//      use la sesión de WhatsApp ya conectada del bot para mandar el mensaje.
//      Aquí simplemente le hacemos POST a esa URL.
//   2) WhatsApp Cloud API de Meta, si en algún momento migras a eso directamente.
//
// Si ninguna variable está configurada, la función solo deja constancia en consola
// (modo desarrollo) para que puedas seguir probando la app sin enviar mensajes reales.

async function notifyWhatsApp(phone, message) {
  const builderbotUrl = process.env.BUILDERBOT_WEBHOOK_URL;
  const cloudToken = process.env.WHATSAPP_CLOUD_TOKEN;
  const cloudPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  try {
    if (builderbotUrl) {
      const res = await fetch(builderbotUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      });
      if (!res.ok) throw new Error(`BuilderBot webhook respondió ${res.status}`);
      return { ok: true, via: 'builderbot' };
    }

    if (cloudToken && cloudPhoneId) {
      const res = await fetch(`https://graph.facebook.com/v20.0/${cloudPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cloudToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message }
        })
      });
      if (!res.ok) throw new Error(`WhatsApp Cloud API respondió ${res.status}`);
      return { ok: true, via: 'whatsapp_cloud_api' };
    }

    console.log(`[WhatsApp - modo desarrollo, no configurado] Para ${phone}: "${message}"`);
    return { ok: true, via: 'dev_log' };
  } catch (err) {
    console.error('Error enviando WhatsApp:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { notifyWhatsApp };
