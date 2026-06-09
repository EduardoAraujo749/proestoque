import { useAuth } from "@/src/contexts/AuthContext";
import type { Produto } from "@/src/data/mockData";
import type { ProdutoFormData } from "@/src/schemas/produtoSchema";
import { api } from "@/src/services/api";
import {
    limparBadge,
    notificarEstoqueCritico,
} from "@/src/services/notifications";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
export type { Produto } from "@/src/data/mockData";

type ProductsState = {
  produtos: Produto[];
  isLoading: boolean;
  error: string | null;
};

type ProductsAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; payload: Produto[] }
  | { type: "LOAD_ERROR"; payload: string }
  | { type: "ADD"; payload: Produto }
  | { type: "UPDATE"; payload: Produto }
  | { type: "DELETE"; payload: string };

type ProductsContextType = {
  produtos: Produto[];
  isLoading: boolean;
  error: string | null;
  carregarProdutos: () => Promise<void>;
  adicionarProduto: (data: ProdutoFormData) => Promise<void>;
  editarProduto: (id: string, data: ProdutoFormData) => Promise<void>;
  deletarProduto: (id: string) => Promise<void>;
  getProdutoById: (id: string) => Produto | undefined;
};

function produtosReducer(state: ProductsState, action: ProductsAction): ProductsState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, isLoading: true, error: null };
    case "LOAD_SUCCESS":
      return { produtos: action.payload, isLoading: false, error: null };
    case "LOAD_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "ADD":
      return { ...state, produtos: [action.payload, ...state.produtos] };
    case "UPDATE":
      return {
        ...state,
        produtos: state.produtos.map((produto) =>
          produto.id === action.payload.id ? action.payload : produto
        ),
      };
    case "DELETE":
      return {
        ...state,
        produtos: state.produtos.filter((produto) => produto.id !== action.payload),
      };
    default:
      return state;
  }
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [state, dispatch] = useReducer(produtosReducer, {
    produtos: [],
    isLoading: false,
    error: null,
  });

  const carregarProdutos = useCallback(async () => {
    if (!isAuthenticated) {
      dispatch({ type: "LOAD_SUCCESS", payload: [] });
      return;
    }

    dispatch({ type: "LOAD_START" });

    try {
      const { data } = await api.get<Produto[]>("/produtos");
      dispatch({ type: "LOAD_SUCCESS", payload: data });

      // Verificar alertas de estoque crítico e notificar
      const criticos = data.filter((p) => p.quantidade < p.quantidadeMinima);
      if (criticos.length > 0) {
        await notificarEstoqueCritico(criticos);
      } else {
        await limparBadge();
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro ao carregar produtos";
      dispatch({ type: "LOAD_ERROR", payload: mensagem });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authIsLoading) {
      return;
    }

    if (!isAuthenticated) {
      dispatch({ type: "LOAD_SUCCESS", payload: [] });
      return;
    }

    carregarProdutos();
  }, [authIsLoading, carregarProdutos, isAuthenticated]);

  const adicionarProduto = useCallback(async (data: ProdutoFormData) => {
    const { data: novoProduto } = await api.post<Produto>("/produtos", data);

    dispatch({ type: "ADD", payload: novoProduto });
  }, []);

  const editarProduto = useCallback(async (id: string, data: ProdutoFormData) => {
    const { data: produtoAtualizado } = await api.put<Produto>(`/produtos/${id}`, data);

    dispatch({ type: "UPDATE", payload: produtoAtualizado });
  }, []);

  const deletarProduto = useCallback(async (id: string) => {
    await api.delete(`/produtos/${id}`);
    dispatch({ type: "DELETE", payload: id });
  }, []);

  const getProdutoById = useCallback(
    (id: string) => state.produtos.find((produto) => produto.id === id),
    [state.produtos]
  );

  const value = useMemo<ProductsContextType>(
    () => ({
      produtos: state.produtos,
      isLoading: state.isLoading,
      error: state.error,
      carregarProdutos,
      adicionarProduto,
      editarProduto,
      deletarProduto,
      getProdutoById,
    }),
    [
      adicionarProduto,
      carregarProdutos,
      deletarProduto,
      editarProduto,
      getProdutoById,
      state.error,
      state.isLoading,
      state.produtos,
    ]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductsContext);

  if (!context) {
    throw new Error("useProducts deve ser usado dentro de um <ProductsProvider>");
  }

  return context;
}