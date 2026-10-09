// ============================================================
// AI MODEL HUB — MOCK SEED DATA
// ============================================================
// File ini berisi data mock awal untuk provider dan model AI.
// Ketika backend API tersedia, data ini akan digantikan oleh
// response dari aiModelService.ts tanpa perubahan pada UI.
//
// CATATAN: Status "free" / "free-tier" pada model ini adalah
// kondisi saat data ini dibuat dan dapat berubah sewaktu-waktu
// sesuai kebijakan masing-masing provider.
// ============================================================

import type { AIProvider } from "../types";

export const AI_PROVIDERS: AIProvider[] = [
  // ----------------------------------------------------------
  // KIRO AI
  // ----------------------------------------------------------
  {
    id: "kiro-ai",
    name: "Kiro AI",
    description:
      "Platform AI agentic dengan model Claude dan GLM yang tersedia secara gratis untuk pengguna Kiro.",
    website: "https://kiro.dev",
    category: "free",
    authType: "none",
    status: "connected",
    iconInitials: "KA",
    accentColor: "violet",
    models: [
      {
        id: "kiro-claude-sonnet",
        name: "Claude Sonnet",
        providerId: "kiro-ai",
        description:
          "Model Claude Sonnet dari Anthropic yang tersedia melalui Kiro AI. Unggul dalam coding, reasoning, dan analisis teks panjang.",
        category: "free",
        contextWindow: 200000,
        capabilities: ["Text", "Coding", "Reasoning", "Analysis"],
        requiresApiKey: false,
        modelId: "claude-sonnet-4-5",
      },
      {
        id: "kiro-glm",
        name: "GLM",
        providerId: "kiro-ai",
        description:
          "Model GLM dari Zhipu AI yang tersedia melalui Kiro AI. Cocok untuk tugas teks umum dan percakapan.",
        category: "free",
        contextWindow: 128000,
        capabilities: ["Text", "Conversation", "Summarization"],
        requiresApiKey: false,
        modelId: "glm-4",
      },
    ],
  },

  // ----------------------------------------------------------
  // OPENCODE
  // ----------------------------------------------------------
  {
    id: "opencode",
    name: "OpenCode",
    description:
      "Platform open-source untuk AI coding dengan berbagai model gratis yang dapat diakses tanpa API key.",
    website: "https://opencode.ai",
    category: "free",
    authType: "none",
    status: "available",
    iconInitials: "OC",
    accentColor: "sky",
    models: [
      {
        id: "opencode-free",
        name: "Free Models",
        providerId: "opencode",
        description:
          "Kumpulan model gratis yang tersedia di OpenCode, mencakup berbagai kemampuan coding dan teks.",
        category: "free",
        capabilities: ["Text", "Coding", "Completion"],
        requiresApiKey: false,
        modelId: "opencode/free",
      },
      {
        id: "opencode-kimi",
        name: "Kimi k2",
        providerId: "opencode",
        description:
          "Model Kimi k2 dari Moonshot AI yang tersedia gratis melalui OpenCode. Konteks panjang dan coding.",
        category: "free",
        contextWindow: 131072,
        capabilities: ["Text", "Coding", "Long Context"],
        requiresApiKey: false,
        modelId: "moonshotai/kimi-k2",
      },
    ],
  },

  // ----------------------------------------------------------
  // GOOGLE VERTEX AI
  // ----------------------------------------------------------
  {
    id: "google-vertex",
    name: "Google Vertex AI",
    description:
      "Platform AI Google yang menyediakan Gemini dan berbagai model lainnya dengan free tier yang generous.",
    website: "https://cloud.google.com/vertex-ai",
    category: "free-tier",
    authType: "api-key",
    status: "available",
    iconInitials: "GV",
    accentColor: "blue",
    models: [
      {
        id: "vertex-gemini-flash",
        name: "Gemini 2.5 Flash",
        providerId: "google-vertex",
        description:
          "Gemini 2.5 Flash adalah model Gemini tercepat dengan kemampuan multimodal. Free tier tersedia dengan quota harian.",
        category: "free-tier",
        contextWindow: 1048576,
        capabilities: ["Text", "Vision", "Coding", "Reasoning", "Multimodal"],
        requiresApiKey: true,
        modelId: "gemini-2.5-flash",
      },
      {
        id: "vertex-gemini-pro",
        name: "Gemini 2.5 Pro",
        providerId: "google-vertex",
        description:
          "Gemini 2.5 Pro adalah model paling capable dari Google dengan free tier terbatas.",
        category: "free-tier",
        contextWindow: 2097152,
        capabilities: ["Text", "Vision", "Coding", "Reasoning", "Analysis"],
        requiresApiKey: true,
        modelId: "gemini-2.5-pro",
      },
    ],
  },

  // ----------------------------------------------------------
  // GROQ
  // ----------------------------------------------------------
  {
    id: "groq",
    name: "Groq",
    description:
      "Inference platform ultra-cepat berbasis LPU dengan berbagai model open-source gratis melalui free tier.",
    website: "https://groq.com",
    category: "free-tier",
    authType: "api-key",
    status: "available",
    iconInitials: "GQ",
    accentColor: "orange",
    models: [
      {
        id: "groq-llama-scout",
        name: "Llama 4 Scout",
        providerId: "groq",
        description:
          "Meta Llama 4 Scout dengan inference ultra-cepat dari Groq. Free tier dengan rate limit harian.",
        category: "free-tier",
        contextWindow: 131072,
        capabilities: ["Text", "Coding", "Reasoning", "Fast Inference"],
        requiresApiKey: true,
        modelId: "meta-llama/llama-4-scout-17b-16e-instruct",
      },
      {
        id: "groq-llama-maverick",
        name: "Llama 4 Maverick",
        providerId: "groq",
        description:
          "Meta Llama 4 Maverick, model yang lebih besar dengan kemampuan lebih kuat melalui Groq.",
        category: "free-tier",
        contextWindow: 131072,
        capabilities: ["Text", "Coding", "Reasoning", "Analysis"],
        requiresApiKey: true,
        modelId: "meta-llama/llama-4-maverick-17b-128e-instruct",
      },
      {
        id: "groq-deepseek-r1",
        name: "DeepSeek R1",
        providerId: "groq",
        description:
          "DeepSeek R1 distill model dengan kemampuan reasoning kuat. Tersedia gratis melalui Groq.",
        category: "free-tier",
        contextWindow: 131072,
        capabilities: ["Reasoning", "Text", "Math", "Coding"],
        requiresApiKey: true,
        modelId: "deepseek-r1-distill-llama-70b",
      },
    ],
  },

  // ----------------------------------------------------------
  // OPENROUTER
  // ----------------------------------------------------------
  {
    id: "openrouter",
    name: "OpenRouter",
    description:
      "Gateway terpadu untuk ratusan model AI. Tersedia model-model gratis tanpa API key untuk model tertentu.",
    website: "https://openrouter.ai",
    category: "free",
    authType: "api-key",
    status: "available",
    iconInitials: "OR",
    accentColor: "emerald",
    models: [
      {
        id: "openrouter-free",
        name: "Free Models",
        providerId: "openrouter",
        description:
          "Kumpulan model gratis yang tersedia di OpenRouter (ditandai :free). Mencakup Llama, Mistral, Gemma, dan lainnya.",
        category: "free",
        capabilities: ["Text", "Coding", "Conversation"],
        requiresApiKey: false,
        modelId: "openrouter/auto:free",
      },
      {
        id: "openrouter-gemma3",
        name: "Gemma 3 27B",
        providerId: "openrouter",
        description:
          "Google Gemma 3 27B tersedia gratis melalui OpenRouter. Model open-source dengan kemampuan teks dan coding.",
        category: "free",
        contextWindow: 131072,
        capabilities: ["Text", "Coding", "Reasoning"],
        requiresApiKey: false,
        modelId: "google/gemma-3-27b-it:free",
      },
      {
        id: "openrouter-deepseek-r1-free",
        name: "DeepSeek R1 (Free)",
        providerId: "openrouter",
        description:
          "DeepSeek R1 tersedia gratis melalui OpenRouter dengan kemampuan reasoning tinggi.",
        category: "free",
        contextWindow: 163840,
        capabilities: ["Reasoning", "Text", "Math", "Coding"],
        requiresApiKey: false,
        modelId: "deepseek/deepseek-r1:free",
      },
    ],
  },
];
