// ============================================================
// AI MODEL HUB — SERVICE ABSTRACTION
// ============================================================
// Layer ini memisahkan logika data-fetching dari komponen UI.
// Saat ini semua fungsi menggunakan mock data lokal.
//
// Untuk menghubungkan ke backend API nanti, cukup ganti
// implementasi di sini tanpa mengubah komponen UI sama sekali.
//
// Endpoint yang direncanakan:
//   GET    /api/ai/providers            → getProviders()
//   GET    /api/ai/models               → getModels()
//   POST   /api/ai/providers/:id/connect → connectProvider()
//   DELETE /api/ai/providers/:id/connect → disconnectProvider()
//   POST   /api/ai/models/:id/select    → selectModel()
//   GET    /api/ai/models/active        → getActiveModel()
// ============================================================

import { AI_PROVIDERS } from "../data/providers";
import type { AIModel, AIProvider } from "../types";

// Simulasi network delay untuk UX yang lebih realistis
const MOCK_DELAY_MS = 300;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ============================================================
// GET PROVIDERS
// ============================================================

/**
 * Mengambil semua provider AI yang tersedia.
 *
 * Backend: GET /api/ai/providers
 */
export async function getProviders(): Promise<AIProvider[]> {
  // TODO: ganti dengan API call ke backend
  // const res = await fetch('/api/ai/providers', {
  //   headers: { Authorization: `Bearer ${token}` },
  // });
  // if (!res.ok) throw new Error('Failed to fetch providers');
  // return res.json() as Promise<AIProvider[]>;

  await delay(MOCK_DELAY_MS);
  return [...AI_PROVIDERS];
}

// ============================================================
// GET MODELS
// ============================================================

/**
 * Mengambil semua model AI dari semua provider.
 *
 * Backend: GET /api/ai/models
 */
export async function getModels(): Promise<AIModel[]> {
  // TODO: ganti dengan API call ke backend
  // const res = await fetch('/api/ai/models', {
  //   headers: { Authorization: `Bearer ${token}` },
  // });
  // if (!res.ok) throw new Error('Failed to fetch models');
  // return res.json() as Promise<AIModel[]>;

  await delay(MOCK_DELAY_MS);
  return AI_PROVIDERS.flatMap((p) => p.models);
}

// ============================================================
// CONNECT PROVIDER
// ============================================================

/**
 * Menghubungkan provider AI (contoh: simpan API key ke backend).
 *
 * Backend: POST /api/ai/providers/:id/connect
 */
export async function connectProvider(
  providerId: string,
  _apiKey?: string
): Promise<{ success: boolean; message: string }> {
  // TODO: ganti dengan API call ke backend
  // const res = await fetch(`/api/ai/providers/${providerId}/connect`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${token}`,
  //   },
  //   body: JSON.stringify({ api_key: apiKey }),
  // });
  // if (!res.ok) throw new Error('Failed to connect provider');
  // return res.json();

  await delay(MOCK_DELAY_MS * 2);

  // Mock: selalu berhasil
  console.info(`[aiModelService] connectProvider mock: ${providerId}`);

  return { success: true, message: "Provider berhasil dihubungkan." };
}

// ============================================================
// DISCONNECT PROVIDER
// ============================================================

/**
 * Memutus koneksi provider AI.
 *
 * Backend: DELETE /api/ai/providers/:id/connect
 */
export async function disconnectProvider(
  providerId: string
): Promise<{ success: boolean }> {
  // TODO: ganti dengan API call ke backend
  // const res = await fetch(`/api/ai/providers/${providerId}/connect`, {
  //   method: 'DELETE',
  //   headers: { Authorization: `Bearer ${token}` },
  // });
  // if (!res.ok) throw new Error('Failed to disconnect provider');
  // return res.json();

  await delay(MOCK_DELAY_MS);

  console.info(`[aiModelService] disconnectProvider mock: ${providerId}`);

  return { success: true };
}

// ============================================================
// SELECT MODEL (SET ACTIVE)
// ============================================================

/**
 * Memilih model AI sebagai model aktif untuk digunakan Agentic AI.
 *
 * Backend: POST /api/ai/models/:id/select
 */
export async function selectModel(
  modelId: string
): Promise<{ success: boolean }> {
  // TODO: ganti dengan API call ke backend
  // const res = await fetch(`/api/ai/models/${modelId}/select`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${token}` },
  // });
  // if (!res.ok) throw new Error('Failed to select model');
  // return res.json();

  await delay(MOCK_DELAY_MS);

  console.info(`[aiModelService] selectModel mock: ${modelId}`);

  return { success: true };
}

// ============================================================
// GET ACTIVE MODEL
// ============================================================

/**
 * Mengambil model yang sedang aktif.
 * Untuk sementara mengembalikan null (state dikelola di store).
 *
 * Backend: GET /api/ai/models/active
 */
export async function getActiveModel(): Promise<AIModel | null> {
  // TODO: ganti dengan API call ke backend
  // const res = await fetch('/api/ai/models/active', {
  //   headers: { Authorization: `Bearer ${token}` },
  // });
  // if (res.status === 404) return null;
  // if (!res.ok) throw new Error('Failed to get active model');
  // return res.json() as Promise<AIModel | null>;

  await delay(MOCK_DELAY_MS);

  // State model aktif saat ini dikelola di ai-model-store.ts
  // dan di-persist ke localStorage.
  return null;
}
