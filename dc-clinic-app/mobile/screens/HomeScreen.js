import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { getVideos } from '../api';

const COLORS = { bg: '#F7F5F1', ink: '#1E2422', soft: '#5C6663', accent: '#2F6B5E', line: '#E1DED7' };

export default function HomeScreen({ navigation }) {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    getVideos('todos').then((v) => setVideos(v.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.wordmark}>DC Clinic</Text>
        <Text style={styles.greetName}>Hola 👋</Text>

        <View style={styles.apptCard}>
          <Text style={styles.apptTag}>AGENDA TU CITA</Text>
          <Text style={styles.apptTitle}>Empieza por elegir tu procedimiento</Text>
          <Text style={styles.apptSub}>Confirmación y recordatorios por WhatsApp.</Text>
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Agendar')}>
            <Text style={styles.quickBtnText}>Agendar una cita</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Videos')}>
            <Text style={styles.quickBtnText}>Ver videos educativos</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.secTitle}>VIDEOS RECOMENDADOS</Text>
        {videos.map((v) => (
          <TouchableOpacity key={v.id} style={styles.videoRow} onPress={() => navigation.navigate('Videos')}>
            <View style={styles.playDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.videoTitle}>{v.title}</Text>
              <Text style={styles.videoMeta}>{v.duration}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20 },
  wordmark: { fontSize: 20, fontWeight: '700', color: COLORS.ink },
  greetName: { fontSize: 24, fontWeight: '700', color: COLORS.ink, marginBottom: 18 },
  apptCard: { backgroundColor: COLORS.accent, borderRadius: 16, padding: 16, marginBottom: 18 },
  apptTag: { color: '#DCEAE5', fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  apptTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 4 },
  apptSub: { color: '#DCEAE5', fontSize: 12.5, marginTop: 6 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 14 },
  quickBtnText: { fontWeight: '700', fontSize: 13, color: COLORS.ink },
  secTitle: { fontSize: 12, fontWeight: '700', color: COLORS.soft, letterSpacing: 1, marginBottom: 10 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, marginBottom: 8 },
  playDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent },
  videoTitle: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  videoMeta: { fontSize: 11, color: COLORS.soft, marginTop: 2 }
});
