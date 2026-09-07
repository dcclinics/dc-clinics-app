// api.js — apunta al mismo backend que ya construimos (server/).
// Cambia API_BASE_URL por la URL real una vez lo despliegues (ver README.md).
export const API_BASE_URL = 'https://TU-DOMINIO-DESPLEGADO.example.com';

async function json(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}

export const getProcedures = () => json('/api/procedures');
export const getVideos = (category) => json(`/api/videos?category=${category || 'todos'}`);
export const getAvailability = (date) => json(`/api/availability?date=${date}`);
export const createAppointment = (payload) =>
  json('/api/appointments', { method: 'POST', body: JSON.stringify(payload) });
