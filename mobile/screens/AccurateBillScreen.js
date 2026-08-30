import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { isProUser, getOfferings, purchase } from "../services/purchases";
import { api } from "../services/api";

export default function AccurateBillScreen() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [offerings, setOfferings] = useState(null);

  const [targetBill, setTargetBill] = useState("");
  const [budgetResult, setBudgetResult] = useState(null);

  useEffect(() => {
    (async () => {
      const pro = await isProUser();
      setIsPro(pro);
      if (!pro) {
        try {
          setOfferings(await getOfferings());
        } catch (e) {
          console.warn("Could not load offerings:", e.message);
        }
      }
      setCheckingAccess(false);
    })();
  }, []);

  async function handlePurchase(pkg) {
    try {
      const granted = await purchase(pkg);
      setIsPro(granted);
    } catch (e) {
      if (!e.userCancelled) console.warn("Purchase failed:", e.message);
    }
  }

  async function handleBudgetOptimize() {
    if (!targetBill) return;
    const result = await api.optimizeBudget({ target_bill_usd: parseFloat(targetBill) });
    setBudgetResult(result);
  }

  if (checkingAccess) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isPro) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>WattGuard Pro</Text>
        <Text style={styles.subtitle}>
          Unlock the bill translator, a personal energy budget, AI chat, and smart alerts.
        </Text>

        {offerings?.availablePackages?.length ? (
          offerings.availablePackages.map((pkg) => (
            <TouchableOpacity key={pkg.identifier} style={styles.planButton} onPress={() => handlePurchase(pkg)}>
              <Text style={styles.planTitle}>{pkg.product.title}</Text>
              <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
            </TouchableOpacity>
          ))
        ) : (
          // Fallback pricing shown if RevenueCat offerings haven't loaded
          // (e.g. API key not configured yet during early development).
          <>
            <View style={styles.planButton}>
              <Text style={styles.planTitle}>Weekly</Text>
              <Text style={styles.planPrice}>$1.26 / week</Text>
            </View>
            <View style={styles.planButton}>
              <Text style={styles.planTitle}>Monthly</Text>
              <Text style={styles.planPrice}>$3.60 / month</Text>
            </View>
            <Text style={styles.hint}>Connect your RevenueCat API key to enable real purchases.</Text>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Accurate bill tools</Text>

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

      <Text style={styles.sectionTitle}>Bill translator</Text>
      <Text style={styles.hint}>
        Photo-to-breakdown is wired on the backend (/api/bill/translate) but the camera
        picker UI isn't built yet — add expo-image-picker here to finish this piece.
      </Text>
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
  input: {
    borderWidth: 1, borderColor: "#DDD", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14, fontSize: 15,
  },
  button: { backgroundColor: "#1A202C", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  planButton: {
    borderWidth: 1, borderColor: "#EEE", borderRadius: 12,
    padding: 18, marginBottom: 12, backgroundColor: "#FAFAFA",
  },
  planTitle: { fontSize: 16, fontWeight: "600" },
  planPrice: { fontSize: 14, color: "#666", marginTop: 4 },
  scheduleRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEE",
  },
  scheduleName: { fontSize: 15 },
  scheduleHours: { fontSize: 15, color: "#666" },
});
