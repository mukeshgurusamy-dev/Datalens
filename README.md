<div align="center">
  <img src="public/datalens-logo.svg" width="64" height="64" alt="DataLens Logo" />
  <h1>DataLens</h1>
  <h3><strong>Private. Instant. Zero-Server.</strong></h3>
  <p>
    <strong>Free • Fast • Secure • 100% Client-Side Analytics Engine</strong>
  </p>
  <p>
    <a href="https://mukeshgurusamy-dev.github.io/Datalens/"><strong>Live App →</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Zero_Server-100%25_Client--Side-10b981?style=flat-square" alt="Zero Server" />
    <img src="https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-7.0-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 7" />
    <img src="https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/Vitest-120_Tests_Passing-729b1b?style=flat-square&logo=vitest&logoColor=white" alt="120 Tests Passing" />
  </p>
</div>

---

## Why DataLens? (What It Solves & How)

Traditional BI platforms (Tableau, Power BI, Looker) require cloud databases, paid seats, backend ETL pipelines, and uploading sensitive spreadsheets to external servers.

**DataLens solves this with a zero-server, browser-native analytics engine.** Your data never leaves your device — parsing, schema profiling, SQL queries, forecasting, correlation math, and PDF/Excel generation all execute locally inside your browser at 60 FPS.

| Challenge | Traditional Cloud BI | DataLens (Zero-Server Engine) |
| :--- | :--- | :--- |
| **Data Privacy** | Files uploaded to third-party cloud servers | **100% local in-browser memory** — zero server uploads |
| **Cost & Setup** | Paid licenses, DB provisioning, login walls | **Completely free**, instant open-and-drop in any browser |
| **Speed & Latency** | Network round-trips on every filter click | **Sub-millisecond local compute** + Web Worker offloading |
| **Ad-Hoc Analysis** | Separate tools for SQL, formulas, and charts | **Unified studio**: Charts, SQL, Formulas, What-If & Exports |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 USER BROWSER RUNTIME                                     │
│                                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────┐  │
│  │   DATA INGESTION    │    │    IN-MEMORY ENGINE     │    │    REACT 19 CANVAS       │  │
│  │ • CSV / TSV / TXT   ├───►│ • Type & Date Profiler  ├───►│ • Area-First Charts      │  │
│  │ • Excel (.xlsx)     │    │ • AST SQL Studio        │    │ • 60 FPS Virtual Grid    │  │
│  │ • JSON & Clipboard  │    │ • Safe Formula AST      │    │ • Cross-Filter & Brush   │  │
│  │ • HTTPS / GSheets   │    │ • Holt +7D Forecast     │    │ • CFO / COO / CMO Lenses │  │
│  └─────────────────────┘    └────────────┬────────────┘    └─────────────┬────────────┘  │
│                                          │                               │               │
│                                          ▼                               ▼               │
│                             ┌─────────────────────────┐    ┌──────────────────────────┐  │
│                             │  BACKGROUND WEB WORKER  │    │   EXECUTIVE EXPORT HUB   │  │
│                             │ • N×N Pearson Matrix    │    │ • A4/Letter PDF Dossier  │  │
│                             │ • 0ms UI Thread Block   │    │ • Multi-Sheet .xlsx      │  │
│                             │ • Race-Safe Cancels     │    │ • RFC-4180 CSV & 2x PNG  │  │
│                             └─────────────────────────┘    └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Universal Client-Side Ingestion
* **Multi-Format Dropzone:** Drag and drop `.csv`, `.tsv`, `.txt`, `.xlsx`, or `.json` files directly into browser memory (up to 50 MB).
* **Instant Clipboard Paste:** Press <kbd>Ctrl</kbd>+<kbd>V</kbd> anywhere on the landing screen to analyze tables copied from Excel or Google Sheets.
* **Remote HTTPS / Google Sheets Fetch:** Load public CSV URLs or Google Sheets links directly from the browser with SSRF and payload-size protections.
* **Built-In Sample Datasets:** Explore immediately with **SaaS Revenue Metrics**, **Retail E-Commerce Orders**, or **People & HR Analytics**.

### 2. Automatic Schema Profiling & Area-First Visualizations
* **Smart Type Inference:** Automatically classifies `date` (including ISO-8601 timestamps), `number` (currencies, percentages, accounting negatives), `category`, `boolean`, `id`, and `text`.
* **Area Trend Always First:** Guarantees an **Area Trend** visualization appears first for every dataset — aggregated by day when dates exist, or via sequential record progression when no date column is present.
* **LTTB Downsampling:** Uses Largest-Triangle-Three-Buckets (`lttbDownsample`) to preserve visual peaks and valleys across large datasets without DOM bloat.
* **Scroll-Triggered Animations & Customizer:** Charts animate smoothly as you scroll them into view, and every card can be customized (type, X-axis, Y-axis) via the slide-over Chart Customizer.

