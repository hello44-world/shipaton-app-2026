import { useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList, KeyboardAvoidingView, Platform,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from "react-native";
import { api } from "../services/api";

export default function ChatWidget({ context }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "Hi! Ask me anything about your power or bill." },
  ]);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg = { id: `${Date.now()}-u`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await api.sendChatMessage({ message: text, context });
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: "assistant", text: res.reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: `${Date.now()}-e`, role: "assistant", text: "Sorry, I couldn't reach the server. Try again." }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  if (!open) {
    return (
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)}>
        <Text style={styles.fabIcon}>💬</Text>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.panel}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WattGuard Assistant</Text>
        <TouchableOpacity onPress={() => setOpen(false)}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.messages}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
            <Text style={item.role === "user" ? styles.userText : styles.assistantText}>{item.text}</Text>
          </View>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {sending && <ActivityIndicator style={{ marginBottom: 8 }} />}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about an appliance, your bill..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute", right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#1A202C", alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  fabIcon: { fontSize: 24 },
  panel: {
    position: "absolute", right: 16, bottom: 16, left: 16, top: 80,
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    elevation: 8, shadowColor: "#000", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    borderWidth: 1, borderColor: "#EEE",
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#EEE",
  },
  headerTitle: { fontWeight: "700", fontSize: 16 },
  closeIcon: { fontSize: 18, color: "#999" },
  messages: { flex: 1 },
  bubble: { borderRadius: 14, padding: 12, marginBottom: 10, maxWidth: "85%" },
  userBubble: { backgroundColor: "#1A202C", alignSelf: "flex-end" },
  assistantBubble: { backgroundColor: "#F0F0F0", alignSelf: "flex-start" },
  userText: { color: "#fff", fontSize: 14 },
  assistantText: { color: "#1A202C", fontSize: 14 },
  inputRow: { flexDirection: "row", padding: 12, borderTopWidth: 1, borderTopColor: "#EEE", gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: "#DDD", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  sendButton: { backgroundColor: "#1A202C", borderRadius: 20, paddingHorizontal: 16, justifyContent: "center" },
  sendText: { color: "#fff", fontWeight: "600" },
});