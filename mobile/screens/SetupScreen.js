import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView } from "react-native";

export default function SetupScreen({ route, navigation }) {
  const { username, zipCode } = route.params;
  const [solarPlates, setSolarPlates] = useState("");
  const [hasBattery, setHasBattery] = useState(false);
  const [batteryCapacityWh, setBatteryCapacityWh] = useState("");

  function handleContinue() {
    navigation.navigate("Dashboard", {
      username,
      zipCode,
      numSolarPlates: parseInt(solarPlates, 10) || 0,
      hasSolar: (parseInt(solarPlates, 10) || 0) > 0,
      hasBattery,
      batteryCapacityWh: parseInt(batteryCapacityWh, 10) || 0,
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Set up your system</Text>
      <Text style={styles.subtitle}>
        This tells WattGuard what it's working with — it won't ask again.
      </Text>

      <Text style={styles.label}>Number of solar panels</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 6"
        keyboardType="number-pad"
        value={solarPlates}
        onChangeText={setSolarPlates}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Battery backup installed?</Text>
          <Text style={styles.hint}>You'll mark it "charging/in use" each time from the dashboard.</Text>
        </View>
        <Switch value={hasBattery} onValueChange={setHasBattery} />
      </View>

      {hasBattery && (
        <>
          <Text style={styles.label}>Battery capacity (Wh)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2000"
            keyboardType="number-pad"
            value={batteryCapacityWh}
            onChangeText={setBatteryCapacityWh}
          />
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Go to dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 6, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 8 },
  hint: { fontSize: 12, color: "#999", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  button: { backgroundColor: "#1A202C", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
