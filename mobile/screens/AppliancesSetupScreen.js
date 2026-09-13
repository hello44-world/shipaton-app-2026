import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AppHeader from "../components/AppHeader";
import { api } from "../services/api";

function DeviceSection({ title, hint, category, devices, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [watts, setWatts] = useState("");

  function handleAdd() {
    if (!name.trim() || !watts) return;
    onAdd({ name: name.trim(), category, watts: parseInt(watts, 10) || 0 });
    setName("");
    setWatts("");
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>

      {devices.map((d, i) => (
        <View key={i} style={styles.deviceRow}>
          <Text style={styles.deviceText}>{d.name} · {d.watts}W</Text>
          <TouchableOpacity onPress={() => onRemove(i)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 2, marginBottom: 0 }]}
          placeholder="Name + model (e.g. 1.5 ton AC)"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Watts"
          keyboardType="number-pad"
          value={watts}
          onChangeText={setWatts}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppliancesSetupScreen({ route, navigation }) {
  const { userId, username, latitude, longitude, numSolarPlates, hasSolar, hasBattery, batteryCapacityWh } = route.params;

  const [permanent, setPermanent] = useState([]);
  const [temporary, setTemporary] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    const allDevices = [...permanent, ...temporary];
    if (allDevices.length === 0) {
      setError("Add at least one device so WattGuard has something to calculate against.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.saveUserAppliances(userId, allDevices);
      navigation.navigate("Dashboard", {
        userId, username, latitude, longitude,
        numSolarPlates, hasSolar, hasBattery, batteryCapacityWh,
      });
    } catch (e) {
      setError(e.message || "Couldn't save your devices — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24 }}>
      <AppHeader />
      <Text style={styles.title}>Add your devices</Text>
      <Text style={styles.subtitle}>
        This is how WattGuard gives you real answers instead of generic ones —
        tell it exactly what you have.
      </Text>

      <DeviceSection
        title="Permanent devices"
        hint="(Devices you run regularly, daily — like your fridge or AC)"
        category="permanent"
        devices={permanent}
        onAdd={(d) => setPermanent([...permanent, d])}
        onRemove={(i) => setPermanent(permanent.filter((_, idx) => idx !== i))}
      />

      <DeviceSection
        title="Temporary devices"
        hint="(Devices you use occasionally or rarely — like an iron or kettle)"
        category="temporary"
        devices={temporary}
        onAdd={(d) => setTemporary([...temporary, d])}
        onRemove={(i) => setTemporary(temporary.filter((_, idx) => idx !== i))}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Go to dashboard</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 6, marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionHint: { fontSize: 12, color: "#999", marginTop: 2, marginBottom: 12 },
  deviceRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#EEE", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8,
  },
  deviceText: { fontSize: 14, fontWeight: "500" },
  removeText: { color: "#E53E3E", fontSize: 13 },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    borderWidth: 1, borderColor: "#DDD", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 14,
  },
  addButton: { backgroundColor: "#1A202C", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  error: { color: "#E53E3E", marginBottom: 12, textAlign: "center" },
  button: { backgroundColor: "#1A202C", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 12, marginBottom: 40 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});