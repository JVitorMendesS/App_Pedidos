import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Product, CartItem, AppView, CheckoutData } from '../types';
import { supabase } from '../supabaseClient';

interface AppContextType {
  products: Product[];
  cart: CartItem[];
  isAuthenticated: boolean;
  isCartOpen: boolean;
  view: AppView;
  loadingProducts: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
  toggleCart: () => void;
  setView: (view: AppView) => void;
  sendOrder: (checkoutData: CheckoutData) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ✅ Produtos agora vêm do Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Carrinho e login continuam no localStorage
  const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
  const [isAuthenticated, setIsAuthenticated] = useLocalStorage<boolean>(
    'isAuthenticated',
    false
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [view, setView] = useState<AppView>('products');

  // 🔄 Carregar produtos do Supabase ao iniciar
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar produtos:', error);
      } else if (data) {
  const mapped: Product[] = data.map((p: any) => ({
  id: p.id,
  name: p.name,
  price: Number(p.price),
  imageUrl: p.image_url,
  description: p.description,
  category: p.category || '',
  // se vier string, quebra em array; se vier array, usa; senão []
  tags: typeof p.tags === 'string'
    ? p.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : Array.isArray(p.tags)
      ? p.tags
      : [],
}));

  setProducts(mapped);
}
      setLoadingProducts(false);
    };

    fetchProducts();
  }, []);

  // ➕ Adicionar produto (admin)
  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const { data, error } = await supabase
      .from('products')
      .insert({
  name: productData.name,
  price: productData.price,
  image_url: productData.imageUrl,
  description: productData.description,
  category: productData.category ?? null,
  tags:
    productData.tags && productData.tags.length
      ? productData.tags.join(',')
      : null,
})

      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar produto:', error);
      return;
    }

    const newProduct: Product = {
  id: data.id,
  name: data.name,
  price: Number(data.price),
  imageUrl: data.image_url,
  description: data.description,
  category: data.category || '',
};

    setProducts((prev) => [...prev, newProduct]);
  };

  // ✏️ Atualizar produto (admin)
  const updateProduct = async (updatedProduct: Product) => {
    const { error } = await supabase
      .from('products')
          .update({
  name: updatedProduct.name,
  price: updatedProduct.price,
  image_url: updatedProduct.imageUrl,
  description: updatedProduct.description,
  category: updatedProduct.category ?? null,
  tags:
    updatedProduct.tags && updatedProduct.tags.length
      ? updatedProduct.tags.join(',')
      : null,
})


      .eq('id', updatedProduct.id);

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  // 🗑️ Deletar produto (admin)
  const deleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Erro ao excluir produto:', error);
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // 🛒 Lógica do carrinho (igual antes)
  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => setCart([]);

  // 🔐 Login simples (por enquanto)
  const login = (user: string, pass: string): boolean => {
    if (user === 'admin' && pass === 'admin') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setView('products');
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);

  // 📲 WhatsApp (igual já estava)
  const sendOrder = (checkoutData: CheckoutData) => {
    const marketPhoneNumber = '551138998270304';
    const total = cart
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
      .toFixed(2);

    let message = `*Novo Pedido - Jaci Supermercados*\n\n`;
    message += `*Itens:*\n`;
    cart.forEach((item) => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      message += `- ${item.quantity}x ${item.name}: R$ ${itemTotal.replace(
        '.',
        ','
      )}\n`;
    });

    message += `\n*Total do Pedido: R$ ${total.replace('.', ',')}*\n\n`;
    message += `*Dados para Entrega:*\n`;
    message += `Nome: ${checkoutData.name}\n`;
    message += `Endereço: ${checkoutData.address}\n`;
    message += `Forma de Pagamento: ${checkoutData.paymentMethod}\n\n`;
    message += `Aguardando confirmação do pedido.`;

    const whatsappUrl = `https://wa.me/${marketPhoneNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, '_blank');

    clearCart();
    setView('products');
  };

  const value: AppContextType = {
    products,
    cart,
    isAuthenticated,
    isCartOpen,
    view,
    loadingProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    login,
    logout,
    toggleCart,
    setView,
    sendOrder,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
