# PharmaSignal — Autonomous Pharmaceutical Intelligence Agent

**Track D · Pharma & Healthcare · Finding the Next Signal, ATMOS 2026**

PharmaSignal is a human-in-the-loop research MVP that connects public pharmaceutical disclosures, regulatory information and industry developments to help an analyst investigate non-obvious financial signals. It is designed around one rule: **the AI can propose a signal, but a human must decide whether the evidence is strong enough to accept it.**

The project has a React + TypeScript frontend and a FastAPI backend. It includes an always-available synthetic demo mode, optional live public-web research using Tavily + Gemini, an evidence and falsification workspace, analyst decisions, and Markdown/JSON export.

> **Important data note:** Demo mode uses explicitly synthetic teaching scenarios. They are not claims about Sun Pharma or another real company. Live mode retrieves public web-search results, but search snippets may be incomplete or stale. Open and verify sources before accepting a finding. PharmaSignal does not give investment recommendations.

## 1. What is included

```text
PharmaSignal/
├── README.md
├── .gitignore
├── render.yaml                  # Render free backend deployment; no Docker
├── .github/workflows/ci.yml     # Backend tests + frontend build on GitHub
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py              # FastAPI routes, CORS, health/config
│   │   ├── schemas.py           # Typed request/response contracts
│   │   ├── demo_data.py         # Clearly marked synthetic demo fixtures
│   │   ├── providers.py         # Tavily web search + Gemini REST client
│   │   └── research.py          # Research planning, synthesis, source mapping
│   └── tests/
│       └── test_api.py          # API and demo-mode tests
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vercel.json              # SPA rewrite for Vercel
    └── src/
        ├── main.tsx
        ├── App.tsx              # Main responsive research workspace
        ├── api.ts               # Typed API client
        ├── types.ts             # Frontend data contracts
        ├── vite-env.d.ts
        └── styles.css           # Responsive visual system
```

## 2. Features

- **Research modes:** Demo is available without API keys. Live Research uses public web search plus Gemini-based analysis.
- **Company-independent workflow:** The company and research lens are user inputs; search angles are chosen from a generic Track D workflow rather than company-specific findings.
- **Focused research lenses:** Regulatory exposure, business-model transition, geographic concentration, financial quality, or automatic discovery.
- **Evidence trail:** Each live evidence item retains the retrieved title, URL, publication date where supplied, snippet and relevance note.
- **Two-pass research:** An initial source pass informs agent-selected follow-up queries; at least one query is designed to seek a contradiction or alternative explanation. The expanded source set is then synthesised.
- **Contradiction and falsification:** Each candidate includes a counterargument and a condition that should weaken or invalidate it.
- **Human review:** Analysts can approve, reject, or request more evidence and add a note. No finding is automatically approved.
- **Export:** Download a Markdown research note or raw JSON with review decisions.
- **Responsive UI:** Desktop and mobile layouts, keyboard-friendly inputs, status labels and clear synthetic-data warnings.
- **Tests:** Backend health, config, demo, input validation and review endpoint tests.

## 3. Prerequisites for Windows 11 + VS Code

Install these first:

1. **Python 3.12** (recommended for local setup): https://www.python.org/downloads/
2. **Node.js 22.12+ or a current supported LTS release** (includes npm): https://nodejs.org/
3. **Visual Studio Code:** https://code.visualstudio.com/
4. VS Code extensions: Python (Microsoft) and ESLint (optional; this MVP does not require ESLint to run).

After installation, open a *new* VS Code terminal and confirm:

```powershell
py --version
node --version
npm --version
```

Vite 8 requires a supported recent Node release; Node 22.12+ or a current LTS release is recommended.

## 4. Run locally (Demo mode — no API keys required)

### Step A — Open the project

1. Download and unzip the project.
2. In VS Code, select **File → Open Folder** and open the `PharmaSignal` folder.
3. Open **Terminal → New Terminal**.

