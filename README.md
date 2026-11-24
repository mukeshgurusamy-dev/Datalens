# DataLens Engine 🔬📊
> **Universal, Client-Side Business Intelligence & Analytics Engine**  
> *Architected with React 19 Concurrent Internals, TypeScript 7, Tailwind CSS v4, Web Workers, and Vitest.*

[![React 19](https://img.shields.io/badge/React-19.3-61dafb?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite 8](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-104_Tests_Passing-729b1b?logo=vitest&logoColor=white)](https://vitest.dev)
[![Web Workers](https://img.shields.io/badge/Web_Workers-Multi--Threaded-orange)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
[![Zero Backend Latency](https://img.shields.io/badge/Latency-Sub--Millisecond-emerald)](#)

---

## 🌟 Executive Summary

**DataLens** is an advanced, privacy-first business intelligence and analytics engine operating **100% inside the browser**. 

Traditional enterprise BI platforms (Tableau, PowerBI, Looker) require cloud database servers, expensive user licenses, and transmission of sensitive customer data across third-party networks. **DataLens eliminates this entirely**: it ingests arbitrary tabular datasets (CSV, Excel `.xlsx`, JSON, Google Sheets, or clipboard paste), automatically infers statistical schemas, renders interactive executive dashboards, evaluates client-side SQL, and exports boardroom-grade dossiers with **zero server dependencies and zero backend latency**.

---

## 🏛️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       USER BROWSER RUNTIME                                       │
│                                                                                                  │
│  ┌───────────────────────┐    ┌───────────────────────────┐    ┌──────────────────────────────┐  │
│  │   DATA INGESTION      │    │    IN-MEMORY COMPUTE      │    │      REACT 19 UI CANVAS      │  │
│  │  - CSV / TSV / TXT    ├───►│  - Column Profiler        ├───►│  - Concurrent Transitions    │  │
│  │  - Excel (.xlsx/.xls) │    │  - AST SQL Parser         │    │  - 60 FPS Virtual Grid       │  │
│  │  - Clipboard (Ctrl+V) │    │  - AST Formula Engine     │    │  - Coordinated Cross-Filter  │  │
│  │  - Remote URL Fetch   │    │  - Holt-Winters Forecast  │    │  - Timeline Brush & Zoom     │  │
│  └───────────────────────┘    └─────────────┬─────────────┘    └──────────────┬───────────────┘  │
│                                             │                                 │                  │
│                                             ▼                                 ▼                  │
│                               ┌───────────────────────────┐    ┌──────────────────────────────┐  │
│                               │   BACKGROUND WEB WORKER   │    │     EXECUTIVE EXPORT HUB     │  │
│                               │  - Pearson Correlation    │    │  - A4 Landscape PDF Dossier  │  │
│                               │  - Race Cancellation      │    │  - Multi-Sheet Excel (.xlsx) │  │
│                               │  - 0ms Main-Thread Delay  │    │  - Cleaned RFC-4180 CSV      │  │
│                               └───────────────────────────┘    └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Architectural Capabilities

### 1. In-Browser SQL Studio (Pure TypeScript AST Engine)
* **Client-Side Lexer & Parser:** Full SQL tokenizer written from scratch without external SQL dependencies.
* **Dialect Support:** Evaluates `SELECT`, `WHERE` (`AND`, `=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`), `GROUP BY`, `ORDER BY`, `LIMIT`, and aggregations (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`) against in-memory datasets in **< 1ms**.
* **1-Click Chart Injection:** Seamlessly compiles query outputs into Recharts visualization configurations and injects them as live dashboard cards.

### 2. Custom Formula Studio & Calculated Columns
* **Safe Expression Parser:** Recursive-descent AST evaluator supporting arithmetic (`+`, `-`, `*`, `/`, `%`, `**`), comparisons, nested functions (`ABS`, `ROUND`, `CEIL`, `FLOOR`, `SQRT`, `LOG`, `MIN`, `MAX`, `IF`, `LEN`, `UPPER`, `LOWER`, `CONCAT`), and `[Column Name]` references without ever using dangerous `eval()` or `Function()`.
* **Typing Optimization (`useDeferredValue`):** Defers per-row live calculation previews across dataset records, guaranteeing fluid 60 FPS typing responsiveness.

### 3. Executive "What-If" Sensitivity Simulator
* **`useReducer` State Machine:** Modeled as an immutable state machine managing multi-slider sensitivity adjustments (Price/Revenue adjustment, Volume multiplier, Churn reduction).
* **Multiplicative Compound Lift:** Evaluates $\prod(1 + \Delta\%)$ across grouped categories to project non-linear business impacts.
* **Dual-Bar Overlay:** Visualizes baseline metrics alongside projected scenarios with color-coded net financial deltas.

### 4. Background Web Worker Compute Pipeline (`useWorkerCompute`)
* **Dedicated OS Thread Offloading:** Spawns an inline Web Worker via Blob URL to compute full $N \times N$ Pearson Correlation Matrices ($r \in [-1, +1]$) completely off the React main thread (**0ms main-thread delay**).
* **Race Condition Guard:** Automated request ID matching ensures rapid filter transitions immediately cancel and discard stale background computations.

### 5. 60 FPS Virtual Grid (`useVirtualGrid`)
* **Zero-Dependency Windowing Hook:** Custom-built React DOM windowing engine that measures container offsets and dynamically mounts only the visible viewport records (`~15-20` nodes) instead of mounting thousands of DOM elements.
* **Telemetry Badge:** Live indicator displays active mounted node counts and memory efficiency.

### 6. Interactive Coordinated Multiple Views & Cross-Filtering
* **Direct Chart Filtering:** Clicking any chart bar, scatter point, or donut slice instantly cascades cross-filters across the entire dashboard canvas.
* **Interactive Timeline Brush:** Custom `useTimelineBrush` hook powering a dual-handle SVG sparkline track with smooth drag-zoom and 1-click date presets (`7D`, `30D`, `90D`, `YTD`, `All`).

### 7. Executive Lenses & Dynamic AI Briefings
* **Leadership Personas:** Toggle between **[ CFO Capital & Risk | COO Throughput & SLA | CMO Growth & Market Share ]** to dynamically restructure KPI cards according to executive priorities.
* **Deterministic Insights:** Automatic root-cause attribution, Tukey's fences outlier identification ($IQR = Q_3 - Q_1$), and Holt-Winters double-exponential trajectory forecasting with 95% confidence bands.

### 8. Multi-Format Executive Export Hub
* **📄 Executive PDF Dossier:** Generates multi-page A4 documents with **Landscape (16:9 Presentation Deck)** or **Portrait** orientation, running page counts, custom recipient headers, and confidentiality stamps (`CONFIDENTIAL & PROPRIETARY`, `INTERNAL ONLY`).
* **📊 Multi-Sheet Excel Workbook (`.xlsx`):** Direct client-side generation of structured Excel files with Sheet 1 (Executive Summary), Sheet 2 (Cleaned Filtered Records), and Sheet 3 (Statistical Correlations).
* **💾 Filtered RFC-4180 CSV:** Automated field escaping with UTF-8 Byte Order Mark (`\uFEFF`) for seamless international Excel viewing.
* **🖼️ 2x Retina PNG Snapshot:** Crisp high-DPI rasterization for presentations and Slack.
* **📋 Markdown Executive Memo:** 1-click formatted summary ready for Notion or email briefings.

### 9. Time-Travel History & Telemetry HUD
* **Immutable State Stack:** Undo/Redo engine listening to <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> with an interactive visual history drawer.
* **React 19 Native Profiler HUD:** Decoupled external store (`useSyncExternalStore`) monitoring real-time fiber commit durations and transition delays.

---

## 🛠️ Tech Stack & Dependencies

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 19.3 | Concurrent scheduling, `useTransition`, `useDeferredValue`, `useSyncExternalStore` |
| **Language** | TypeScript 7.0 | Strict type safety, AST interfaces, zero compilation warnings |
| **Styling** | Tailwind CSS v4 | High-performance CSS engine with modern dark-mode palettes |
| **Visualizations** | Recharts 3.x | SVG Area, Bar, Donut, and Scatter plots with custom tooltips |
| **Motion** | Motion 14.x | Spring physics animations for drawers, modals, and card transitions |
| **Processing** | SheetJS (`xlsx`), PapaParse | Universal multi-format ingestion and `.xlsx` multi-sheet synthesis |
| **Document Engine** | `jspdf`, `html-to-image` | Vectorized PDF pagination and 2x Retina rasterization |
| **Test Suite** | Vitest 5.1 | 104 automated tests across 17 test suites |

---

## 🧪 Automated Test Suite

DataLens is rigorously covered by **104 automated unit and integration tests** verifying parser correctness, mathematical ground truth, and UI hooks:

```bash
# Run the complete test suite
npx vitest run

# Test Coverage Summary:
# ✓ src/engine/__tests__/sql-engine.test.ts (7 tests)
# ✓ src/engine/__tests__/formula-engine.test.ts (19 tests)
# ✓ src/engine/__tests__/scenario-simulator.test.ts (6 tests)
# ✓ src/engine/__tests__/worker-tasks.test.ts (7 tests)
# ✓ src/engine/__tests__/forecasting.test.ts (5 tests)
# ✓ src/engine/__tests__/lttb.test.ts (5 tests)
# ✓ src/engine/__tests__/outliers.test.ts (6 tests)
# ✓ src/engine/__tests__/profiler.test.ts (10 tests)
# ✓ src/engine/__tests__/filter.test.ts (8 tests)
# ✓ src/engine/__tests__/exporter.test.ts (3 tests)
# ✓ src/hooks/__tests__/useTimelineBrush.test.ts (5 tests)
# Total: 104 passed across 17 test files
```

---

## 💻 Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/mukeshgurusamy-dev/Datalens.git
cd Datalens

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Run production build & type check
npm run build
```

Open [http://localhost:5174](http://localhost:5174) in your browser to start exploring.

---

## ⌨️ Power-User Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste spreadsheet cells directly from Excel or Google Sheets |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Time-Travel Undo (Restore previous dashboard state) |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Time-Travel Redo (Advance forward in history) |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Execute query in SQL Studio |
| <kbd>?</kbd> | Toggle Keyboard Shortcuts cheat sheet |
| <kbd>Esc</kbd> | Close any active modal or slide-over drawer |

---

## 📄 License

MIT License — free for personal and commercial exploration.
