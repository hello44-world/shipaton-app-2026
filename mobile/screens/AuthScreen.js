import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";

export default function AuthScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");

  function handleContinue() {
    if (!username || !password || !zipCode) {
      setError("Fill in every field to continue.");
      return;
    }
    // NOTE: this is a UI-only stub — no real account is created yet.
    // Wire this up to your backend's /api/auth routes (not built yet)
    // when you're ready to persist real users.
    navigation.navigate("Setup", { username, zipCode });
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
      <TextInput
        style={styles.input}
        placeholder="Zip code"
        keyboardType="number-pad"
        value={zipCode}
        onChangeText={setZipCode}
      />
      <Text style={styles.hint}>Your zip code sets your local utility rate and weather.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
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
});
