# UK Wind Intelligence — National Wind Generation & Forecast Analytics

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?style=flat&logo=docker)](https://www.docker.com)
[![Data Source: Elexon BMRS](https://img.shields.io/badge/Data_Source-Elexon_BMRS-003366.svg)](https://data.elexon.co.uk/bmrs/api/v1)

A high-precision, production-grade intelligence platform engineered for energy traders, power market analysts, and grid operators to audit, evaluate, and benchmark UK national wind generation actuals against Day-Ahead forecasts published on the Elexon Balancing Mechanism Reporting Service (BMRS).

---

## Live Deployments (Placeholders)

| Component | Target Hosting | Live URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | [https://kjhwr-theta.vercel.app/](https://kjhwr-theta.vercel.app/) | Deployed (Active) |
| **Backend REST API** | Render / Railway | `https://<your-backend-app>.onrender.com` | Ready to Deploy |
| **Interactive API Docs** | Swagger / OpenAPI | `https://<your-backend-app>.onrender.com/docs` | Ready to Deploy |
| **API Health Check** | FastAPI Probe | `https://<your-backend-app>.onrender.com/health` | Ready to Deploy |

---

## 1. Product Overview & Key Features

UK Wind Intelligence bridges raw grid telemetry and actionable trading intelligence. Inspired by modern fintech and design systems (Mobbin/Linear style), it delivers maximum data density with zero visual clutter:

- **Day-Ahead Decision Gate Closure Compliance**: Enforces strict historical publication cutoffs (e.g. 12:00 UTC on D-1 for delivery day D) to prevent look-ahead bias and simulate realistic pre-market trading decisions.
- **Core Accuracy Benchmarks**: Real-time evaluation of:
  - **MAE (Mean Absolute Error)**: Quantifies the average magnitude of forecast deviations in megawatts (MW).
  - **RMSE (Root Mean Square Error)**: Penalizes extreme outliers to expose volatile forecast swings.
  - **Forecast Bias**: Discloses systematic over-forecasting ($+$ bias) or under-forecasting ($-$ bias) across settlement periods.
  - **Matched Coverage Rate (%)**: Audits the percentage of settlement intervals successfully paired.
- **Multi-Curve Visualization**: Dual-line charts displaying outturn generation vs. Day-Ahead forecasts with capacity bands, interactive hover tooltips, and dynamic interval highlights.
- **Granular Settlement Audit**: Detailed half-hourly tabular inspection across all 48 settlement periods per day, complete with publication timestamps, target intervals, absolute errors, and percentage variances.
- **Dedicated Analytical Sub-views**:
  - **Overview**: Core KPIs, interactive filter toolbar (date range, cutoff time, capacity banding), and headline actuals vs. forecast trends.
  - **Forecast Accuracy**: Error distribution histograms, capacity band breakdowns (Low, Medium, High wind regimes), and statistical error metrics.
  - **Forecast History**: Historical forecast publication version logs, lookback analysis, and gate closure validation.
  - **Data Quality & Diagnostics**: Settlement completeness audit, missing period detection, BMRS API latency tracking, and cache hit/miss statistics.

---

## 2. System Architecture & Directory Structure

The platform follows a decoupled, cloud-ready architecture:

```
kjhwr/
├── .env.example              # Master environment configuration template
├── .gitignore                # Production Git exclusion rules
├── docker-compose.yml        # Orchestration for local containerized stack
├── README.md                 # Project documentation & deployment manual
├── backend/                  # Python FastAPI Backend
│   ├── .env.example          # Backend-specific environment template
│   ├── Dockerfile            # Container configuration with dynamic $PORT support
│   ├── requirements.txt      # Pinned Python dependencies
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint & Starlette CORS configuration
│   │   ├── config.py         # Pydantic v2 application settings
│   │   ├── api/
│   │   │   └── routes.py     # Endpoints (/health, /diagnostics, /analytics)
│   │   ├── models/
│   │   │   └── schemas.py    # Request/Response validation models
│   │   ├── services/
│   │   │   ├── elexon_client.py     # BMRS API client (FUELHH & WINDFOR)
│   │   │   ├── forecast_selector.py # Gate closure cutoff filtering
│   │   │   ├── matcher.py           # Hourly-to-half-hourly settlement matching
│   │   │   ├── analytics.py         # MAE, RMSE, Bias & capacity calculations
│   │   │   └── cache.py             # File-backed deterministic cache
│   │   └── utils/
│   │       └── time.py       # UTC chunking, timestamp parsing & ISO formatting
│   ├── data/cache/           # Git-ignored deterministic JSON response cache
│   └── tests/                # Comprehensive test suite (18 test cases)
└── frontend/                 # React 19 + TypeScript + Vite Frontend
    ├── .env.example          # Frontend environment template
    ├── Dockerfile            # Multi-stage build (Node 20 Alpine -> Nginx Alpine)
    ├── nginx.conf            # Production Nginx SPA reverse proxy & caching rules
    ├── vercel.json           # Vercel SPA rewrite configuration
    ├── package.json          # Dependencies & scripts
    ├── vite.config.ts        # Vite build configuration
    └── src/
        ├── App.tsx           # Navigation shell & routing
        ├── index.css         # Dark theme & styling tokens
        ├── components/       # Reusable components
        │   ├── charts/       # ActualVsForecastChart, ErrorDistributionChart
        │   ├── dashboard/    # FilterToolbar, KpiGrid, CapacityBandCard
        │   ├── layout/       # Header, Sidebar
        │   └── tables/       # SettlementTable, ForecastPublicationTable
        ├── hooks/
        │   └── useWindData.ts # Centralized data fetcher with status polling
        ├── pages/            # Overview, Accuracy, History, DataQuality
        └── services/
            └── api.ts        # Axios/Fetch API client with VITE_API_BASE_URL
```

---

## 3. Data Source Disclosure

UK Wind Intelligence relies directly on public, authoritative electricity market datasets published by the **Elexon Balancing Mechanism Reporting Service (BMRS)**:

1. **FUELHH (Half-Hourly Generation by Fuel Type)**:
   - Endpoint: `/datasets/FUELHH`
   - Filter: `fuelType=WIND`
   - Resolution: 30-minute settlement periods (SP 1–48)
   - Scope: National transmission-connected wind outturns in megawatts (MW).
2. **WINDFOR (Wind Generation Forecast)**:
   - Endpoint: `/datasets/WINDFOR`
   - Fields: `publishTime` (release timestamp) and `startTime` (delivery target)
   - Scope: National aggregated wind power forecasts.

> **Open Data Compliance**: Elexon BMRS data is published as Open Data under the UK Balancing and Settlement Code (BSC). An optional scripting API key can be configured via `BMRS_API_KEY` for higher throughput limits, but baseline usage works out-of-the-box without authentication.

---

## 4. Analytical Methodology & Limitations

### Settlement Period Alignment
The Great Britain electricity grid operates on a 48-period settlement day. Each settlement period (SP) spans 30 minutes, beginning at 00:00 UTC (SP 1: 00:00–00:30 UTC ... SP 48: 23:30–24:00 UTC).

### Day-Ahead Decision Gate Closure
Trading teams commit physical and financial positions prior to the Day-Ahead Market (DAM) gate closure. To evaluate forecast skill accurately:
1. All WINDFOR forecasts published after the cutoff time (default: **12:00 UTC on D-1**) are strictly disqualified from selection for delivery on Day D.
2. For each delivery interval, the **most recent forecast published before the cutoff** is designated as the Day-Ahead forecast.
3. This guarantees zero look-ahead bias in all computed metrics.

### Hourly to Half-Hourly Normalization
BMRS WINDFOR forecasts are published in 1-hour increments, while actual FUELHH generation is reported in half-hour settlement periods. The matching engine maps each hourly forecast to its two constituent half-hourly settlement intervals (e.g., forecast for hour ending 14:00 applies to SP 27 [13:00–13:30] and SP 28 [13:30–14:00]).

### Mathematical Metrics
For $N$ matched settlement intervals with actual generation $A_i$ and forecast $F_i$:
- **Error**: $e_i = F_i - A_i$
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |F_i - A_i|$$
- **Root Mean Square Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (F_i - A_i)^2}$$
- **Forecast Bias**:
  $$\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} (F_i - A_i)$$
  *(A positive bias indicates systematic over-forecasting; a negative bias indicates systematic under-forecasting).*

### Limitations
- **Transmission-Connected Scope**: Covers transmission system-connected wind farms reporting through BMRS. Small-scale distributed or embedded wind generation is not captured in FUELHH.
- **External API Availability**: Analysis depends on Elexon BMRS endpoint uptime. The backend implements local caching and retry policies to maintain high availability during upstream maintenance.

---

## 5. Environment Variables

All configuration is handled cleanly through environment variables:

| Variable | Scope | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Frontend | `http://localhost:8000` | Target URL used by the browser to make REST calls. In production, set to your backend domain (e.g. `https://<your-backend>.onrender.com`). |
| `BMRS_API_BASE_URL` | Backend | `https://data.elexon.co.uk/bmrs/api/v1` | Public Elexon BMRS REST API base URL. |
| `BMRS_API_KEY` | Backend | `""` *(empty)* | Optional Elexon API key for higher rate limits. |
| `DEFAULT_CUTOFF_TIME` | Backend | `12:00` | Default Day-Ahead cutoff time in UTC (`HH:MM`). |
| `DEFAULT_START_DATE` | Backend | `2026-01-01` | Default analysis window start date (`YYYY-MM-DD`). |
| `DEFAULT_END_DATE` | Backend | `2026-01-31` | Default analysis window end date (`YYYY-MM-DD`). |
| `CACHE_ENABLED` | Backend | `true` | Enables deterministic disk-caching of upstream BMRS payloads. |
| `CACHE_TTL_HOURS` | Backend | `24` | Cache expiration time in hours. |
| `HTTP_TIMEOUT_SECONDS`| Backend | `30.0` | Upstream request timeout. |
| `MAX_CHUNK_DAYS` | Backend | `6` | Query chunk duration (respects Elexon's 7-day API limit). |
| `CORS_ORIGINS` | Backend | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed frontend origins. (Regex also supports all `*.vercel.app` domains). |
| `PORT` | Backend | `8000` | Port for the Uvicorn server (automatically provided by cloud platforms like Render). |

---

## 6. Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
5. Launch the development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The API will be available at `http://127.0.0.1:8000`, and interactive docs at `http://127.0.0.1:8000/docs`.*

### Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite dev server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   *The web dashboard will be live at `http://127.0.0.1:5173`.*

---

## 7. Docker Orchestration

Both services can be run as production-grade containers using `docker-compose.yml`:

### Build and Run with Docker Compose
```bash
# Build images and start services in detached mode
docker compose up --build -d

# Check service health status
docker compose ps

# View container logs
docker compose logs -f

# Shut down services and networks
docker compose down
```

### Standalone Docker Builds

**Backend Container:**
```bash
docker build -t uk-wind-intel-backend ./backend
docker run -p 8000:8000 -e CORS_ORIGINS="http://localhost:5173" uk-wind-intel-backend
```

**Frontend Container:**
```bash
# Pass the production API URL at build time so Vite injects it into client assets
docker build -t uk-wind-intel-frontend \
  --build-arg VITE_API_BASE_URL="http://localhost:8000" \
  ./frontend
docker run -p 5173:5173 uk-wind-intel-frontend
```

---

## 8. Testing & Validation

### Backend Test Suite
Run the full test suite with pytest:
```bash
# Fast unit tests (analytics, matcher, selector, API schemas, cache)
python -m pytest backend/tests/test_analytics.py backend/tests/test_api_routes.py backend/tests/test_cache.py backend/tests/test_forecast_selector.py backend/tests/test_matcher.py -v

# Live Elexon BMRS integration tests
python -m pytest backend/tests/test_elexon_live.py -v
```

### Frontend Lint and Build Verification
```bash
cd frontend

# Run Oxlint
npm run lint

# Compile TypeScript and generate production Vite bundle
npm run build
```

---

## 9. Recommended Production Deployment Setup

For optimal performance, low latency, and zero server maintenance, the recommended hosting strategy is:
- **Frontend**: [Vercel](https://vercel.com) (Static SPA hosting on Global Edge Network, automatic HTTPS, continuous deployment from Git).
- **Backend**: [Render](https://render.com) or [Railway](https://railway.app) (Native Python or Docker container service, automatic health checks, automatic TLS).

---

## 10. Step-by-Step Deployment Instructions

### Step 1: Deploy Backend to Render (or Railway)
1. Push your repository to GitHub.
2. Sign in to [Render](https://dashboard.render.com/) and click **New +** > **Web Service**.
3. Select your repository.
4. Configure service settings:
   - **Name**: `uk-wind-intelligence-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `BMRS_API_BASE_URL`: `https://data.elexon.co.uk/bmrs/api/v1`
   - `CACHE_ENABLED`: `true`
   - `CORS_ORIGINS`: `https://<your-project-name>.vercel.app` *(add after step 2)*
6. Click **Create Web Service**. Once deployed, copy your backend URL:
   `https://<your-backend-app>.onrender.com`
7. Verify backend health by visiting:
   `https://<your-backend-app>.onrender.com/health`

### Step 2: Deploy Frontend to Vercel
1. Sign in to [Vercel](https://vercel.com/) and click **Add New...** > **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In the **Environment Variables** section, add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://<your-backend-app>.onrender.com` *(from Step 1)*
5. Click **Deploy**. Vercel will build the frontend and provide your live URL:
   `https://<your-project-name>.vercel.app`

### Step 3: Verify Public Access
1. Visit your live frontend URL (`https://<your-project-name>.vercel.app`).
2. Verify that the **System Status** dot in the sidebar indicates `Live BMRS`.
3. Check the **Overview Page**: Verify KPI cards populate with live MAE, RMSE, and Bias metrics, and the chart renders without errors.
4. Navigate through **Forecast Accuracy**, **Forecast History**, and **Data Quality** to confirm all analytics and deep routes function smoothly.

---

## 11. AI Tools Used

This application was engineered and integrated utilizing:
- **Google Antigravity IDE**: AI-assisted software engineering and agentic pair-programming environment.
- **Claude 3.5 Sonnet & Gemini Foundation Models**: Code synthesis, mathematical verification of electricity market formulas, and responsive UI component development.
- **Oxlint**: High-speed Rust-based JavaScript/TypeScript linter.
