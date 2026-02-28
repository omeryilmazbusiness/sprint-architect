import { View, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isAuthenticated) {
    if (user?.role === "PATIENT") {
      return <Redirect href="/(patient)/dashboard" />;
    }
    if (user?.role === "ADMIN") {
      return <Redirect href="/(admin)/dashboard" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
