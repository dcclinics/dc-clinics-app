import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Alert, Linking } from 'react-native';
import { getProcedures, getAvailability, createAppointment } from '../api';

const COLORS = { bg: '#F7F5F1', ink: '#1E2422', soft: '#5C6663', accent: '#2F6B5E', line: '#E1DED7' };

function nextDays(n) {
  const dn = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ label: dn[d.getDay()], num: d.getDate(), iso: d.toISOString().slice(0, 10) });
  }
  return out;
}

export default function BookScreen() {
  const [step, setStep] = useState(1);
  const [procedures, setProcedures] = useState([]);
  const [proc, setProc] = useState(null);
  const [days] = useState(nextDays(7));
  const [dayIdx, setDayIdx] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    getProcedures().then(setProcedures).catch(() => {});
  }, []);

  useEffect(() => {
    if (dayIdx === null) return;
    getAvailability(days[dayIdx].iso).then((d) => setSlots(d.slots)).catch(() => setSlots([]));
  }, [dayIdx]);

  async function confirm() {
    try {
      const res = await createAppointment({
        procedure: proc,
        date: days[dayIdx].iso,
        time: slot,
        patient_name: name,
        patient_phone: phone
      });
      if (res.checkout_url) {
        Linking.openURL(res.checkout_url); // paga la valoración en Stripe
        return;
      }
      setStep(3);
    } catch (e) {
      Alert.alert('No se pudo agendar', e.message);
    }
  }

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.secTitle}>¿QUÉ PROCEDIMIENTO TE INTERESA?</Text>
          <View style={styles.grid}>
            {procedures.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.procCard}
                onPress={() => { setProc(p.name); setStep(2); }}
              >
                <View style={styles.dot} />
                <Text style={styles.procText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity onPress={() => setStep(1)}><Text style={styles.back}>← Cambiar procedimiento</Text></TouchableOpacity>
          <Text style={styles.secTitle}>{proc.toUpperCase()}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {days.map((d, i) => (
              <TouchableOpacity key={d.iso} style={[styles.dayBtn, dayIdx === i && styles.sel]} onPress={() => { setDayIdx(i); setSlot(null); }}>
                <Text style={[styles.dayLabel, dayIdx === i && styles.selText]}>{d.label}</Text>
                <Text style={[styles.dayNum, dayIdx === i && styles.selText]}>{d.num}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.secTitle}>HORAS DISPONIBLES</Text>
          <View style={styles.grid}>
            {slots.map((s) => (
              <TouchableOpacity key={s} style={[styles.slotBtn, slot === s && styles.sel]} onPress={() => setSlot(s)}>
                <Text style={[styles.slotText, slot === s && styles.selText]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} placeholder="Tu nombre completo" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Tu WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <TouchableOpacity
            style={[styles.cta, !(dayIdx !== null && slot && name && phone) && styles.ctaDisabled]}
            disabled={!(dayIdx !== null && slot && name && phone)}
            onPress={confirm}
          >
            <Text style={styles.ctaText}>Confirmar cita</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, { alignItems: 'center', paddingTop: 60 }]}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.ink, marginBottom: 8 }}>¡Cita agendada!</Text>
        <Text style={{ color: COLORS.soft, textAlign: 'center' }}>Recibirás confirmación por WhatsApp.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20 },
  secTitle: { fontSize: 12, fontWeight: '700', color: COLORS.soft, letterSpacing: 1, marginBottom: 10 },
  back: { color: COLORS.soft, fontSize: 12.5, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  procCard: { width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.accent, marginBottom: 8 },
  procText: { fontSize: 12.5, fontWeight: '600', color: COLORS.ink },
  dayBtn: { width: 52, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#fff', alignItems: 'center', marginRight: 8 },
  dayLabel: { fontSize: 10, color: COLORS.soft, textTransform: 'uppercase' },
  dayNum: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  sel: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  selText: { color: '#fff' },
  slotBtn: { width: '31%', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#fff', alignItems: 'center' },
  slotText: { fontSize: 12.5, fontWeight: '600', color: COLORS.ink },
  input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#fff' },
  cta: { backgroundColor: COLORS.accent, borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 8 },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});
