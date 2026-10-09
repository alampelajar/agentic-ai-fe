// ============================================================
// FREE AI MODELS DIRECTORY — TYPE DEFINITIONS
// ============================================================
// Halaman /apps adalah katalog website yang menyediakan
// akses model AI gratis / free tier.
//
// BUKAN halaman connection/provider integration.
// TIDAK ADA: connect, disconnect, API key input, status conn.
// ============================================================

// ------------------------------------------------------------
// KATEGORI UNTUK FILTER
// ------------------------------------------------------------

export type FreeModelCategory =
  | "all"
  | "chat"
  | "coding"
  | "image"
  | "multimodal"
  | "open-source"
  | "api"
  | "cli";

// ------------------------------------------------------------
// TIPE FREE ACCESS
// ------------------------------------------------------------

export type FreeAccessType =
  | "free"           // Gratis tanpa registrasi/batasan signifikan
  | "free-tier"      // Quota gratis dengan batasan
  | "open-source"    // Model/tools open-source
  | "community-free" // Gratis via komunitas
  | "limited-free";  // Trial / akses terbatas gratis

// ------------------------------------------------------------
// FREE MODEL SOURCE
// ------------------------------------------------------------
// Satu item di direktori = satu website / platform
// yang menyediakan akses AI gratis.
// ------------------------------------------------------------

export type FreeModelSource = {
  /** Unique identifier */
  id: string;

  /** Nama website / platform */
  name: string;

  /** Deskripsi singkat apa yang ditawarkan (max ~2 kalimat) */
  description: string;

  /** URL website resmi — valid, dibuka di tab baru */
  websiteUrl: string;

  /** Inisial untuk avatar placeholder (1–2 huruf) */
  iconInitials: string;

  /** Warna aksen untuk avatar */
  accentColor:
    | "violet"
    | "sky"
    | "emerald"
    | "amber"
    | "rose"
    | "blue"
    | "teal"
    | "orange"
    | "slate";

  /** Kategori yang relevan dengan item ini */
  categories: Exclude<FreeModelCategory, "all">[];

  /** Bentuk akses gratis yang disediakan */
  freeAccessType: FreeAccessType;

  /**
   * Deskripsi singkat bentuk gratisnya (satu kalimat).
   * Jangan klaim "100% gratis" tanpa dasar.
   */
  freeDescription: string;

  /**
   * Contoh model yang tersedia (opsional, max 4 item).
   * User buka website untuk detail lengkap.
   */
  models?: string[];

  /** Ringkasan jumlah model, contoh: "50+ free models" */
  modelCount?: string;

  /** Data sudah dikonfirmasi akurat */
  verified: boolean;
};


// ---------------------------------------------------------------------------
// Legacy model-hub component types
// These are still imported by reusable model-hub components in this folder.
// The current /apps route uses FreeModelSource above.
// ---------------------------------------------------------------------------

export type AIModelCategory = "free" | "free-tier";
export type AIProviderCategory = AIModelCategory | "api-key";
export type AIFilterType = "all" | "free" | "free-tier" | "api" | "connected";
export type AIProviderStatus = "connected" | "available" | "unavailable";

export type AIModel = {
  id: string;
  name: string;
  providerId: string;
  description: string;
  category: AIModelCategory;
  contextWindow?: number;
  capabilities?: string[];
  requiresApiKey?: boolean;
  modelId?: string;
};

export type AIProvider = {
  id: string;
  name: string;
  description: string;
  website: string;
  category: AIProviderCategory;
  authType?: "none" | "api-key" | "oauth";
  status: AIProviderStatus;
  iconInitials: string;
  accentColor: string;
  models: AIModel[];
};
