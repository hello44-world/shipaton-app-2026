import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { api } from "../services/api";
import Purchases from "react-native-purchases";

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setError("");

    if (isLogin) {
      if (!username || !password) {
        setError("Enter your username and password.");
        return;
      }
      setLoading(true);
      try {
        const user = await api.login({ username, password });
        await Purchases.logIn(String(user.user_id));
        if (user.num_solar_plates > 0 || user.has_battery) {
          // Already been through setup before — skip straight to the dashboard.
          navigation.navigate("Dashboard", {
            userId: user.user_id,
            username: user.username,
            latitude: user.latitude,
            longitude: user.longitude,
            numSolarPlates: user.num_solar_plates,
            hasSolar: user.num_solar_plates > 0,
            hasBattery: user.has_battery,
            batteryCapacityWh: user.battery_capacity_wh,
          });
        } else {
          navigation.navigate("Setup", {
            userId: user.user_id,
            username: user.username,
            latitude: user.latitude,
            longitude: user.longitude,
          });
        }
      } catch (e) {
        setError(e.message || "Couldn't log in.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!username || !password || !country || !city || !area) {
      setError("Fill in every field to continue.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.signup({ username, password, country, city, area });
      await Purchases.logIn(String(result.user_id));
      navigation.navigate("Setup", {
        userId: result.user_id,
        username: result.username,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } catch (e) {
      setError(e.message || "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>WattGuard</Text>
      <Text style={styles.subtitle}>Smart energy management for your home</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {!isLogin && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Country"
            value={country}
            onChangeText={setCountry}
          />
          <TextInput
            style={styles.input}
            placeholder="City (e.g. Lahore)"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={styles.input}
            placeholder="Area / society (e.g. Model Town)"
            value={area}
            onChangeText={setArea}
          />
          <Text style={styles.hint}>
            Your country, city, and area let WattGuard check the exact local weather for your
            home, instead of a rough citywide guess.
          </Text>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? "Log in" : "Create account"}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setError(""); }}>
        <Text style={styles.switchText}>
          {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", marginTop: 6, marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  hint: { fontSize: 12, color: "#999", marginBottom: 20 },
  error: { color: "#E53E3E", marginBottom: 12, textAlign: "center" },
  button: { backgroundColor: "#1A202C", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { textAlign: "center", marginTop: 18, color: "#1A202C", fontSize: 14 },
});