### 3. Coordinated Cross-Filtering & Timeline Brush
* **Responsive Filter Bar:** Multi-select category filters with live search, row counts, and a viewport-safe bottom-sheet menu on mobile devices.
* **Click-to-Filter Charts:** Click any Bar or Donut slice to cross-filter every KPI card, chart, and table row simultaneously.
* **Interactive Timeline Brush:** Dual-handle SVG sparkline brush with drag-zoom and 1-click presets (`7D`, `30D`, `90D`, `YTD`, `All`).

### 4. Forecasting, Outliers & Executive Lenses
* **Holt-Winters 7-Day Forecast:** Toggle **Forecast +7D** on Area Trend charts to project a 7-day trend line with animated 95% confidence bands.
* **Executive Personas:** Switch between **CFO** (Chief Financial Officer), **COO** (Chief Operating Officer), and **CMO** (Chief Marketing Officer) lenses to tailor KPIs to financial exposure, operational SLA & Tukey's Fences outliers, or merchant/category growth.

### 5. In-Browser SQL Studio & Safe Formula Studio
* **Pure TypeScript AST SQL Engine:** Run `SELECT`, `WHERE` (`=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`, `IN`), `GROUP BY`, `ORDER BY`, `LIMIT`, and aggregates (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`) in under 1 ms — and inject query results directly as dashboard charts.
* **No-`eval` Formula Studio:** Create calculated columns using a recursive-descent AST evaluator supporting arithmetic, comparisons, `[Column]` references, and functions (`ABS`, `ROUND`, `CEIL`, `FLOOR`, `SQRT`, `LOG`, `MIN`, `MAX`, `IF`, `LEN`, `UPPER`, `LOWER`, `CONCAT`), paired with `useDeferredValue` for lag-free previews.

### 6. Modeling & Matrix Tab
* **What-If Sensitivity Simulator:** `useReducer`-driven multi-slider simulator projecting compound business lift and category-level deltas.
* **Background Web Worker Correlation Matrix:** Computes full $N \times N$ Pearson correlation matrices off the main thread (`useWorkerCompute`) with automatic race-condition cancellation.

### 7. 60 FPS Virtualized Raw Records Explorer
* **Custom Windowing Hook (`useVirtualGrid`):** Renders only visible viewport rows (`~15–20` DOM nodes) for smooth scrolling across tens of thousands of records, with toggleable Paginated view and deferred instant search.

### 8. Export Hub, Permalink Sharing, Time-Travel & Telemetry
* **Flexible Executive Export:** Download customized **PDF dossiers** (A4/Letter, Landscape/Portrait, Dark/Light theme), **multi-sheet `.xlsx` workbooks**, **RFC-4180 CSV** (with UTF-8 BOM & formula-injection neutralization), **2x Retina PNG**, or **Markdown summaries**.
* **Zero-Backend Permalink Sharing:** Encode dashboard state, filters, and custom charts into a compact URL hash (`#share=...`).
* **Time-Travel History & Live Profiler HUD:** Undo/redo dashboard states (<kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd>) and inspect real-time render commit timings in both development and production.

---

## Security & Privacy Hardening

* **Zero Network Data Transmission:** Uploaded files are parsed and analyzed exclusively in client-side memory.
* **Prototype Pollution Defense (`CWE-1321`):** Strips `__proto__`, `constructor`, and `prototype` keys across JSON/CSV/clipboard ingestion while preserving `Date` values.
* **Spreadsheet Formula Injection Guard (`CWE-1236`):** Neutralizes dangerous leading characters (`=`, `+`, `-`, `@`, `\t`, `\r`) on CSV/Excel exports while keeping valid negative numbers intact.
* **SSRF & Resource Cap (`CWE-918`):** Enforces `https://`-only remote CSV fetches, blocks localhost/private IP ranges, and caps file/clipboard/fetch sizes with request timeouts.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **UI & Concurrency** | React `19.3` (`useTransition`, `useDeferredValue`, `useSyncExternalStore`) |
| **Language & Build** | TypeScript `7.0`, Vite `8.3` (manual vendor chunk splitting & lazy routes) |
| **Styling & Motion** | Tailwind CSS `v4`, Motion `14.14`, Lucide Icons |
| **Visualizations** | Recharts `3.11` + custom LTTB downsampling & Holt forecasting |
| **Parsing & Export** | PapaParse `5.7`, `read-excel-file`, `write-excel-file`, `jspdf`, `html-to-image` |
| **Testing & Linting** | Vitest `5.1` (`120` tests across `19` suites), `oxlint` |

---

## Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/mukeshgurusamy-dev/Datalens.git
cd Datalens

# 2. Install dependencies
npm install

# 3. Start local dev server
npm run dev

# 4. Run type-check, test suite, and production build
npm test
npm run build
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste spreadsheet data from Excel or Google Sheets |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo (Time-Travel History) |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo (Time-Travel History) |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Run query in SQL Studio |
| <kbd>?</kbd> | Open Keyboard Shortcuts |
| <kbd>Esc</kbd> | Close active modal or drawer |

---

## License

MIT License — free for personal and commercial use.
