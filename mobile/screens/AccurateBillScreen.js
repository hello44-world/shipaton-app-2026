import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import AppHeader from "../components/AppHeader";
import { api } from "../services/api";
import { useIsPro } from "../services/purchases";


export default function AccurateBillScreen({ navigation }) {
  const isPro = useIsPro();

  async function restore() {
    await Purchases.restorePurchases();
  }

  async function goPro() {
    await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: "watt guard Pro",
    });
  }

  const [targetBill, setTargetBill] = useState("");
  const [budgetResult, setBudgetResult] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [scannedUnits, setScannedUnits] = useState("");
  const [scannedAmount, setScannedAmount] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [scanError, setScanError] = useState("");


  async function handleBudgetOptimize() {
    if (!targetBill) return;
    const result = await api.optimizeBudget({ target_bill_usd: parseFloat(targetBill) });
    setBudgetResult(result);
  }

  async function processScannedImage(base64) {
    setScanning(true);
    setScanError("");
    try {
      const extracted = await api.scanBillPhoto({ image_base64: base64 });
      setScannedUnits(extracted.units_kwh != null ? String(extracted.units_kwh) : "");
      setScannedAmount(extracted.total_amount_usd != null ? String(extracted.total_amount_usd) : "");
      setAnalysis(null);
    } catch (e) {
      setScanError(e.message || "Couldn't read that photo — try entering the numbers manually below.");
    } finally {
      setScanning(false);
    }
  }

  async function handleScanBill() {
    setScanError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setScanError("Camera access is needed to scan your bill.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    await processScannedImage(result.assets[0].base64);
  }

  async function handlePickFromGallery() {
    setScanError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setScanError("Photo library access is needed to choose a bill photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.6,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    await processScannedImage(result.assets[0].base64);
  }

  async function handleAnalyze() {
    if (!scannedUnits) return;
    setAnalyzing(true);
    setScanError("");
    try {
      const result = await api.analyzeBill({
        units_kwh: parseFloat(scannedUnits),
        total_amount_usd: scannedAmount ? parseFloat(scannedAmount) : undefined,
      });
      setAnalysis(result);
    } catch (e) {
      setScanError(e.message || "Couldn't analyze the bill.");
    } finally {
      setAnalyzing(false);
    }
  }



  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24 }}>
      <AppHeader />
      <Text style={styles.title}>Accurate bill tools</Text>

      {!isPro && (
        <TouchableOpacity style={styles.button} onPress={goPro}>
          <Text style={styles.buttonText}>⭐ Go Pro</Text>
        </TouchableOpacity>
      )}

      {!isPro && (
        <TouchableOpacity onPress={restore}>
          <Text style={styles.hint}>Restore Purchases</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Accurate bill (from a photo)</Text>
      <Text style={styles.hint}>
        Take a photo of your actual bill — WattGuard reads the numbers and tells you
        honestly why it's higher or lower than last time.
      </Text>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={handleScanBill} disabled={scanning}>
          <Text style={styles.buttonText}>{scanning ? "Reading..." : "📷 Scan my bill"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton, { flex: 1 }]} onPress={handlePickFromGallery} disabled={scanning}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>{scanning ? "Reading..." : "🖼️ Choose from gallery"}</Text>
        </TouchableOpacity>
      </View>

      {scanError ? <Text style={styles.error}>{scanError}</Text> : null}

      {(scannedUnits || scannedAmount) && (
        <>
          <Text style={styles.hint}>Double check these — OCR isn't perfect:</Text>
          <TextInput
            style={styles.input}
            placeholder="Units (kWh)"
            keyboardType="numeric"
            value={scannedUnits}
            onChangeText={setScannedUnits}
          />
          <TextInput
            style={styles.input}
            placeholder="Total amount (USD)"
            keyboardType="numeric"
            value={scannedAmount}
            onChangeText={setScannedAmount}
          />
          <TouchableOpacity style={styles.button} onPress={handleAnalyze} disabled={analyzing}>
            <Text style={styles.buttonText}>{analyzing ? "Analyzing..." : "Get my honest analysis"}</Text>
          </TouchableOpacity>
        </>
      )}

      {analysis && (
        <View style={styles.analysisBox}>
          <Text style={styles.analysisText}>{analysis.explanation}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Budget optimizer</Text>
      <Text style={styles.hint}>Tell us your target monthly bill — we'll build a daily runtime plan.</Text>
      <TextInput
        style={styles.input}
        placeholder="Target monthly bill (USD)"
        keyboardType="numeric"
        value={targetBill}
        onChangeText={setTargetBill}
      />
      <TouchableOpacity style={styles.button} onPress={handleBudgetOptimize}>
        <Text style={styles.buttonText}>Build my schedule</Text>
      </TouchableOpacity>

      {budgetResult && (
        <View style={{ marginTop: 20 }}>
          {budgetResult.schedule.map((item) => (
            <View key={item.id} style={styles.scheduleRow}>
              <Text style={styles.scheduleName}>{item.name}</Text>
              <Text style={styles.scheduleHours}>{item.max_hours_per_day} hrs/day</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 6, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginTop: 24, marginBottom: 6 },
  hint: { fontSize: 12, color: "#999", marginBottom: 12 },
  error: { color: "#E53E3E", marginBottom: 12, fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: "#DDD", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14, fontSize: 15,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  button: { backgroundColor: "#1A202C", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  secondaryButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#1A202C" },
  secondaryButtonText: { color: "#1A202C" },
  scheduleRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEE",
  },
  scheduleName: { fontSize: 15 },
  scheduleHours: { fontSize: 15, color: "#666" },
  analysisBox: {
    backgroundColor: "#FFFAF0", borderRadius: 12, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: "#FBD38D",
  },
  analysisText: { fontSize: 14, color: "#744210", lineHeight: 20 },
});