### Step B — Start the backend

In terminal 1:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks venv activation, run this **in that terminal only**, then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

If `py -3.12` is not available, use the Python version installed on your computer: `py -m venv .venv`. Use Python 3.11+; 3.12 is the recommended runtime for the deployment configuration.

You should see Uvicorn listening on `http://127.0.0.1:8000`. Keep this terminal open.

Verify the backend in a browser:

- Health: http://127.0.0.1:8000/api/health
- Interactive API docs: http://127.0.0.1:8000/docs

### Step C — Start the frontend

Open **a second VS Code terminal** (keep the backend running):

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the URL printed by Vite, normally **http://localhost:5173**. The frontend uses the Vite development proxy to reach the backend at port 8000; leave `VITE_API_URL` blank for local development.

On first load, the app performs a demo scan for Sun Pharmaceutical Industries. The page clearly labels all demo fixtures as synthetic. Try switching the lens, selecting another company, opening a finding, reviewing it and exporting the report.

### Step D — Run backend tests

Open another terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

The included test suite should report eight passing tests, including a mocked live pipeline test that does not call external APIs. If `pytest` is not found, check that your backend virtual environment is activated and that `pip install -r requirements.txt` completed.

### Common local issues

- **`Could not reach the PharmaSignal API`:** Make sure terminal 1 is running and `http://127.0.0.1:8000/api/health` works.
- **PowerShell activation blocked:** Use the process-scoped execution-policy command above. Do not change your machine-wide execution policy for this project.
- **Port 8000 busy:** Start Uvicorn on another port and update the proxy target in `frontend/vite.config.ts` to match.
- **Port 5173 busy:** Vite prints another available port; use that URL.
- **Live mode says keys are missing:** Demo mode does not need keys. Follow section 5 only when you are ready to test live search.

## 5. Configure optional live research

Live research currently uses:

- **Tavily Search API** to retrieve public web sources: https://docs.tavily.com/
- **Gemini API** to generate candidate discoveries, explanations, counterarguments and falsification conditions: https://ai.google.dev/gemini-api/docs

Create API keys through their official dashboards. Free tiers, quotas and access requirements can change; check each provider's current terms. The project itself does not require payment to run in Demo mode.

1. Open `backend/.env` (created in Step B).
2. Add your keys:

```dotenv
TAVILY_API_KEY=your_tavily_key_here
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-3.8-flash
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

3. Save the file and restart the backend (Ctrl+C, then rerun the Uvicorn command).
4. Refresh the web app. Select **Live** and run a scan.

**Key safety:** API keys belong only in `backend/.env` or the deployment provider's secret environment settings. Never put provider keys in React code, `frontend/.env.local`, a public GitHub repository, a report or a demo recording. The frontend receives only the backend's readiness state, never the secret keys.

The live research process performs multiple search queries, deduplicates URLs and asks Gemini to analyse the source snippets. It filters evidence references against the actual retrieved URLs. The system still cannot independently guarantee the truth of a source or that a search snippet captures the complete context; the human analyst must open original documents and verify claims.

## 6. Free deployment (no Docker)

Recommended student-demo deployment:

- **Frontend:** Vercel Hobby (static Vite build)
- **Backend:** Render Free Web Service (FastAPI)

Free provider tiers and eligibility can change. Render free services can spin down after inactivity and may take around a minute to wake up; their local filesystem is ephemeral. This MVP stores analyst decisions and the last research result in the user's browser `localStorage`, so there is no database to provision. Browser-local reviews are not shared with other analysts or devices.

### A. Push this folder to GitHub

1. Create a new repository on GitHub.
2. From VS Code terminal at the project root:

```powershell
git init
git add .
git commit -m "Build PharmaSignal research MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PharmaSignal.git
git push -u origin main
```

Replace the URL with your own repository. Ensure `.env` files are not staged. The included `.gitignore` excludes them.

### B. Deploy the FastAPI backend to Render

The root `render.yaml` is configured for a free Python service without Docker.

1. Sign in to https://render.com/ and connect your GitHub account.
2. Choose **New → Blueprint** and select your PharmaSignal repository (or create a Web Service using the settings below).
3. If creating it manually, set:
   - **Runtime:** Python 3
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
   - **Plan:** Free
4. In Render's Environment settings, set:
   - `GEMINI_API_KEY` — optional until Live mode is required
   - `TAVILY_API_KEY` — optional until Live mode is required
   - `GEMINI_MODEL` — `gemini-3.8-flash`
   - `ALLOWED_ORIGINS` — `*` is set in the starter Blueprint for a simple demo. After frontend deployment, you can restrict this to your exact Vercel origin, e.g. `https://your-project.vercel.app`.
