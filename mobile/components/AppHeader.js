import { Image, StyleSheet, View } from "react-native";

export default function AppHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  logo: { width: 220, height: 72 },
});