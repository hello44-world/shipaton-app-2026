import { View, Text, FlatList, StyleSheet } from "react-native";

function formatRuntime(item) {
  if (item.runtime_unit === "unlimited") return "No limit (on the grid)";
  if (item.runtime_unit === "while_sunny") return "Safe while the sun's out";
  if (!item.safe_to_run) return "Not recommended right now";
  if (item.runtime_value == null) return "";
  return `~${item.runtime_value} ${item.runtime_unit}`;
}

export default function ApplianceList({ appliances }) {
  return (
    <FlatList
      data={appliances}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.dot(item.safe_to_run)} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.runtime}>{formatRuntime(item)}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  dot: (safe) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: safe ? "#38A169" : "#E53E3E",
    marginRight: 12,
  }),
  name: {
    fontSize: 16,
    fontWeight: "500",
  },
  runtime: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
});
