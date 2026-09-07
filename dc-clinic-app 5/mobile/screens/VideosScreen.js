import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { getVideos } from '../api';

const COLORS = { bg: '#F7F5F1', ink: '#1E2422', soft: '#5C6663', accent: '#2F6B5E', line: '#E1DED7' };
const CATS = { todos: 'Todos', antes: 'Antes de tu cirugía', despues: 'Cuidados post-operatorios', procedimiento: 'Por procedimiento' };

export default function VideosScreen() {
  const [filter, setFilter] = useState('todos');
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    getVideos(filter).then(setVideos).catch(() => setVideos([]));
  }, [filter]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {Object.entries(CATS).map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.pill, filter === key && styles.pillSel]} onPress={() => setFilter(key)}>
              <Text style={[styles.pillText, filter === key && styles.pillTextSel]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {videos.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.card}
              onPress={() => v.video_url && Linking.openURL(v.video_url)}
            >
              <View style={styles.thumb} />
              <Text style={styles.title}>{v.title}</Text>
              <Text style={styles.meta}>{v.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#fff', marginRight: 8 },
  pillSel: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.soft },
  pillTextSel: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  card: { width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 10 },
  thumb: { height: 70, borderRadius: 10, backgroundColor: COLORS.accent, marginBottom: 8 },
  title: { fontSize: 12.5, fontWeight: '600', color: COLORS.ink },
  meta: { fontSize: 11, color: COLORS.soft, marginTop: 4 }
});
