// ============================================================
// FREE AI MODELS DIRECTORY — DATA SOURCE
// ============================================================
// Daftar website dan platform yang menyediakan akses
// model AI secara gratis atau dengan free tier.
//
// Data ini bersifat kuratif dan perlu diperbarui secara
// berkala karena kebijakan free tier dapat berubah.
// ============================================================

import type { FreeModelSource } from "../types";

export const FREE_MODEL_SOURCES: FreeModelSource[] = [
  // ----------------------------------------------------------
  // OPENROUTER
  // ----------------------------------------------------------
  {
    id: "openrouter",
    name: "OpenRouter",
    description:
      "Unified gateway untuk ratusan model AI dari berbagai provider. Model bertanda :free tersedia tanpa biaya.",
    websiteUrl: "https://openrouter.ai",
    iconInitials: "OR",
    accentColor: "emerald",
    categories: ["api", "chat", "coding"],
    freeAccessType: "free",
    freeDescription: "50+ model gratis tersedia, tidak perlu kartu kredit untuk model :free.",
    models: [
      "DeepSeek R1 (free)",
      "Gemma 3 27B (free)",
      "Llama 3.1 8B (free)",
      "Mistral 7B (free)",
    ],
    modelCount: "50+ free models",
    verified: true,
  },

  // ----------------------------------------------------------
  // GROQ
  // ----------------------------------------------------------
  {
    id: "groq",
    name: "Groq",
    description:
      "Platform inferensi berbasis LPU dengan kecepatan luar biasa. Free tier untuk Llama, Gemma, DeepSeek, dan lainnya.",
    websiteUrl: "https://console.groq.com",
    iconInitials: "GQ",
    accentColor: "orange",
    categories: ["api", "chat", "coding"],
    freeAccessType: "free-tier",
    freeDescription: "Free tier dengan rate limit harian. Tidak perlu kartu kredit untuk mulai.",
    models: [
      "Llama 4 Scout",
      "Llama 4 Maverick",
      "DeepSeek R1 Distill",
      "Gemma 2 9B",
    ],
    modelCount: "10+ models",
    verified: true,
  },

  // ----------------------------------------------------------
  // GOOGLE AI STUDIO
  // ----------------------------------------------------------
  {
    id: "google-ai-studio",
    name: "Google AI Studio",
    description:
      "Platform developer Google untuk model Gemini. Free tier yang generous untuk prototyping dan pengembangan.",
    websiteUrl: "https://aistudio.google.com",
    iconInitials: "GA",
    accentColor: "blue",
    categories: ["api", "chat", "multimodal", "coding"],
    freeAccessType: "free-tier",
    freeDescription: "Free tier dengan rate limit. Gemini 2.5 Flash tersedia secara gratis.",
    models: ["Gemini 2.5 Flash", "Gemini 2.5 Pro", "Gemini 1.5 Flash"],
    modelCount: "Multiple Gemini models",
    verified: true,
  },

  // ----------------------------------------------------------
  // HUGGING FACE
  // ----------------------------------------------------------
  {
    id: "huggingface",
    name: "Hugging Face",
    description:
      "Hub model AI open-source terbesar. Inference API, Spaces, dan ribuan model tersedia secara gratis.",
    websiteUrl: "https://huggingface.co",
    iconInitials: "HF",
    accentColor: "amber",
    categories: ["api", "open-source", "chat", "image", "multimodal"],
    freeAccessType: "open-source",
    freeDescription: "Ribuan model open-source. Inference API free tier tersedia.",
    modelCount: "900k+ models",
    verified: true,
  },

  // ----------------------------------------------------------
  // OLLAMA
  // ----------------------------------------------------------
  {
    id: "ollama",
    name: "Ollama",
    description:
      "Jalankan large language models secara lokal di komputer sendiri. Setup mudah, tidak perlu API key, sepenuhnya gratis.",
    websiteUrl: "https://ollama.com",
    iconInitials: "OL",
    accentColor: "slate",
    categories: ["cli", "open-source", "coding", "chat"],
    freeAccessType: "open-source",
    freeDescription: "Sepenuhnya gratis, berjalan secara lokal. Tidak butuh internet setelah download model.",
    models: ["Llama 3.2", "Mistral", "Gemma 3", "DeepSeek R1"],
    modelCount: "100+ models",
    verified: true,
  },

  // ----------------------------------------------------------
  // MISTRAL AI
  // ----------------------------------------------------------
  {
    id: "mistral",
    name: "Mistral AI",
    description:
      "AI lab Eropa dengan model open-weight yang powerful. Free tier tersedia via La Plateforme API.",
    websiteUrl: "https://console.mistral.ai",
    iconInitials: "MI",
    accentColor: "violet",
    categories: ["api", "chat", "coding", "open-source"],
    freeAccessType: "free-tier",
    freeDescription: "Free tier di La Plateforme dengan rate limit. Model open-weight juga tersedia.",
    models: ["Mistral Small", "Mistral 7B", "Codestral"],
    verified: true,
  },

  // ----------------------------------------------------------
  // TOGETHER AI
  // ----------------------------------------------------------
  {
    id: "together-ai",
    name: "Together AI",
    description:
      "Serverless AI inference untuk model open-source. Free credits tersedia untuk model populer.",
    websiteUrl: "https://www.together.ai",
    iconInitials: "TA",
    accentColor: "teal",
    categories: ["api", "chat", "coding"],
    freeAccessType: "free-tier",
    freeDescription: "Free credits saat signup. Berbagai model open-source tersedia.",
    models: ["Llama 3.1 8B", "Mixtral 8x7B", "Gemma 2 9B"],
    verified: true,
  },

  // ----------------------------------------------------------
  // CLOUDFLARE WORKERS AI
  // ----------------------------------------------------------
  {
    id: "cloudflare-workers-ai",
    name: "Cloudflare Workers AI",
    description:
      "Inferensi AI di jaringan global Cloudflare. Free tier generous untuk developer.",
    websiteUrl: "https://developers.cloudflare.com/workers-ai",
    iconInitials: "CF",
    accentColor: "orange",
    categories: ["api", "chat", "coding", "image"],
    freeAccessType: "free-tier",
    freeDescription: "10.000 neurons gratis per hari. Tidak perlu kartu kredit.",
    models: ["Llama 3.1 8B", "Mistral 7B", "Gemma 7B"],
    verified: true,
  },

  // ----------------------------------------------------------
  // LM STUDIO
  // ----------------------------------------------------------
  {
    id: "lm-studio",
    name: "LM Studio",
    description:
      "Temukan, unduh, dan jalankan LLM lokal di komputer. Aplikasi desktop gratis untuk macOS, Windows, dan Linux.",
    websiteUrl: "https://lmstudio.ai",
    iconInitials: "LM",
    accentColor: "violet",
    categories: ["cli", "open-source", "chat", "coding"],
    freeAccessType: "open-source",
    freeDescription: "Aplikasi desktop gratis. Jalankan model lokal tanpa biaya API.",
    modelCount: "Ribuan via HuggingFace",
    verified: true,
  },

  // ----------------------------------------------------------
  // PERPLEXITY LABS
  // ----------------------------------------------------------
  {
    id: "perplexity-labs",
    name: "Perplexity Labs",
    description:
      "Model eksperimental dari Perplexity AI. Akses ke model research via antarmuka web gratis.",
    websiteUrl: "https://labs.perplexity.ai",
    iconInitials: "PX",
    accentColor: "sky",
    categories: ["chat", "api"],
    freeAccessType: "free",
    freeDescription: "Interface web gratis. Tidak perlu akun untuk penggunaan dasar.",
    models: ["Llama 3.1 8B", "Llama 3.1 70B", "Mistral 7B"],
    verified: true,
  },

  // ----------------------------------------------------------
  // DEEPSEEK
  // ----------------------------------------------------------
  {
    id: "deepseek",
    name: "DeepSeek",
    description:
      "Model reasoning performa tinggi dari DeepSeek. Free API tier dan model open-weight tersedia.",
    websiteUrl: "https://platform.deepseek.com",
    iconInitials: "DS",
    accentColor: "sky",
    categories: ["api", "chat", "coding"],
    freeAccessType: "free-tier",
    freeDescription: "Free API credits saat signup. DeepSeek R1 dan V3 tersedia.",
    models: ["DeepSeek R1", "DeepSeek V3", "DeepSeek Coder"],
    verified: true,
  },

  // ----------------------------------------------------------
  // CEREBRAS
  // ----------------------------------------------------------
  {
    id: "cerebras",
    name: "Cerebras",
    description:
      "Inferensi AI tercepat yang tersedia. Free tier dengan model Llama di kecepatan yang luar biasa.",
    websiteUrl: "https://cloud.cerebras.ai",
    iconInitials: "CB",
    accentColor: "rose",
    categories: ["api", "chat", "coding"],
    freeAccessType: "free-tier",
    freeDescription: "Free tier dengan rate limit. Inferensi sangat cepat.",
    models: ["Llama 3.1 8B", "Llama 3.1 70B", "Llama 3.3 70B"],
    verified: true,
  },

  // ----------------------------------------------------------
  // COHERE
  // ----------------------------------------------------------
  {
    id: "cohere",
    name: "Cohere",
    description:
      "Model NLP enterprise-grade dengan free trial tier. Command dan Embed models tersedia.",
    websiteUrl: "https://dashboard.cohere.com",
    iconInitials: "CO",
    accentColor: "violet",
    categories: ["api", "chat"],
    freeAccessType: "free-tier",
    freeDescription: "Free trial API key dengan rate limit untuk penggunaan personal/riset.",
    models: ["Command R", "Command R+", "Embed"],
    verified: true,
  },

  // ----------------------------------------------------------
  // GITHUB MODELS
  // ----------------------------------------------------------
  {
    id: "github-models",
    name: "GitHub Models",
    description:
      "Eksperimen dengan model AI langsung di GitHub. Akses model dari OpenAI, Mistral, Meta, dan lainnya secara gratis.",
    websiteUrl: "https://github.com/marketplace/models",
    iconInitials: "GH",
    accentColor: "slate",
    categories: ["api", "chat", "coding", "multimodal"],
    freeAccessType: "free-tier",
    freeDescription: "Free playground dan API access. Rate limit berlaku.",
    models: ["GPT-4o mini", "Phi-3", "Llama 3", "Mistral Small"],
    modelCount: "30+ models",
    verified: true,
  },

  // ----------------------------------------------------------
  // NVIDIA NIM
  // ----------------------------------------------------------
  {
    id: "nvidia-nim",
    name: "NVIDIA NIM",
    description:
      "Microservice inferensi AI dari NVIDIA. Free credits tersedia untuk developer yang ingin mencoba.",
    websiteUrl: "https://build.nvidia.com",
    iconInitials: "NV",
    accentColor: "emerald",
    categories: ["api", "chat", "coding", "multimodal"],
    freeAccessType: "free-tier",
    freeDescription: "Free credits saat signup untuk mencoba model yang di-host NVIDIA.",
    models: ["Llama 3.1 405B", "Mistral Large", "Nemotron"],
    verified: true,
  },

  // ----------------------------------------------------------
  // FIREWORKS AI
  // ----------------------------------------------------------
  {
    id: "fireworks-ai",
    name: "Fireworks AI",
    description:
      "Inferensi cepat dan murah untuk model open-source. Free tier tersedia untuk memulai.",
    websiteUrl: "https://fireworks.ai",
    iconInitials: "FW",
    accentColor: "amber",
    categories: ["api", "chat", "coding", "image"],
    freeAccessType: "free-tier",
    freeDescription: "Free credits saat signup. Inferensi cepat untuk Llama dan model lainnya.",
    models: ["Llama 3.1 8B", "Mixtral 8x7B", "FireLLaVA-13B"],
    verified: true,
  },
];
