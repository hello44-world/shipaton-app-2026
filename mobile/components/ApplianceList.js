import { FlatList, StyleSheet, Text, View } from "react-native";

function formatRuntime(item) {
  if (item.runtime_unit === "unlimited") return "No limit (on the grid)";
  if (item.runtime_unit === "hours_until_sunset") return `~${item.runtime_value} hrs left (until sunset)`;
  if (item.runtime_unit === "minutes_until_sunset") return `~${item.runtime_value} min left (until sunset)`;
  if (item.runtime_unit === "while_sunny") return "Safe while the sun's out";
  if (!item.safe_to_run) return "Not recommended right now";
  if (item.runtime_value == null) return "";
  return `~${item.runtime_value} ${item.runtime_unit}`;
}

function ApplianceRow({ item, dotColor, subtitle }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {subtitle ? <Text style={styles.switchOff}>{subtitle}</Text> : null}
        <Text style={styles.runtime}>{formatRuntime(item)}</Text>
      </View>
    </View>
  );
}

export default function ApplianceList({ appliances, solarInfo, powerSource }) {
  if (powerSource === "solar" && solarInfo) {
    const canRunNow = solarInfo.canRunNow || [];
    const canRunWithSwitch = solarInfo.canRunWithSwitch || [];
    return (
      <View>
        <Text style={styles.sectionLabel}>You can run these now</Text>
        {canRunNow.length === 0 ? (
          <Text style={styles.emptyText}>Nothing fits at once right now.</Text>
        ) : (
          canRunNow.map((item) => (
            <ApplianceRow key={item.id} item={item} dotColor="#38A169" />
          ))
        )}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
          You can also run these — switch one off
        </Text>
        {canRunWithSwitch.length === 0 ? (
          <Text style={styles.emptyText}>Everything fits already.</Text>
        ) : (
          canRunWithSwitch.map((item) => (
            <ApplianceRow
              key={item.id}
              item={item}
              dotColor="#DD6B20"
              subtitle={
                item.switch_off_name
                  ? `Switch off ${item.switch_off_name} to run this`
                  : "Switch off more than one appliance to run this"
              }
            />
          ))
        )}
      </View>
    );
  }

  // Grid / battery mode: flat list, unchanged.
  const list = Array.isArray(appliances) ? appliances : [];
  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <ApplianceRow item={item} dotColor={item.safe_to_run ? "#38A169" : "#E53E3E"} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#999", marginBottom: 8 },
  row: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#EEE",
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  name: { fontSize: 16, fontWeight: "500" },
  switchOff: { fontSize: 13, color: "#B7791F", fontWeight: "600", marginTop: 2 },
  runtime: { fontSize: 13, color: "#666", marginTop: 2 },
});