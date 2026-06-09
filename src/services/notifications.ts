import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// Configura como as notificações aparecem quando o app está aberto
// "banner" = aparece como banner no topo + som
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Solicitar permissão ─────────────────────────────────────
export async function solicitarPermissaoNotificacoes(): Promise<boolean> {
  // Notificações só funcionam em dispositivos físicos (não simulador)
  if (!Device.isDevice) {
    console.warn("Notificações não funcionam no simulador");
    return false;
  }

  const { status: statusAtual } = await Notifications.getPermissionsAsync();

  if (statusAtual === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── Notificação imediata ────────────────────────────────────
export async function notificarEstoqueCritico(
  produtos: Array<{ nome: string; quantidade: number; quantidadeMinima: number }>
) {
  const temPermissao = await solicitarPermissaoNotificacoes();
  if (!temPermissao) return;

  if (produtos.length === 0) return;

  // Uma notificação por produto crítico (máx 3 para não spam)
  const paraNotificar = produtos.slice(0, 3);

  for (const produto of paraNotificar) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Estoque crítico",
        body: `${produto.nome}: ${produto.quantidade}/${produto.quantidadeMinima} (abaixo do mínimo)`,
        data: { produtoNome: produto.nome }, // Dados extras acessíveis ao tocar
        // Badge: número de alertas no ícone do app
        badge: produtos.length,
      },
      // trigger: null = dispara IMEDIATAMENTE
      trigger: null,
    });
  }

  // Se houver mais de 3, envia uma notificação de resumo
  if (produtos.length > 3) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Mais alertas de estoque",
        body: `+${produtos.length - 3} produtos com estoque crítico. Verifique o ProEstoque.`,
        badge: produtos.length,
      },
      trigger: null,
    });
  }
}

// ── Notificação agendada (checagem diária) ──────────────────
export async function agendarVerificacaoDiaria() {
  // Cancela agendamentos anteriores para evitar duplicatas
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📦 ProEstoque",
      body: "Verifique o estoque de hoje. Toque para abrir.",
    },
    trigger: {
      hour: 8, // 8h da manhã
      minute: 0,
      repeats: true, // Todos os dias
    } as any,
  });
}

// ── Limpar badge ao abrir o app ─────────────────────────────
export async function limparBadge() {
  await Notifications.setBadgeCountAsync(0);
}
