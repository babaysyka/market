"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

export type CartLine = { productId: string; quantity: number };
export type StoreUser = {
  userId?: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  role?: "customer" | "admin";
  telegramId?: string;
};

type StoreContextValue = {
  cart: CartLine[];
  favorites: string[];
  compareIds: string[];
  user: StoreUser | null;
  cartCount: number;
  addToCart: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  toggleCompare: (productId: string) => boolean;
  setAuthenticatedUser: (user: StoreUser) => void;
  signOut: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const CART_KEY = "electromarket-cart";
const FAVORITES_KEY = "electromarket-favorites";
const COMPARE_KEY = "electromarket-compare";
const USER_KEY = "electromarket-user";
const STORE_EVENT = "electromarket-store-change";
export const COMPARE_LIMIT = 4;

function isTrustedGoogleAvatarUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "googleusercontent.com" || host.endsWith(".googleusercontent.com"));
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORE_EVENT, callback);
  };
}

function readSnapshot(key: string) {
  try {
    return typeof window === "undefined" ? "[]" : window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseCart(snapshot: string): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((line): CartLine[] => {
      if (typeof line?.productId !== "string" || !Number.isInteger(line?.quantity) || line.quantity < 1) return [];
      return [{ productId: line.productId, quantity: Math.min(9, line.quantity) }];
    });
  } catch {
    return [];
  }
}

function parseFavorites(snapshot: string) {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseIds(snapshot: string) {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) ? Array.from(new Set(parsed.filter((item): item is string => typeof item === "string"))).slice(0, COMPARE_LIMIT) : [];
  } catch {
    return [];
  }
}

function parseUser(snapshot: string): StoreUser | null {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!parsed || typeof parsed !== "object") return null;
    const user = parsed as Partial<StoreUser>;
    return typeof user.name === "string" && typeof user.email === "string"
      ? {
          ...(typeof user.userId === "string" ? { userId: user.userId } : {}),
          name: user.name,
          email: user.email,
          phone: typeof user.phone === "string" ? user.phone : null,
          avatarKey: typeof user.avatarKey === "string" ? user.avatarKey : null,
          ...(isTrustedGoogleAvatarUrl(user.avatarUrl) ? { avatarUrl: user.avatarUrl } : {}),
          role: user.role === "admin" ? "admin" : "customer",
          ...(typeof user.telegramId === "string" ? { telegramId: user.telegramId } : {}),
        }
      : null;
  } catch {
    return null;
  }
}

function writeSnapshot(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(STORE_EVENT));
  } catch {
    // Private browsing or a disabled storage area can prevent local preferences from persisting.
  }
}

async function syncCartWithServer(user: StoreUser, items: CartLine[], merge = false): Promise<CartLine[] | null> {
  try {
    const response = await fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        name: user.name,
        items,
        merge,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { items?: CartLine[] };
    return Array.isArray(data.items)
      ? data.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const cartSnapshot = useSyncExternalStore(subscribe, () => readSnapshot(CART_KEY), () => "[]");
  const favoriteSnapshot = useSyncExternalStore(subscribe, () => readSnapshot(FAVORITES_KEY), () => "[]");
  const compareSnapshot = useSyncExternalStore(subscribe, () => readSnapshot(COMPARE_KEY), () => "[]");
  const userSnapshot = useSyncExternalStore(subscribe, () => readSnapshot(USER_KEY), () => "null");
  const cart = useMemo(() => parseCart(cartSnapshot), [cartSnapshot]);
  const favorites = useMemo(() => parseFavorites(favoriteSnapshot), [favoriteSnapshot]);
  const compareIds = useMemo(() => parseIds(compareSnapshot), [compareSnapshot]);
  const user = useMemo(() => parseUser(userSnapshot), [userSnapshot]);
  const syncedEmailRef = useRef<string | null>(null);
  const sessionCheckedRef = useRef(false);

  useEffect(() => {
    if (sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;

    void fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: StoreUser | null } | null) => {
        if (data?.user?.email && data.user.name) {
          const currentUser = parseUser(readSnapshot(USER_KEY));
          const avatarUrl = data.user.avatarUrl ?? (
            currentUser?.email === data.user.email ? currentUser.avatarUrl : undefined
          );
          writeSnapshot(USER_KEY, { ...data.user, ...(avatarUrl ? { avatarUrl } : {}) });
        }
      })
      .catch(() => {
        // Ignore offline state during initial hydration.
      });
  }, []);

  useEffect(() => {
    if (!user?.email) {
      syncedEmailRef.current = null;
      return;
    }
    if (syncedEmailRef.current === user.email) return;
    syncedEmailRef.current = user.email;

    const currentLocal = parseCart(readSnapshot(CART_KEY));
    void syncCartWithServer(user, currentLocal, true).then((merged) => {
      if (merged) {
        writeSnapshot(CART_KEY, merged);
      }
    });
  }, [user]);

  const value = useMemo<StoreContextValue>(() => ({
    cart,
    favorites,
    compareIds,
    user,
    cartCount: cart.reduce((total, line) => total + line.quantity, 0),
    addToCart(productId, quantity = 1) {
      const current = parseCart(readSnapshot(CART_KEY));
      const line = current.find((item) => item.productId === productId);
      const next = line
        ? current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(9, item.quantity + quantity) } : item)
        : [...current, { productId, quantity: Math.min(9, quantity) }];
      writeSnapshot(CART_KEY, next);
      if (user) void syncCartWithServer(user, next, false);
    },
    setQuantity(productId, quantity) {
      const current = parseCart(readSnapshot(CART_KEY));
      const next = quantity < 1
        ? current.filter((item) => item.productId !== productId)
        : current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(9, quantity) } : item);
      writeSnapshot(CART_KEY, next);
      if (user) void syncCartWithServer(user, next, false);
    },
    removeFromCart(productId) {
      const next = parseCart(readSnapshot(CART_KEY)).filter((item) => item.productId !== productId);
      writeSnapshot(CART_KEY, next);
      if (user) void syncCartWithServer(user, next, false);
    },
    clearCart() {
      writeSnapshot(CART_KEY, []);
      if (user) void syncCartWithServer(user, [], false);
    },
    toggleFavorite(productId) {
      const current = parseFavorites(readSnapshot(FAVORITES_KEY));
      writeSnapshot(FAVORITES_KEY, current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
    },
    toggleCompare(productId) {
      const current = parseIds(readSnapshot(COMPARE_KEY));
      if (current.includes(productId)) {
        writeSnapshot(COMPARE_KEY, current.filter((id) => id !== productId));
        return true;
      }
      if (current.length >= COMPARE_LIMIT) return false;
      writeSnapshot(COMPARE_KEY, [...current, productId]);
      return true;
    },
    setAuthenticatedUser(nextUser) {
      syncedEmailRef.current = null;
      const currentUser = parseUser(readSnapshot(USER_KEY));
      const avatarUrl = nextUser.avatarUrl ?? (
        currentUser?.email === nextUser.email ? currentUser.avatarUrl : undefined
      );
      writeSnapshot(USER_KEY, { ...nextUser, ...(avatarUrl ? { avatarUrl } : {}) });
    },
    signOut() {
      try {
        syncedEmailRef.current = null;
        window.localStorage.removeItem(USER_KEY);
        window.dispatchEvent(new Event(STORE_EVENT));
        void fetch("/api/auth/session", { method: "DELETE" });
      } catch {
        // Private browsing or a disabled storage area can prevent local preferences from persisting.
      }
    },
  }), [cart, compareIds, favorites, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore должен использоваться внутри StoreProvider");
  return context;
}
