// ============================================================
// AI MODEL HUB — ZUSTAND STORE
// ============================================================
// Mengelola state global untuk:
// - Model aktif yang dipilih user (di-persist ke localStorage)
// - Daftar provider yang sudah dihubungkan
// - Status loading operasi connect/select
//
// Pola mengikuti auth-store.ts yang sudah ada di project.
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIModel, AIProvider } from "../types";

// Key localStorage
const STORAGE_KEY = "agentic_ai_active_model";

// ============================================================
// STATE INTERFACE
// ============================================================

interface AIModelState {
  /** Model yang saat ini aktif dan digunakan Agentic AI */
  activeModel: AIModel | null;

  /** Provider yang saat ini aktif (mendukung activeModel) */
  activeProvider: AIProvider | null;

  /**
   * Set provider IDs yang sudah dihubungkan oleh user.
   * Disimpan sebagai array agar compatible dengan JSON.stringify.
   */
  connectedProviderIds: string[];

  /** Loading state untuk operasi async (connect/select) */
  isConnecting: boolean;

  /** ID provider yang sedang dalam proses connecting */
  connectingProviderId: string | null;
}

interface AIModelActions {
  /**
   * Set model aktif beserta providernya.
   * Dipersist ke localStorage secara otomatis.
   */
  setActiveModel: (model: AIModel | null, provider: AIProvider | null) => void;

  /**
   * Tandai provider sebagai "connected".
   * Dipanggil setelah connectProvider() service berhasil.
   */
  markProviderConnected: (providerId: string) => void;

  /**
   * Hapus status "connected" dari provider.
   * Dipanggil setelah disconnectProvider() service berhasil.
   */
  markProviderDisconnected: (providerId: string) => void;

  /** Cek apakah provider sudah dihubungkan */
  isProviderConnected: (providerId: string) => boolean;

  /** Set loading state untuk connect operation */
  setConnecting: (providerId: string | null) => void;

  /** Reset seluruh state (misal: saat sign out) */
  reset: () => void;
}

type AIModelStore = AIModelState & AIModelActions;

// ============================================================
// INITIAL STATE
// ============================================================

const initialState: AIModelState = {
  activeModel: null,
  activeProvider: null,
  connectedProviderIds: [],
  isConnecting: false,
  connectingProviderId: null,
};

// ============================================================
// STORE
// ============================================================

export const useAIModelStore = create<AIModelStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ----------------------------------------------------------
      // SET ACTIVE MODEL
      // ----------------------------------------------------------
      setActiveModel: (model, provider) => {
        set({
          activeModel: model,
          activeProvider: provider,
        });
      },

      // ----------------------------------------------------------
      // MARK PROVIDER CONNECTED
      // ----------------------------------------------------------
      markProviderConnected: (providerId) => {
        set((state) => {
          if (state.connectedProviderIds.includes(providerId)) {
            return state;
          }
          return {
            connectedProviderIds: [...state.connectedProviderIds, providerId],
          };
        });
      },

      // ----------------------------------------------------------
      // MARK PROVIDER DISCONNECTED
      // ----------------------------------------------------------
      markProviderDisconnected: (providerId) => {
        set((state) => ({
          connectedProviderIds: state.connectedProviderIds.filter(
            (id) => id !== providerId
          ),
          // Jika model aktif berasal dari provider ini, clear juga
          activeModel:
            state.activeModel?.providerId === providerId
              ? null
              : state.activeModel,
          activeProvider:
            state.activeProvider?.id === providerId
              ? null
              : state.activeProvider,
        }));
      },

      // ----------------------------------------------------------
      // IS PROVIDER CONNECTED
      // ----------------------------------------------------------
      isProviderConnected: (providerId) => {
        return get().connectedProviderIds.includes(providerId);
      },

      // ----------------------------------------------------------
      // SET CONNECTING
      // ----------------------------------------------------------
      setConnecting: (providerId) => {
        set({
          isConnecting: providerId !== null,
          connectingProviderId: providerId,
        });
      },

      // ----------------------------------------------------------
      // RESET
      // ----------------------------------------------------------
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEY,
      // Hanya persist data yang relevan, bukan loading state
      partialize: (state) => ({
        activeModel: state.activeModel,
        activeProvider: state.activeProvider,
        connectedProviderIds: state.connectedProviderIds,
      }),
    }
  )
);
