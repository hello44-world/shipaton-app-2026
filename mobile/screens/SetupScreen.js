import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import AppHeader from "../components/AppHeader";
import { api } from "../services/api";

export default function SetupScreen({ route, navigation }) {
  const { userId, username, latitude, longitude } = route.params;
  const [solarPlates, setSolarPlates] = useState("");
  const [hasBattery, setHasBattery] = useState(false);
  const [batteryCapacityWh, setBatteryCapacityWh] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    const numSolarPlates = parseInt(solarPlates, 10) || 0;
    const batteryWh = parseInt(batteryCapacityWh, 10) || 0;

    setSaving(true);
    setError("");
    try {
      await api.saveUserSetup(userId, {
        num_solar_plates: numSolarPlates,
        has_battery: hasBattery,
        battery_capacity_wh: batteryWh,
      });
      navigation.navigate("AppliancesSetup", {
        userId,
        username,
        latitude,
        longitude,
        numSolarPlates,
        hasSolar: numSolarPlates > 0,
        hasBattery,
        batteryCapacityWh: batteryWh,
      });
    } catch (e) {
      setError(e.message || "Couldn't save your setup — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24 }}>
      <AppHeader />
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
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
  error: { color: "#E53E3E", marginBottom: 12, textAlign: "center" },
  button: { backgroundColor: "#1A202C", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});