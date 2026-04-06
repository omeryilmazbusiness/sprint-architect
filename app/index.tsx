import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/constants/adminTheme";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    if (user?.role === "PATIENT")                                   return <Redirect href="/(patient)/dashboard" />;
    if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")     return <Redirect href="/(admin)/dashboard" />;
    if (user?.role === "MANAGER")                                    return <Redirect href="/(manager-tabs)/dashboard" />;
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bg,
  },
});
