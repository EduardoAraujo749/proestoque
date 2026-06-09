import { Colors, Spacing, Typography } from "@/src/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ErrorView } from "../../src/components/ErrorView";
import { ProdutoListaSkeleton } from "../../src/components/ProdutoSkeleton";
import { useAuth } from "../../src/contexts/AuthContext";
import { useProducts, type Produto } from "../../src/contexts/ProductsContext";
import { useCategorias, type Categoria } from "../../src/hooks/useCategorias";
import { formatarPreco } from "../../src/utils/formatters";

type CardResumo = {
  id: string;
  titulo: string;
  valor: string | number;
  icone: keyof typeof Ionicons.glyphMap;
  corIcone: string;
};

type StatusProduto = {
  label: "Normal" | "Baixo" | "Sem estoque";
  backgroundColor: string;
  textColor: string;
  borderColor: string;
};

function getStatusProduto(produto: Produto): StatusProduto {
  if (produto.quantidade === 0) {
    return {
      label: "Sem estoque",
      backgroundColor: Colors.danger.bg,
      textColor: Colors.danger.text,
      borderColor: Colors.danger.border,
    };
  }

  if (produto.quantidade < produto.quantidadeMinima) {
    return {
      label: "Baixo",
      backgroundColor: Colors.warning.bg,
      textColor: Colors.warning.text,
      borderColor: Colors.warning.border,
    };
  }

  return {
    label: "Normal",
    backgroundColor: Colors.success.bg,
    textColor: Colors.success.text,
    borderColor: Colors.success.border,
  };
}

