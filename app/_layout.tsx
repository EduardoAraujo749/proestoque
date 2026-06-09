import SplashScreen from "@/src/components/SplashScreen";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { ProductsProvider } from "@/src/contexts/ProductsContext";
import {
    agendarVerificacaoDiaria,
    limparBadge,
    solicitarPermissaoNotificacoes,
} from "@/src/services/notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

export const unstable_settings = {
  initialRouteName: "(auth)/login",
};

function NavigationGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setMinimumSplashElapsed(true);
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  // Configurar notificações quando usuário se autentica
  useEffect(() => {
    async function configurarNotificacoes() {
      const temPermissao = await solicitarPermissaoNotificacoes();
      if (temPermissao) {
        await agendarVerificacaoDiaria();
      } else {
        await limparBadge();
      }
    }

    if (isAuthenticated) {
      configurarNotificacoes();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading || !minimumSplashElapsed) {
      return;
    }

    const estaNoGrupoAuth = segments[0] === "(auth)";

    if (!isAuthenticated && !estaNoGrupoAuth) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && estaNoGrupoAuth) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, minimumSplashElapsed, router, segments]);

  if (isLoading || !minimumSplashElapsed) {
    return <SplashScreen />;
  }

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProductsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <NavigationGuard />
        <StatusBar style="auto" />
      </ProductsProvider>
    </AuthProvider>
  );
}

