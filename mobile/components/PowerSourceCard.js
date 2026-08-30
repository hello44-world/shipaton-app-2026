import { View, Text, StyleSheet } from "react-native";

const SOURCE_LABELS = {
  solar: { label: "Solar", color: "#B7791F", bg: "#FFF7E6" },
  grid: { label: "Utility grid", color: "#2B6CB0", bg: "#EBF4FF" },
  battery: { label: "Battery", color: "#276749", bg: "#EFFFF4" },
};

export default function PowerSourceCard({ source, solarOutputPct, reason }) {
  const style = SOURCE_LABELS[source] || SOURCE_LABELS.grid;

  return (
    <View style={[styles.card, { backgroundColor: style.bg }]}>
      <Text style={styles.eyebrow}>Currently running on</Text>
      <Text style={[styles.source, { color: style.color }]}>{style.label}</Text>
      {source === "solar" && solarOutputPct != null && (
        <Text style={styles.meta}>{solarOutputPct}% solar output</Text>
      )}
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  source: {
    fontSize: 28,
    fontWeight: "600",
  },
  meta: {
    fontSize: 14,
    color: "#444",
    marginTop: 4,
  },
  reason: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
  },
});