function formatarDataHoje() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { produtos, isLoading, error, carregarProdutos } = useProducts();
  const { categorias } = useCategorias();
  const [refreshing, setRefreshing] = useState(false);

  const alertas = useMemo(
    () => produtos.filter((produto: Produto) => produto.quantidade < produto.quantidadeMinima),
    [produtos]
  );
  const valorEmEstoque = useMemo(
    () => produtos.reduce((total: number, produto: Produto) => total + produto.quantidade * produto.preco, 0),
    [produtos]
  );
  const totalProdutos = produtos.length;

  const produtosRecentes = useMemo(() => {
    return [...produtos].sort(
      (a, b) => new Date(b.ultimaMovimentacao).getTime() - new Date(a.ultimaMovimentacao).getTime()
    );
  }, [produtos]);

  const cardsResumo: CardResumo[] = useMemo(
    () => [
      {
        id: "total",
        titulo: "Total",
        valor: totalProdutos,
        icone: "cube-outline",
        corIcone: Colors.primary[600],
      },
      {
        id: "alertas",
        titulo: "Alertas",
        valor: alertas.length,
        icone: "alert-circle-outline",
        corIcone: alertas.length > 0 ? Colors.danger.text : Colors.success.text,
      },
      {
        id: "categorias",
        titulo: "Categorias",
        valor: categorias.length,
        icone: "grid-outline",
        corIcone: Colors.info.text,
      },
      {
        id: "valor",
        titulo: "Valor",
        valor: formatarPreco(valorEmEstoque),
        icone: "cash-outline",
        corIcone: Colors.success.text,
      },
    ],
    [alertas.length, categorias.length, totalProdutos, valorEmEstoque]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarProdutos();
    setRefreshing(false);
  }, [carregarProdutos]);

  const saudacao = useMemo(() => {
    const horaAtual = new Date().getHours();

    if (horaAtual < 12) {
      return "Bom dia";
    }

    if (horaAtual < 18) {
      return "Boa tarde";
    }

    return "Boa noite";
  }, []);

  const primeiroNome = user?.nome?.trim()?.split(" ")[0] || "Usuário";
  const inicialNome = user?.nome?.trim()?.charAt(0)?.toUpperCase() || "U";

  const DashboardHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.headerCard}>
        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicialNome}</Text>
          </View>
          <Text style={styles.greeting}>
            {saudacao}, {primeiroNome}
          </Text>
        </View>

        <Text style={styles.subtitle}>Visão geral do estoque</Text>
        <Text style={styles.headerDate}>{formatarDataHoje()}</Text>
      </View>

      <View style={styles.cardsGrid}>
        {cardsResumo.map((card) => (
          <View key={card.id} style={styles.cardResumo}>
            <View style={styles.cardTopRow}>
              <Ionicons name={card.icone} size={18} color={card.corIcone} />
              <Text style={styles.cardDash}>-</Text>
              <Text style={styles.cardTitulo}>{card.titulo}</Text>
            </View>
            <Text style={styles.cardValor}>{card.valor}</Text>
          </View>
        ))}
      </View>

      {alertas.length > 0 && (
        <View style={styles.alertaBox}>
          <Text style={styles.alertaTitulo}>Estoque crítico ({alertas.length})</Text>
          {alertas.slice(0, 3).map((produto: Produto) => (
            <View key={produto.id} style={styles.alertaLinha}>
              <Text style={styles.alertaNome}>{produto.nome}</Text>
              <Text style={styles.alertaQtd}>
                {produto.quantidade}/{produto.quantidadeMinima} {produto.unidade}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={styles.alertaAcao} onPress={() => router.push("/produtos")} activeOpacity={0.8}>
            <Text style={styles.alertaAcaoTexto}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.danger.text} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Produtos recentes</Text>
    </View>
  );

  const renderProduto = ({ item }: { item: Produto }) => {
    const categoria = categorias.find((cat: Categoria) => cat.id === item.categoriaId);
    const status = getStatusProduto(item);

    return (
      <View style={styles.produtoCard}>
        <View style={styles.produtoMainInfo}>
          <Ionicons
            name={(categoria?.icone as keyof typeof Ionicons.glyphMap) ?? "cube-outline"}
            size={18}
            color={categoria?.cor ?? Colors.primary[600]}
          />
          <View style={styles.produtoTextos}>
            <Text style={styles.produtoNome}>{item.nome}</Text>
            <Text style={styles.produtoMeta}>
              {item.quantidade} {item.unidade} • Mín {item.quantidadeMinima}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: status.backgroundColor,
              borderColor: status.borderColor,
            },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: status.textColor }]}>{status.label}</Text>
        </View>
      </View>
    );
  };

  if (isLoading && produtos.length === 0) {
    return (
      <FlatList
        ListHeaderComponent={<ProdutoListaSkeleton count={7} />}
        data={[]}
        renderItem={() => null}
        keyExtractor={() => "empty"}
      />
    );
  }

  if (error && produtos.length === 0) {
    return <ErrorView mensagem={error} onRetry={carregarProdutos} />;
  }

  return (
    <FlatList<Produto>
      data={produtosRecentes}
      keyExtractor={(item) => item.id}
      renderItem={renderProduto}
      ListHeaderComponent={DashboardHeader}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[600]} />}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[8],
    backgroundColor: Colors.background,
  },
  headerContent: {
    marginBottom: Spacing[4],
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    padding: Spacing[4],
    alignItems: "center",
    marginBottom: Spacing[4],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 5,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary[600],
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing[2],
  },
  avatarText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.md,
  },
  greeting: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 36,
    textAlign: "center",
  },
  greetingEmoji: {
    marginLeft: Spacing[2],
    fontSize: Typography.fontSize["2xl"],
  },
  subtitle: {
    marginTop: Spacing[1],
    marginBottom: Spacing[2],
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  headerDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    textAlign: "center",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing[1],
  },
  cardResumo: {
    width: "50%",
    marginBottom: Spacing[2],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  cardDash: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    marginHorizontal: Spacing[1],
  },
  cardTitulo: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    flexShrink: 1,
  },
  cardValor: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  alertaBox: {
    borderWidth: 1,
    borderColor: Colors.danger.border,
    backgroundColor: Colors.danger.bg,
    borderRadius: 20,
    padding: Spacing[4],
    marginTop: Spacing[2],
    marginBottom: Spacing[4],
  },
  alertaTitulo: {
    color: Colors.danger.text,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing[2],
  },
  alertaLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[1],
  },
  alertaNome: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    flex: 1,
    marginRight: Spacing[2],
  },
  alertaQtd: {
    color: Colors.danger.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  alertaAcao: {
    marginTop: Spacing[2],
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
  },
  alertaAcaoTexto: {
    color: Colors.danger.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginRight: Spacing[1],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  produtoCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  produtoMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing[2],
  },
  produtoTextos: {
    marginLeft: Spacing[2],
    flex: 1,
  },
  produtoNome: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing[1],
  },
  produtoMeta: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  statusBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
