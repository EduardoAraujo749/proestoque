import Input from "@/src/components/Input";
import { Colors, Spacing, Typography } from "@/src/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorView } from "../../../src/components/ErrorView";
import { ProdutoListaSkeleton } from "../../../src/components/ProdutoSkeleton";
import { useProducts, type Produto } from "../../../src/contexts/ProductsContext";
import { useCategorias, type Categoria } from "../../../src/hooks/useCategorias";

export default function ProdutosScreen() {
  const { produtos, isLoading, error, carregarProdutos } = useProducts();
  const { categorias } = useCategorias();
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const filtrosCategoria = useMemo(
    () => [{ id: "todos", nome: "Todos", icone: "apps-outline", cor: Colors.primary[600] }, ...categorias],
    [categorias]
  );

  const produtosFiltrados = useMemo(() => {
    return [...produtos]
      .filter((produto) => {
        const bateBusca = produto.nome.toLowerCase().includes(busca.toLowerCase().trim());
        const bateCategoria = categoriaAtiva ? produto.categoriaId === categoriaAtiva : true;
        return bateBusca && bateCategoria;
      })
      .sort((a, b) => new Date(b.ultimaMovimentacao).getTime() - new Date(a.ultimaMovimentacao).getTime());
  }, [produtos, busca, categoriaAtiva]);

  const renderProduto = ({ item }: { item: Produto }) => {
    const categoria = categorias.find((cat: Categoria) => cat.id === item.categoriaId);
    const emAlerta = item.quantidade < item.quantidadeMinima;
    const semEstoque = item.quantidade === 0;

    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/produtos/${item.id}`)} activeOpacity={0.88}>
        <View style={styles.itemHeader}>
          <View style={styles.itemLeft}>
            {item.foto ? (
              <Image source={{ uri: item.foto }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.iconeCategoria, { backgroundColor: `${categoria?.cor ?? Colors.primary[600]}15` }]}>
                <Ionicons
                  name={(categoria?.icone as keyof typeof Ionicons.glyphMap) ?? "cube-outline"}
                  size={18}
                  color={categoria?.cor ?? Colors.primary[600]}
                />
              </View>
            )}
            <View style={styles.itemTextos}>
              <Text style={styles.itemNome}>{item.nome}</Text>
              <Text style={styles.itemMeta}>
                {categoria?.nome ?? "Sem categoria"} • {item.quantidade} {item.unidade}
              </Text>
            </View>
          </View>

          <View style={[styles.badge, semEstoque ? styles.badgeSemEstoque : emAlerta ? styles.badgeAlerta : styles.badgeNormal]}>
            <Text style={styles.badgeText}>{semEstoque ? "Sem estoque" : emAlerta ? "Baixo" : "Normal"}</Text>
          </View>
        </View>

        {item.observacao ? <Text style={styles.observacao}>{item.observacao}</Text> : null}
      </TouchableOpacity>
    );
  };

  if (isLoading && produtos.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ProdutoListaSkeleton count={7} />
      </SafeAreaView>
    );
  }

  if (error && produtos.length === 0) {
    return <ErrorView mensagem={error} onRetry={carregarProdutos} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={produtosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderProduto}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              <Text style={styles.titulo}>Produtos</Text>
              <Text style={styles.subtitulo}>Gerencie itens do estoque com criar, editar e excluir.</Text>
            </View>

            <Input
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar produto..."
              leftIcon="search-outline"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.chips}>
              {filtrosCategoria.map((categoria: Categoria | { id: string; nome: string; icone: string; cor: string }) => {
                const ativo = categoria.id === "todos" ? categoriaAtiva === null : categoriaAtiva === categoria.id;
                return (
                  <TouchableOpacity
                    key={categoria.id}
                    style={[styles.chip, ativo && styles.chipAtivo, ativo && { borderColor: categoria.cor, backgroundColor: Colors.white }]}
                    onPress={() => {
                      if (categoria.id === "todos") {
                        setCategoriaAtiva(null);
                        return;
                      }

                      setCategoriaAtiva((valorAtual) => (valorAtual === categoria.id ? null : categoria.id));
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={(categoria.icone as keyof typeof Ionicons.glyphMap) ?? "pricetag-outline"}
                      size={14}
                      color={ativo ? categoria.cor : Colors.textSecondary}
                    />
                    <Text style={[styles.chipText, ativo && { color: categoria.cor }]}>{categoria.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Ionicons name="cube-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.vazioTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.vazioText}>Tente ajustar a busca ou criar um novo produto.</Text>
            <TouchableOpacity style={styles.vazioButton} onPress={() => router.push("/produtos/novo")} activeOpacity={0.85}>
              <Text style={styles.vazioButtonText}>Cadastrar produto</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={<RefreshControl refreshing={isLoading && produtos.length > 0} onRefresh={carregarProdutos} tintColor={Colors.primary[600]} />}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/produtos/novo")} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[10],
    backgroundColor: Colors.background,
  },
  header: {
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  hero: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: Spacing[4],
  },
  titulo: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[1],
  },
  subtitulo: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: 999,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  chipAtivo: {
    backgroundColor: Colors.white,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[2],
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing[3],
  },
  itemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  iconeCategoria: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemTextos: {
    flex: 1,
  },
  itemNome: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  observacao: {
    marginTop: Spacing[2],
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeNormal: {
    backgroundColor: Colors.success.bg,
  },
  badgeAlerta: {
    backgroundColor: Colors.warning.bg,
  },
  badgeSemEstoque: {
    backgroundColor: Colors.danger.bg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  vazio: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 96,
    paddingHorizontal: Spacing[6],
    gap: Spacing[2],
  },
  vazioTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  vazioText: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
  },
  vazioButton: {
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: 999,
    backgroundColor: Colors.primary[600],
  },
  vazioButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
