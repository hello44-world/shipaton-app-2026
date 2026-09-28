import { LogBox } from 'react-native';
LogBox.ignoreAllLogs(true);

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import AccurateBillScreen from "./screens/AccurateBillScreen";
import AppliancesSetupScreen from "./screens/AppliancesSetupScreen";
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SetupScreen from "./screens/SetupScreen";
import { initPurchases } from "./services/purchases";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initPurchases();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Setup" component={SetupScreen} options={{ title: "Set up" }} />
        <Stack.Screen name="AppliancesSetup" component={AppliancesSetupScreen} options={{ title: "Your devices" }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "WattGuard" }} />
        <Stack.Screen name="AccurateBill" component={AccurateBillScreen} options={{ title: "Accurate bill" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}