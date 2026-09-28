import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, RefreshControl,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import AppHeader from "../components/AppHeader";
import ApplianceList from "../components/ApplianceList";
import ChatWidget from "../components/ChatWidget";
import PowerSourceCard from "../components/PowerSourceCard";
import { api } from "../services/api";

export default function DashboardScreen({ route, navigation }) {
  const { userId, latitude, longitude, numSolarPlates, hasSolar, hasBattery, batteryCapacityWh } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [weather, setWeather] = useState(null);
  const [power, setPower] = useState(null);
  const [appliances, setAppliances] = useState([]);
  const [solarInfo, setSolarInfo] = useState(null);
  const [alert, setAlert] = useState(null);

  // Only relevant once solar isn't producing enough — the app can't sense
  // this on its own, so it asks.
  const [needsUserChoice, setNeedsUserChoice] = useState(false);
  const [userChoice, setUserChoice] = useState(null); // "utility" | "battery"

  // Battery % is only ever asked for live, once the user has picked
  // "Battery" — never during setup/registration (charge changes by the hour).
  const [batteryPct, setBatteryPct] = useState("");

  const [units, setUnits] = useState("");
  const [billResult, setBillResult] = useState(null);

  const routeAndLoadAppliances = useCallback(async (weatherData, choiceOverride, batteryPctOverride) => {
    const choice = choiceOverride !== undefined ? choiceOverride : userChoice;
    const pct = batteryPctOverride !== undefined
      ? batteryPctOverride
      : (batteryPct ? parseInt(batteryPct, 10) : null);

    const powerData = await api.routePower({
      solar_strength: weatherData.solar_strength,
      has_solar: hasSolar,
      has_battery: hasBattery,
      user_choice: choice,
      battery_pct: pct,
    });

    setPower(powerData);
    setNeedsUserChoice(powerData.needs_user_choice);

    // Still waiting on the user to answer utility-vs-battery — nothing to
    // calculate yet.
    if (powerData.needs_user_choice) {
      setAppliances([]);
      setSolarInfo(null);
      return;
    }

    const safeData = await api.safeToRun({
      user_id: userId,
      power_source: powerData.power_source,
      num_solar_plates: numSolarPlates,
      solar_output_pct: powerData.solar_output_pct,
      hours_until_sunset: weatherData.hours_until_sunset,
      battery_capacity_wh: batteryCapacityWh,
      battery_pct: pct,
    });

    if (safeData.power_source === "solar") {
      setAppliances([
        ...safeData.can_run_now.map((a) => ({ ...a, safe_to_run: true })),
        ...safeData.can_run_with_switch.map((a) => ({ ...a, safe_to_run: false })),
      ]);
      setSolarInfo({
        availableWatts: safeData.available_watts,
        canRunNow: safeData.can_run_now,
        canRunWithSwitch: safeData.can_run_with_switch,
      });
    } else {
      setAppliances(safeData.appliances);
      setSolarInfo(null);
    }

    const alertData = await api.checkAlert({
      rain_soon_pct: weatherData.rain_soon_pct,
      has_battery: hasBattery,
      battery_pct: pct,
    });
    setAlert(alertData.should_alert ? alertData : null);
  }, [hasSolar, hasBattery, numSolarPlates, batteryCapacityWh, batteryPct, userChoice]);

  const loadDashboard = useCallback(async () => {
    setErrorMsg("");
    setUserChoice(null);
    setBatteryPct("");
    try {
      const weatherData = await api.getWeather(latitude, longitude);
      setWeather(weatherData);
      await routeAndLoadAppliances(weatherData, null, null);
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong loading the dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    loadDashboard();
  }, []);

  function handlePickUtility() {
    setUserChoice("utility");
    if (weather) routeAndLoadAppliances(weather, "utility", null);
  }

  function handlePickBattery() {
    setUserChoice("battery");
    // Don't call the API yet — wait until they've entered a battery %.
  }

  function handleBatteryPctSubmit() {
    if (!weather || !batteryPct) return;
    const pct = parseInt(batteryPct, 10);
    routeAndLoadAppliances(weather, "battery", pct);
  }

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

  const chatContext = {
    power_source: power?.power_source,
    available_watts: solarInfo?.availableWatts,
    appliances: appliances.map((a) => ({ name: a.name, watts: a.watts, safe_to_run: a.safe_to_run })),
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} />
        }
      >
        <AppHeader />
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        {alert && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>{alert.message}</Text>
          </View>
        )}

        {power && !needsUserChoice && <PowerSourceCard {...power} />}

        {needsUserChoice && (
          <View style={styles.choiceBox}>
            <Text style={styles.choiceTitle}>What are you running on right now?</Text>
            <Text style={styles.choiceHint}>Solar isn't producing enough — we need to know what's actually powering the house.</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity style={styles.choiceButton} onPress={handlePickUtility}>
                <Text style={styles.choiceButtonText}>Utility Grid</Text>
              </TouchableOpacity>
              {hasBattery && (
                <TouchableOpacity style={styles.choiceButton} onPress={handlePickBattery}>
                  <Text style={styles.choiceButtonText}>Battery</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {needsUserChoice && userChoice === "battery" && (
          <>
            <Text style={styles.label}>Battery % right now</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 62"
              keyboardType="number-pad"
              value={batteryPct}
              onChangeText={setBatteryPct}
              onEndEditing={handleBatteryPctSubmit}
            />
          </>
        )}

        {!needsUserChoice && (
          <>
            <Text style={styles.sectionTitle}>Safe to run right now</Text>
            <ApplianceList appliances={appliances} solarInfo={solarInfo} powerSource={power?.power_source} />
          </>
        )}

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

        <TouchableOpacity
          style={styles.proButton}
          onPress={() => navigation.navigate("AccurateBill")}
        >
          <Text style={styles.proButtonText}>Get a more accurate bill →</Text>
        </TouchableOpacity>
      </ScrollView>

      <ChatWidget context={chatContext} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#E53E3E", marginBottom: 12 },
  alertBanner: { backgroundColor: "#FFF5F5", borderRadius: 12, padding: 14, marginBottom: 16 },
  alertText: { color: "#C53030", fontSize: 14, fontWeight: "500" },
  choiceBox: { backgroundColor: "#F7FAFC", borderRadius: 12, padding: 16, marginBottom: 16 },
  choiceTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  choiceHint: { fontSize: 12, color: "#666", marginBottom: 12 },
  choiceRow: { flexDirection: "row", gap: 10 },
  choiceButton: { flex: 1, backgroundColor: "#1A202C", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  choiceButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  label: { fontSize: 15, fontWeight: "500", marginBottom: 8 },
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