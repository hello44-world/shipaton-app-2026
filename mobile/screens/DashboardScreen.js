import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Switch, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import { api } from "../services/api";
import PowerSourceCard from "../components/PowerSourceCard";
import ApplianceList from "../components/ApplianceList";

export default function DashboardScreen({ route, navigation }) {
  const { numSolarPlates, hasSolar, hasBattery, batteryCapacityWh } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [weather, setWeather] = useState(null);
  const [power, setPower] = useState(null);
  const [appliances, setAppliances] = useState([]);
  const [alert, setAlert] = useState(null);

  const [batteryCharging, setBatteryCharging] = useState(false);
  const [batteryPct, setBatteryPct] = useState("");

  const [units, setUnits] = useState("");
  const [billResult, setBillResult] = useState(null);

  const loadDashboard = useCallback(async () => {
    setErrorMsg("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Location permission is needed to check local weather.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const weatherData = await api.getWeather(loc.coords.latitude, loc.coords.longitude);
      setWeather(weatherData);

      const powerData = await api.routePower({
        condition: weatherData.condition,
        is_day: weatherData.is_day,
        cloud_cover_pct: weatherData.cloud_cover_pct,
        has_solar: hasSolar,
        battery_charging: batteryCharging,
        battery_pct: batteryPct ? parseInt(batteryPct, 10) : null,
      });
      setPower(powerData);

      const safeData = await api.safeToRun({
        power_source: powerData.power_source,
        num_solar_plates: numSolarPlates,
        solar_output_pct: powerData.solar_output_pct,
        battery_capacity_wh: batteryCapacityWh,
        battery_pct: batteryPct ? parseInt(batteryPct, 10) : null,
      });
      setAppliances(safeData.appliances);

      const alertData = await api.checkAlert({
        rain_soon_pct: weatherData.rain_soon_pct,
        battery_pct: batteryPct ? parseInt(batteryPct, 10) : null,
        battery_charging: batteryCharging,
      });
      setAlert(alertData.should_alert ? alertData : null);
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong loading the dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasSolar, numSolarPlates, batteryCapacityWh, batteryCharging, batteryPct]);

  useEffect(() => {
    loadDashboard();
  }, [batteryCharging]); // re-route power whenever the charging flag changes

  async function handleEstimateBill() {
    if (!units) return;
    const result = await api.estimateBill({ units_kwh: parseFloat(units) });
    setBillResult(result);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} />
      }
    >
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      {alert && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{alert.message}</Text>
        </View>
      )}

      {power && <PowerSourceCard {...power} />}

      {hasBattery && (
        <View style={styles.batteryRow}>
          <Text style={styles.label}>Battery charging / in use?</Text>
          <Switch value={batteryCharging} onValueChange={setBatteryCharging} />
        </View>
      )}
      {hasBattery && batteryCharging && (
        <TextInput
          style={styles.input}
          placeholder="Current battery %"
          keyboardType="number-pad"
          value={batteryPct}
          onChangeText={setBatteryPct}
          onEndEditing={loadDashboard}
        />
      )}

      <Text style={styles.sectionTitle}>Safe to run right now</Text>
      <ApplianceList appliances={appliances} />

      <Text style={styles.sectionTitle}>Estimate your grid bill</Text>
      <Text style={styles.hint}>Only grid usage is billed — solar and battery aren't.</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Units (kWh) from your meter or bill"
          keyboardType="numeric"
          value={units}
          onChangeText={setUnits}
        />
        <TouchableOpacity style={styles.smallButton} onPress={handleEstimateBill}>
          <Text style={styles.buttonText}>Estimate</Text>
        </TouchableOpacity>
      </View>
      {billResult && (
        <Text style={styles.billResult}>≈ ${billResult.estimated_bill_usd} this month</Text>
      )}
      {/* TODO: add an "upload a photo" button here (works for both tiers) that
          runs OCR on the meter/bill photo and fills the units field automatically. */}

      <TouchableOpacity
        style={styles.proButton}
        onPress={() => navigation.navigate("AccurateBill")}
      >
        <Text style={styles.proButtonText}>Get a more accurate bill →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#E53E3E", marginBottom: 12 },
  alertBanner: { backgroundColor: "#FFF5F5", borderRadius: 12, padding: 14, marginBottom: 16 },
  alertText: { color: "#C53030", fontSize: 14, fontWeight: "500" },
  batteryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  label: { fontSize: 15, fontWeight: "500" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 28, marginBottom: 8 },
  hint: { fontSize: 12, color: "#999", marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: "#DDD", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, fontSize: 15,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  smallButton: { backgroundColor: "#1A202C", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  buttonText: { color: "#fff", fontWeight: "600" },
  billResult: { marginTop: 10, fontSize: 16, fontWeight: "600" },
  proButton: { marginTop: 32, marginBottom: 40, alignItems: "center", padding: 16, backgroundColor: "#FFFAF0", borderRadius: 12 },
  proButtonText: { color: "#B7791F", fontWeight: "600", fontSize: 15 },
});
