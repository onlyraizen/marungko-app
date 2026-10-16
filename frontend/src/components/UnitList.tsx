import type { Unit } from "@marungko/shared";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = { units: readonly Unit[]; onSelect: (unit: Unit) => void };

/** The lesson list. Duolingo-style path map comes later; this is the working version. */
export default function UnitList({ units, onSelect }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mga Aralin</Text>
      {units.map((unit) => {
        const spoken = unit.syllables.length + unit.words.length;
        if (spoken === 0) return null;
        return (
          <Pressable key={unit.id} style={styles.card} onPress={() => onSelect(unit)}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{unit.title}</Text>
              <Text style={styles.cardMeta}>
                {unit.syllables.length} pantig · {unit.words.length} salita
              </Text>
            </View>
            {unit.review === "draft" ? <Text style={styles.badge}>DRAFT</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 32, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 16,
  },
  cardText: { gap: 4, flexShrink: 1 },
  cardTitle: { fontSize: 20, fontWeight: "600" },
  cardMeta: { fontSize: 14, color: "#666" },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c77700",
    borderWidth: 1,
    borderColor: "#c77700",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
