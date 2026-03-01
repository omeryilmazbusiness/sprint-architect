import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { T } from "@/constants/adminTheme";

const INTRO_KEY = "ht_has_seen_intro";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [introChecked, setIntroChecked] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY).then((val) => {
      setShowIntro(val !== "true");
      setIntroChecked(true);
    });
  }, []);

  if (isLoading || !introChecked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    if (user?.role === "PATIENT") return <Redirect href="/(patient)/dashboard" />;
    if (user?.role === "ADMIN") return <Redirect href="/(admin)/dashboard" />;
    return <Redirect href="/(tabs)" />;
  }

  if (showIntro) return <Redirect href="/(auth)/intro" />;
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.bg },
});
