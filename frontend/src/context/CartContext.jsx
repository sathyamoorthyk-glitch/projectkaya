import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

export function CartProvider({ children }) {
  const { addresses } = useAuth();
  const [items, setItems] = useState(() => read('kg_cart', []));
  const [deliveryState, setDeliveryState] = useState(() => localStorage.getItem('kg_state') || '');

  useEffect(() => localStorage.setItem('kg_cart', JSON.stringify(items)), [items]);
  useEffect(() => {
    if (deliveryState) localStorage.setItem('kg_state', deliveryState); else localStorage.removeItem('kg_state');
  }, [deliveryState]);
  // default the "delivering to" state from the customer's saved default address
  useEffect(() => {
    if (!deliveryState && addresses.length) setDeliveryState((addresses.find((a) => a.is_default) || addresses[0]).state_code);
  }, [addresses, deliveryState]);

  const value = useMemo(() => ({
    items, deliveryState, setDeliveryState,
    count: items.reduce((n, i) => n + i.qty, 0),
    add: (line, qty = 1) => setItems((prev) => {
      const cap = Math.min(Math.max(line.stock, 1), 50);
      const i = prev.findIndex((x) => x.id === line.id);
      if (i < 0) return [...prev, { ...line, qty: Math.min(qty, cap) }];
      const next = [...prev];
      next[i] = { ...next[i], ...line, qty: Math.min(next[i].qty + qty, cap) };
      return next;
    }),
    setQty: (id, qty) => setItems((p) => p.map((x) => (x.id === id ? { ...x, qty: Math.max(1, Math.min(qty, 50, Math.max(x.stock, 1))) } : x))),
    remove: (id) => setItems((p) => p.filter((x) => x.id !== id)),
    clear: () => setItems([]),
  }), [items, deliveryState]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
