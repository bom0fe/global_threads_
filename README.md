# Global Threads

A trade & supply-chain risk visualization platform that links Korean import flows
to GDELT geopolitical events, surfaces anomalies in price and volume, and ranks
alternative supplier countries for a given HS code.

The app is built with **React + D3 + react-globe.gl** on the frontend and a small
**Express + MongoDB** backend that answers anomaly / news-similarity queries.

---

## Overview

The app has two top-level views:

- **Dashboard** — single-screen workspace for one (country × HS code) pair.
  Shows the historical event list, before/after price (UIV) and import-volume
  charts, an alternative-supplier ranking and a 2D world map.
- **Deep Analysis** — full-screen 3D globe with trade-flow arcs, GDELT event
  markers, multi-select filters and a timeline slider (yearly / monthly /
  volatility coloring).

Anomaly windows are detected from the UIV time series (z-score + momentum +
seasonal deviation). For each anomaly month, related events are fetched from
MongoDB via the backend `/api/events/anomalies` endpoint.

---

## Project structure

```
my-app/
├── public/                     # CRA static assets
│   ├── data/                   # CSV / JSON datasets served at runtime
│   │   ├── alternative_scores.json
│   │   ├── global_threads_risk.csv
│   │   └── global_threads_timeseries_uiv_2.csv
│   └── index.html
│
├── src/
│   ├── App.js                  # Top-level view switcher (dashboard ↔ deep)
│   ├── index.js                # React entry point
│   ├── Dashboard.jsx           # Dashboard view + charts + supplier map
│   ├── Dashboard.css
│   ├── DeepAnalysisView.jsx    # 3D globe + filters + detail panel
│   ├── DeepAnalysisView.css
│   ├── MultiSelectDropdown.jsx # Searchable multi-select used by filters
│   ├── Timelineslider.jsx      # Year/month timeline with options panel
│   ├── tradedata.js            # COUNTRY_GEO, COMMODITIES, CSV hooks
│   ├── useTimeseriesData.js    # CSV loader + anomaly detector
│   ├── useGdeltEvents.js       # Backend events lookup for anomaly months
│   ├── useEventData.js         # GDELT event JSON loader for the globe
│   ├── useAltScores.js         # Top-N alternative supplier hook (legacy)
│   └── supplier_chart/
│       └── useAltScores.js     # Score axes + candidate hook used by Dashboard
│
├── backend/
│   ├── server.js               # Express bootstrap, MongoDB connect
│   ├── models/GdeltEvent.js    # Mongoose schema
│   └── routes/
│       ├── events.js           # /api/events/{anomalies,labels}
│       └── news.js             # /api/news/search (URL similarity)
│
├── .env                        # REACT_APP_API_URL etc.
└── package.json
```

---

## Key features

### Dashboard
- HS-code and country pickers driven by the CSV catalog.
- Anomaly detection on UIV (`detectAnomalyMonths` in `useTimeseriesData.js`).
- Historical event cards filterable by event label.
- Pre/post-event price (USD/kg) and import-volume charts with recovery metrics.
- Alternative supplier ranking (Supply / Stability / Trade / Diversify axes
  with toggleable weights, A–F grade).
- 2D world map highlighting the active country and top alternative suppliers.
- News URL → similar past events lookup via the backend.

### Deep Analysis (3D globe)
- `react-globe.gl` with country points sized by import volume.
- Curved trade-flow arcs per commodity, colored by commodity or by volatility.
- GDELT event markers with custom HTML tooltip and clickthrough.
- Region / commodity / country filters and timeline (yearly or monthly).
- Right-side detail panel with per-commodity breakdown for the selected country.

---

## Getting started

### Prerequisites
- Node.js 18+ and npm.
- A MongoDB Atlas connection string (only required for `/api/events` and
  `/api/news` endpoints).

### Install

```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

### Environment

Create a `.env` at the project root for the frontend:

```env
REACT_APP_API_URL=http://localhost:4000/api
```

Create `backend/.env` for the backend:

```env
MONGO_URI=<your MongoDB Atlas URI>
PORT=4000
```

### Run

```bash
# Backend
cd backend && npm run dev      # nodemon on PORT (default 4000)

# Frontend (new terminal)
npm start                      # CRA dev server on http://localhost:3000
```

### Build

```bash
npm run build                  # outputs /build
```

---

## Data files

Place these under `public/data/`:

| File | Used by |
| --- | --- |
| `global_threads_timeseries_uiv_2.csv` | Dashboard charts, anomaly detection |
| `global_threads_risk.csv` | Volatility coloring on the globe |
| `alternative_scores.json` | Alternative supplier rankings |

GDELT event JSONs are expected at
`public/data/gdelt_event_outputs_integrated/<YYYY>/<MM>/<YYYY-MM-DD>_<idx>.json`
for the Deep Analysis view.

---

## Scripts

```bash
npm start       # CRA dev server
npm run build   # production build
npm test        # run tests with CRA test runner
```

Backend:

```bash
npm run dev     # nodemon
npm start       # node server.js
```

---

## Tech stack

- React 19, react-scripts (CRA), D3 v7, react-globe.gl
- Express 4, Mongoose 8, MongoDB Atlas
- Pure CSS (no design framework)
