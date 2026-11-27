<div align="center">
  <img src="public/datalens-logo.svg" width="64" height="64" alt="DataLens Logo" />
  <h1>DataLens</h1>
  <h3><strong>Free. Instant. Zero-Server.</strong></h3>
  <p>
    <strong>100% Client-Side Analytics &amp; BI Engine</strong>
  </p>
  <p>
    <a href="https://mukeshgurusamy-dev.github.io/Datalens/"><strong>Live App →</strong></a>
    &nbsp;•&nbsp;
    <a href="https://github.com/mukeshgurusamy-dev/Datalens/releases/download/v1/DataLens_Ad.mp4"><strong>Watch Demo Video →</strong></a>
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

## Demo

🎥 **[Watch the DataLens Demo Video (MP4)](https://github.com/mukeshgurusamy-dev/Datalens/releases/download/v1/DataLens_Ad.mp4)**

---

## Why DataLens? (What It Solves & How)

Traditional Business Intelligence tools (Tableau, Power BI, Looker) force teams to provision cloud databases, pay per-seat licenses, and upload sensitive spreadsheets across third-party servers.

**DataLens replaces that entire stack with a zero-server, browser-native analytics studio.** Every file parse, schema inference, SQL query, formula evaluation, time-range filter, forecast, correlation matrix, and PDF/Excel export runs **100% locally inside your browser** at 60 FPS — with zero backend, zero accounts, and zero data ever leaving your device.

| Challenge | Traditional Cloud BI | DataLens (Zero-Server Engine) |
| :--- | :--- | :--- |
| **Privacy & Compliance** | Uploads sensitive CSV/Excel files to remote servers | **Zero server transmission** — all data stays in browser memory |
| **Cost & Friction** | Paid seats, DB setup, login walls | **Completely free**, instant open-and-drop in any modern browser |
| **Interactivity Latency** | Network round-trips on every filter or slice | **Sub-millisecond local compute** + background Web Worker thread |
| **Fragmented Workflow** | Separate tools for SQL, formulas, forecasting, and decks | **All-in-one studio**: Charts, Time-Travel, SQL, Formulas, What-If & Exports |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 USER BROWSER RUNTIME                                     │
│                                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────┐  │
│  │   DATA INGESTION    │    │    IN-MEMORY ENGINE     │    │    REACT 19 WORKSPACE    │  │
│  │ • CSV / TSV / TXT   ├───►│ • Schema & Date Profiler├───►│ • Overview / Data / Model│  │
│  │ • Excel (.xlsx)     │    │ • AST SQL & Formula AST │    │ • Area-First Charts      │  │
│  │ • JSON & Clipboard  │    │ • Holt +7D & Outliers   │    │ • Timeline Brush & Zoom  │  │
│  │ • HTTPS / GSheets   │    │ • What-If & Root Cause  │    │ • Time-Travel & Profiler │  │
│  └─────────────────────┘    └────────────┬────────────┘    └─────────────┬────────────┘  │
│                                          │                               │               │
│                                          ▼                               ▼               │
│                             ┌─────────────────────────┐    ┌──────────────────────────┐  │
│                             │  BACKGROUND WEB WORKER  │    │   EXPORT & SHARE HUB     │  │
│                             │ • N×N Pearson Matrix    │    │ • Customizable PDF Deck  │  │
│                             │ • Race-Safe Cancels     │    │ • Multi-Sheet .xlsx      │  │
│                             │ • 0ms UI Thread Delay   │    │ • Safe CSV & #share= URL │  │
│                             └─────────────────────────┘    └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Feature Suite

### 1. Universal Client-Side Ingestion (`Dropzone`)
* **Multi-Format File Upload:** Drag-and-drop or browse `.csv`, `.tsv`, `.txt`, `.xlsx`, and `.json` files (up to 50 MB; legacy binary `.xls` is blocked with clear guidance).
* **Instant Clipboard Paste:** Press <kbd>Ctrl</kbd>+<kbd>V</kbd> anywhere on the landing screen to ingest tabular cells copied directly from Excel or Google Sheets (up to 10 MB).
* **Remote HTTPS / Google Sheets Fetch:** Paste a public CSV URL or Google Sheets share link (automatically converted to `/export?format=csv` preserving `gid`) with SSRF validation, 25 MB cap, and 15s timeout.
* **Built-In Sample Datasets:** Launch immediately with **SaaS Revenue Metrics**, **Retail E-Commerce Orders**, or **People & HR Analytics**.

### 2. Automatic Schema Profiling & Area-First Chart Engine
* **Smart Column Inference (`profiler.ts`):** Automatically detects `date` (including ISO-8601 timestamps without `[object Object]` coercion), `number` (currencies, percentages, commas, accounting parentheses), `category`, `boolean`, `id`, and `text`.
* **Area Trend Always First (`recommender.ts`):** Guarantees an **Area Trend** chart appears first for every dataset — aggregated cleanly by day when dates exist, or via sequential record progression when no date column is present, and preserved even when filtered down to 1 day.
* **Multi-Archetype Grid (`ChartGrid.tsx`):** Generates **Area Trend**, **Bar Chart**, **Donut Share**, and **Scatter Correlation** cards with scroll-triggered animations (`useInView`) and **LTTB downsampling** (`lttb.ts`) to 80 visual points for fast rendering.
* **Chart Customizer (`ChartCustomizer.tsx`):** Slide-over drawer to switch any card's visualization type (`Area Trend`, `Bar Chart`, `Donut Share`, `Scatter Plot`), X-axis dimension, or Y-axis numeric metric.

### 3. Coordinated Filtering, Timeline Brush & Time Adjustment
* **Interactive Timeline Brush (`TimelineBrush.tsx` + `useTimelineBrush.ts`):**
  * Dual-handle pointer drag-zoom (`left`, `right`, and `center` pan handles with 44px touch targets) over an animated inline SVG sparkline.
  * **1-Click Time Adjustment Presets:** Instantly adjust the active date window with **`All`**, **`YTD`**, **`90D`**, **`30D`**, and **`7D`** presets, dynamically updating KPIs, Area Trend, and all charts.
* **Global Multi-Category Filter Bar (`FilterBar.tsx`):**
  * Multi-select category dropdowns with `All` / `Clear` / `Reset`, in-dropdown search for high-cardinality columns, active filter pills, and filtered row counters.
  * **Mobile-Safe Bottom Sheet:** Automatically adapts into a viewport-safe bottom sheet with backdrop and close button on `< 640px` screens.
* **Click-to-Cross-Filter:** Click any Bar or Donut slice to toggle filters across the entire dashboard.

### 4. Time-Travel History & Session Undo/Redo (`TimeTravelDrawer`)
* **Immutable Snapshot Stack (`history-store.ts`):** Tracks up to 50 deduplicated dashboard states (filters, customized charts, SQL charts, and active executive lens).
* **Keyboard & Drawer Controls (`TimeTravelDrawer.tsx`):** Press <kbd>Ctrl</kbd>+<kbd>Z</kbd> to Undo, <kbd>Ctrl</kbd>+<kbd>Y</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> to Redo, or expand the floating bottom-left **Session State Timeline** to inspect timestamps and jump directly to any past or future snapshot in 1 click.

### 5. Forecasting, Outlier Detection & Executive Lenses
* **Holt-Winters 7-Day Forecast (`forecasting.ts`):** Click **Forecast +7D** on any Area Trend chart to project a 7-day dashed trajectory with animated 95% confidence intervals.
* **Executive Leadership Lenses (`personas.ts` & `Header.tsx`):** Switch between **CFO** (*Chief Financial Officer* — Gross Volume, Average Ticket, Declined Exposure, FX Currencies), **COO** (*Chief Operating Officer* — Settled Volume, Settlement SLA, Exception Rate, Statistical Anomalies via **Tukey's Fences** IQR), and **CMO** (*Chief Marketing Officer* — Gross Demand, Top Merchant, Partner Diversity, Leading Category).
* **Root-Cause Attribution (`root-cause.ts`):** Evaluates conditional lift across categorical dimensions to surface primary drivers of exceptions or declines.

### 6. In-Browser AST SQL Studio & Safe Formula Studio
* **SQL Studio (`SqlStudioModal.tsx` + `sql-engine.ts`):** Pure TypeScript AST SQL engine supporting `SELECT`, `WHERE` (`=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`, `IN`), `GROUP BY`, `ORDER BY`, `LIMIT`, and aggregates (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`) in < 1 ms, with 1-click **Plot as Dashboard Chart** injection.
* **Formula Studio (`FormulaStudioModal.tsx` + `formula-engine.ts`):** `eval()`-free recursive-descent AST expression evaluator for adding calculated columns using arithmetic, comparisons, `[Column Name]` references, and built-in functions (`ABS`, `ROUND`, `CEIL`, `FLOOR`, `SQRT`, `LOG`, `MIN`, `MAX`, `IF`, `LEN`, `UPPER`, `LOWER`, `CONCAT`), with `useDeferredValue` live row previews.

### 7. Modeling & Matrix Workspace
* **What-If Sensitivity Simulator (`ScenarioSimulator.tsx` + `scenario-simulator.ts`):** `useReducer`-managed multi-slider simulator (**Price / Revenue Adjustment**, **Volume / Quantity Multiplier**, **Churn Reduction**) with selectable target metric & group dimension, compound lift math, and baseline-vs-projected visual bars.
* **Background Web Worker Correlation Matrix (`CorrelationMatrix.tsx` + `useWorkerCompute.ts`):** Offloads $N \times N$ Pearson correlation matrix calculation to a dedicated Blob Web Worker thread (0ms main-thread block) with race-condition cancellation and compute-time telemetry.

### 8. 60 FPS Virtualized Raw Records Explorer (`DataTable`)
* **Custom Windowing Hook (`useVirtualGrid.ts`):** Mounts only visible viewport rows (`~15–20` DOM nodes) for smooth scrolling across large datasets, with live mounted DOM node counter, toggleable **Paginated** view (10 rows/page), deferred full-text search, and clean timestamp/object formatting.

### 9. Export Hub, Zero-Server Permalinks & Live Telemetry HUD
* **Flexible Export Modal (`ExportModal.tsx` + `exporter.ts`):**
  * **PDF Dossier:** Configurable title, subtitle, `Prepared For`, classification (`Confidential`, `Internal Only`, `Public`, `Restricted`), Landscape/Portrait, A4/Letter, Dark/Light theme, section toggles, per-chart picker, analyst notes, and 1-click presets.
  * **Multi-Sheet Excel (`.xlsx`):** Structured `Executive Summary`, `Filtered Data`, and `Correlations` sheets via `write-excel-file`.
  * **RFC-4180 CSV:** UTF-8 BOM + spreadsheet formula-injection neutralization.
* **Zero-Backend Share Permalinks (`ShareModal.tsx` + `permalink.ts`):** Encodes dataset schema, up to 250 sample rows, optional filters, and custom charts into a URL-safe `#share=` hash.
* **React Telemetry / Profiler HUD (`PerformanceHud.tsx` + `telemetry-store.ts`):** Floating bottom-right HUD displaying Latest/Avg/Peak commit ms, React 19 `useTransition` status, animated **Recent Commit Stream**, and **Commit Log** — active in both dev (`<Profiler>`) and production (`useLayoutEffect` + `performance.now()` fallback).

---

## Security & Privacy Hardening (`security.ts`)

* **Zero Network Data Uploads:** Files are parsed and queried exclusively in local browser memory.
* **Prototype Pollution Defense (`CWE-1321`):** Strips `__proto__`, `constructor`, and `prototype` keys across JSON/CSV/clipboard ingestion while preserving `Date` instances.
* **Formula Injection Guard (`CWE-1236`):** Escapes dangerous leading characters (`=`, `+`, `-`, `@`, `\t`, `\r`) on CSV/Excel exports while keeping negative numbers intact.
* **SSRF & Size Caps (`CWE-918`):** Enforces `https://`-only remote CSV URLs, blocks localhost/private IPs, and caps file (50 MB), clipboard (10 MB), remote fetch (25 MB / 15s), and share payload sizes.

---

## Project Structure

```text
├── public/
│   ├── datalens-logo.svg        # Navbar emblem SVG
│   ├── favicon.svg / og-card.svg
│   └── manifest.webmanifest / robots.txt / sitemap.xml
├── src/
│   ├── components/              # UI workspace, charts, modals, drawers & error boundaries
│   │   ├── ChartCustomizer.tsx  ├── ChartGrid.tsx        ├── CorrelationMatrix.tsx
│   │   ├── DataTable.tsx        ├── Dropzone.tsx         ├── ExportModal.tsx
│   │   ├── FilterBar.tsx        ├── FormulaStudioModal.tsx ├── Header.tsx
│   │   ├── KpiRow.tsx           ├── MotionPrimitives.tsx ├── PerformanceHud.tsx
│   │   ├── ScenarioSimulator.tsx ├── ShareModal.tsx      ├── ShortcutsModal.tsx
│   │   ├── SqlStudioModal.tsx   ├── TimelineBrush.tsx    └── TimeTravelDrawer.tsx
│   ├── engine/                  # Pure TypeScript client-side analytics & security engines
│   │   ├── exporter.ts          ├── filter.ts            ├── forecasting.ts
│   │   ├── formula-engine.ts    ├── history-store.ts     ├── lttb.ts
│   │   ├── outliers.ts          ├── parser.ts            ├── permalink.ts
│   │   ├── personas.ts          ├── profiler.ts          ├── recommender.ts
│   │   ├── root-cause.ts        ├── scenario-simulator.ts ├── security.ts
│   │   ├── sql-engine.ts        ├── telemetry-store.ts   ├── unslug.ts
│   │   └── worker-tasks.ts
│   ├── hooks/                   # Custom React 19 state, brush, virtual grid & worker hooks
│   │   ├── useDashboardState.ts ├── useModalAccessibility.ts ├── useRenderCount.ts
│   │   ├── useTimelineBrush.ts  ├── useVirtualGrid.ts    └── useWorkerCompute.ts
│   ├── data/                    # Built-in sample datasets
│   ├── types/                   # Dataset, column, filter & chart TypeScript interfaces
│   ├── utils/                   # Idle chunk prefetching & performance helpers
│   └── App.tsx                  # Root layout, lazy routes, tabs & production profiler fallback
└── .github/workflows/deploy.yml # Automated GitHub Pages build & deployment on push to main
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **UI & Concurrency** | React `19.3` (`useTransition`, `useDeferredValue`, `useSyncExternalStore`) |
| **Language & Build** | TypeScript `7.0`, Vite `8.3` (manual vendor chunks & lazy-loaded workspace views) |
| **Styling & Motion** | Tailwind CSS `v4`, Motion `14.14`, Lucide Icons |
| **Visualizations** | Recharts `3.11` + LTTB downsampling & Holt-Winters forecasting |
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

# 3. Start local development server
npm run dev

# 4. Run linter, type-check, test suite, and production build
npm run lint
npm test
npm run build
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste spreadsheet data from Excel or Google Sheets |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Time-Travel Undo (Restore previous dashboard state) |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Time-Travel Redo (Advance forward in history) |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Execute query in SQL Studio |
| <kbd>?</kbd> | Toggle Keyboard Shortcuts cheat sheet |
| <kbd>Esc</kbd> | Close active modal or slide-over drawer |

---

## License

MIT License — free for personal and commercial use.
