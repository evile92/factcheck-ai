<p align="center">
  <img src="./public/logo.png" alt="FactCheck Desk Logo" width="240" />
</p>

# FactCheck Desk (FactCheck AI) 🔍

> **Production-grade multimodal fact-checking & news verification platform with real-time cross-lingual evidence retrieval and zero-hallucination guarantee.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://factcheck-desk.netlify.app)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-25%20Passed-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

🌐 **Live Website:** [https://factcheck-desk.netlify.app](https://factcheck-desk.netlify.app)

---

## 🌟 Overview

**FactCheck Desk** is an investigative-grade web application engineered to verify breaking news, rumors, social posts, articles, photos, and video clips across international and local media.

Adhering to a strict **Evidence-First** doctrine, the platform **never invents or hallucinates any source, quotation, or link**. Instead, it queries primary archives, accredited fact-checkers, encyclopedias, and global wire feeds, evaluating every retrieved record through a **5-Tier Reliability Engine** to deliver an objective verdict with a verifiable confidence index and outbound citations.

---

## ⚡ Key Capabilities

### 1. Multimodal Content Ingestion
- **Text & Claims:** Extracts discrete assertions and categorizes them across 15 domains (Political, Medical, Scientific, Disaster, Economic, Satire, etc.).
- **Articles & Web URLs:** Crawls and parses target articles with robust SSRF protection blocking private IPs, loopback, and metadata endpoints.
- **Social Media Links:** Inspects YouTube, X (Twitter), Facebook, and Instagram via structured OpenGraph metadata.
- **Images & Screenshots:** Multilingual Optical Character Recognition (OCR), EXIF camera metadata extraction, and digital manipulation / AI-generation likelihood indicators with objective disclaimers.
- **Videos:** Keyframe scene sampling timeline (`00:00`, `00:05`, `00:10`...), frame OCR, and audio transcript inspection.
- **1-Click Clipboard:** Instantly reads and ingests text, URLs, or images directly from system clipboard with zero manual formatting.

### 2. Concurrent Bilingual & Cross-Lingual Retrieval
- **Dual-Language Search:** Searches **both Arabic and English sources simultaneously** regardless of input language:
  - If a claim is in **Arabic**, it queries Arabic news outlets while concurrently translating entities to query global English wire services (Reuters, AP, BBC, Snopes, PolitiFact).
  - If a claim is in **English**, it queries global wires while concurrently searching Arabic archives and news desks.
- **Smart Translation & Fallback Dictionary:** Built-in translation pipeline backed by an extensive journalistic domain dictionary for high-speed offline resilience.

### 3. Multi-Provider Architecture (Zero Required API Keys)
- **Google Fact Check Tools API:** Matches claims with accredited global fact-checkers adhering to the `ClaimReview` schema.
- **Wikipedia / Wikimedia REST API:** Queries official encyclopedic articles, biographical data, and historical milestones.
- **GDELT Project Global Database:** Connects to the world's largest open real-time archive of global media and events.
- **Google News Live RSS:** Streams real-time multilingual news coverage across world regions.
- **DuckDuckGo Instant Knowledge API:** Retrieves validated knowledge graph summaries and entities.
- **CrossRef Scholarly Registry:** Verifies medical and scientific assertions against peer-reviewed DOI research publications.

### 4. Objective Verdict Categories
- 🟢 **TRUE** — Verifiably confirmed by corroborating primary sources and global wires.
- 🔴 **FALSE** — Conclusively debunked or refuted by credible documentation.
- 🟠 **MISLEADING** — Out of context, distorted caption, or recycled historical event.
- 🟡 **PARTLY TRUE** — Contains factual elements mixed with inaccuracies or exaggerations.
- ⚪ **UNVERIFIED** — Insufficient independent documentation to rule decisively without guessing.

### 5. Advanced Editorial & Forensic Tools
- **Context Recycling & First-Seen Detection:** Identifies genuine old footage (e.g. from 2019) recirculated as breaking news.
- **Contradiction Alert:** Highlights conflicting coverage between outlets with side-by-side comparative analysis.
- **Cross-Source Comparison ("Compare Two Accounts"):** Contrasts two opposing reports to isolate points of agreement, divergence, and evidence weight.
- **Dossier Sharing & 1-Click Copy:** Generates structured fact-check briefing text and visual cards ready for distribution.
- **Provider Health Monitor:** Live latency, uptime, and cache metrics for all integrated databases.

---

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions, Dynamic Streaming SSE)
- **Runtime & UI:** React 19, TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with custom editorial themes & Dark/Light mode
- **Forensics & Extraction:** Cheerio, WebAssembly Tesseract OCR, EXIF Parser
- **Testing:** [Vitest](https://vitest.dev/) (25 unit and integration tests passing)
- **Deployment:** [Netlify](https://factcheck-desk.netlify.app) (Serverless & Edge functions)

---

## 🚀 Quick Start & Local Development

### Prerequisites
- Node.js 18.x or newer
- npm or pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/evile92/factcheck-ai.git
cd factcheck-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
# Run the automated test suite (25 tests)
npm test
```

### Production Build

```bash
# Compile and build optimized production bundle
npm run build
```

---

## 🌐 Live Deployment

The application is deployed and running live on **Netlify**:
👉 **[https://factcheck-desk.netlify.app](https://factcheck-desk.netlify.app)**

---

## 📄 License & Standards

Independent and open editorial verification initiative. Adheres to international journalistic standards for evidence verification, source transparency, and anti-hallucination protocols.