5. Deploy, then open `https://YOUR-API.onrender.com/api/health`. It should return JSON with `"status":"ok"`.

The Render Free service may be asleep during your first request. Wait for the service to wake from the request screen and retry if needed. See the official limitations: https://render.com/docs/free

### C. Deploy the frontend to Vercel

1. Sign in to https://vercel.com/ with GitHub.
2. Choose **Add New → Project** and import your repository.
3. Set **Root Directory** to `frontend`.
4. Framework preset: Vite (Vercel should normally detect it).
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Add the environment variable:

```text
VITE_API_URL=https://YOUR-API.onrender.com
```

Use your real Render URL with no trailing slash. Deploy.

8. Open your Vercel URL and confirm the API status at the bottom of the left sidebar shows connected. Run a Demo scan first, then Live after keys are configured.
9. For a tighter CORS setting, go back to Render and replace `ALLOWED_ORIGINS=*` with your exact Vercel URL (and any preview URL you genuinely need), then redeploy the backend.

Useful provider docs:

- Render free plans: https://render.com/docs/free
- Render FastAPI deployment: https://render.com/docs/deploy-fastapi
- Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby


## 8. API reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/config` | Provider readiness without exposing API keys |
| `POST` | `/api/research` | Run demo or live scan (`company`, `mode`, `focus`) |
| `POST` | `/api/review` | Validate/acknowledge an analyst decision |
| `GET` | `/docs` | Interactive FastAPI docs |

Example research request:

```json
{
  "company": "Sun Pharmaceutical Industries",
  "mode": "demo",
  "focus": "regulatory"
}
```

Allowed `focus` values: `auto`, `regulatory`, `business_model`, `geography`, `financial_quality`.

## 9. Known MVP limitations

- **Demo mode is synthetic.** It validates the UI and workflow without inventing facts about a real company.
- **Live analysis relies on search snippets.** It is not a complete annual-report parser; snippets may omit important context.
- **Financial extraction is conservative.** If the needed numbers are not present in sources, metrics should say “Not available” rather than fabricate a calculation.
- **Human review is local to the browser.** The review endpoint acknowledges decisions, while the client stores review state in `localStorage`. There is no authentication or shared server-side audit database.
- **No investment advice.** The project produces research candidates, not buy/sell signals or price predictions.
- **No guaranteed free production hosting.** Free plans have quotas, cold starts and provider-specific limits. This project is intended as a hackathon prototype.

## 10. Troubleshooting and reset

- If you want a clean client demo, use the browser console to remove `pharmasignal_last_research_v1` and `pharmasignal_reviews_v1` from localStorage, then refresh.
- If Gemini returns a model-not-found error, check the current model catalogue at https://ai.google.dev/gemini-api/docs/models and update `GEMINI_MODEL` in the backend environment.
- If a provider rate limit is reached, switch to Demo mode and continue demonstrating the evidence-review workflow.
- If a review is not recorded, confirm the backend health endpoint is reachable; review records are not sent anywhere else in this MVP.

---

Built as a student hackathon MVP. Verify sources independently and follow each data provider's terms of service.
