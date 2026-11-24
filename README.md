# DataLens Engine 🔬📊
> **Zero-Server, Client-Side Business Intelligence & Analytics Engine**  
> *Powered by React 19, TypeScript, Tailwind CSS, Motion, Recharts, and Cloudflare Free-Tier Edge Infrastructure.*

---

## 🌟 Overview

**DataLens** is an advanced, privacy-first business intelligence engine running entirely in the browser. It ingests arbitrary tabular datasets (CSV, Excel, TSV, JSON, Google Sheets, or clipboard paste) and dynamically infers statistical schemas, renders interactive executive dashboards, generates deterministic AI insights, and provides boardroom-grade exports with **zero server cost**.

---

## 🚀 Key Architectural Capabilities

### 1. Universal Ingestion & Statistical Profiler
* **Multi-Format Ingestion:** Drag-and-drop support for `.csv`, `.xlsx`, `.xls`, `.json`, `.tsv`, `.txt`.
* **Zero-Click Google Sheets & URL Fetch:** Ingests live Google Sheets (converting sharing links to CSV export streams) and public raw data links.
* **Instant Clipboard Paste:** Press <kbd>Ctrl+V</kbd> anywhere on the screen to parse copied spreadsheet cells.
* **Dynamic Type Inference:** Automatically identifies numerical metrics, categorical dimensions, temporal date sequences, and unique reference keys without hardcoding.

### 2. Interactive Coordinated Multiple Views (CMV) & Cross-Filtering
* **Direct Chart Cross-Filtering:** Click any bar or donut slice to instantly isolate that segment across every chart, KPI card, and metric with spring physics.
* **Dynamic Filter Ribbon:** Searchable category dropdowns, multi-select OR/AND filtering, and one-click active tag removals.
* **Customizer Slide-Over:** Reconfigure chart archetypes (Bar, Area Trend, Donut Share, Scatter Plot), swap dimensions, and modify axes in real-time.

### 3. Dual-Brain AI Insights Layer
* **Executive AI Briefing Cards:** 4 structured takeaways updated reactively per filter state:
  1. *Dominant Driver*: Leading market share and financial concentration.
  2. *Distribution Profile*: Arithmetic mean, min, max, and dynamic range spread.
  3. *Temporal Velocity*: Peak activity intervals and chronological span.
  4. *Anomaly & Risk Alert*: Automated identification of elevated decline/failure rates.
* **Deterministic Natural Language Q&A:** Ask plain-English questions (*"What percentage was declined?"*, *"Total amount for Amazon"*, *"Compare settled vs declined"*) with **sub-millisecond execution and zero hallucinations**.
* **Edge Intelligence:** Optional Cloudflare Workers AI proxy (`@cf/meta/llama-3.1-8b-instruct`) for natural-language synthesis over anonymized statistical summaries.

### 4. Advanced Numerical Analytics & Predictive Forecasting (Hydrogen Model)
* **$O(N)$ LTTB Downsampling:** Largest-Triangle-Three-Buckets algorithm downsamples 10,000+ points to 80 display points in $<15\text{ms}$ while provably preserving peak topologies and 60 FPS responsiveness.
* **Holt’s Linear Trend Forecasting:** Double exponential smoothing with dynamic level ($\alpha$) and trend ($\beta$) equations, projecting 7-day trajectories with empirical **95% prediction confidence intervals**.
* **Tukey’s Fences Non-Parametric Outlier Detection:** Evaluates Interquartile Range ($IQR = Q_3 - Q_1$) to detect statistical outliers without normal-distribution assumptions.
* **Causal Root-Cause Attribution:** Evaluates conditional variance lift and concentration to explain *why* metric anomalies occur.
* **Multi-Persona Executive Lenses:** Toggle between **[ CFO Financial | COO Operations | CMO Growth ]** to dynamically restructure KPIs according to leadership priorities.

### 5. Boardroom Export Engine & Shareable Permalinks
* **High-Res Retina $2\times$ PNG:** Vectorized snapshot of the dashboard layout.
* **Multi-Page A4 Boardroom PDF:** Multi-page pagination respecting standard aspect-ratio margins.
* **Zero-Server Permalinks:** Compresses dataset schema, active filters, and custom charts into URL-safe base64 strings (`#share=...`) for instant client-side link sharing.
* **Cloudflare Edge Hub:** Includes Cloudflare D1 SQLite database schema and Worker proxy endpoints.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript 7, Vite 8, Tailwind CSS v4, Motion (spring physics)
* **Visualizations:** Recharts, Lucide React
* **Parsing & Geometry:** PapaParse, SheetJS (`xlsx`), `html-to-image`, `jspdf`
* **Test Suite:** Vitest v5.1.1 (47 automated tests with 100% pass rate)
* **Edge Backend:** Cloudflare Workers, Cloudflare D1 (SQLite), Cloudflare Workers AI

---

## 🧪 Testing & Verification

The engine is backed by an automated test suite verifying mathematical ground truth against both synthetic fixtures and real transaction datasets (12,000 rows):

```bash
# Run the complete automated test suite
npm test

# Run strict TypeScript and production build
npm run build
```

---

## 💻 Quickstart

```bash
# Clone the repository
git clone https://github.com/mukeshgurusamy-dev/Datalens.git
cd Datalens

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5174/` to start exploring data.
