// stripe.js — llamadas directas a la API REST de Stripe, sin el SDK oficial,
// para que este proyecto no dependa de "npm install" en ningún momento.
// Usa la misma cuenta de Stripe que ya tienes conectada (DR CAMILO HENAO LLC).
const crypto = require('crypto');

function formEncode(value, keyPath, pairs) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => formEncode(v, `${keyPath}[${i}]`, pairs));
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => formEncode(v, keyPath ? `${keyPath}[${k}]` : k, pairs));
  } else if (value !== undefined && value !== null) {
    pairs.push(`${encodeURIComponent(keyPath)}=${encodeURIComponent(value)}`);
  }
  return pairs;
}

async function createCheckoutSession({ priceId, successUrl, cancelUrl, metadata }) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  const body = formEncode(
    {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata
    },
    '',
    []
  ).join('&');

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || 'Error creando el cobro en Stripe');
  return data; // { id, url, ... }
}

// Verifica la firma de un webhook de Stripe sin el SDK (algoritmo documentado por Stripe).
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return { valid: false };
  const parts = {};
  sigHeader.split(',').forEach((p) => {
    const [k, v] = p.split('=');
    parts[k] = v;
  });
  if (!parts.t || !parts.v1) return { valid: false };

  const signedPayload = `${parts.t}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  try {
    const valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts.v1, 'hex'));
    return { valid };
  } catch {
    return { valid: false };
  }
}

module.exports = { createCheckoutSession, verifyStripeSignature };
