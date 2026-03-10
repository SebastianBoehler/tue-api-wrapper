# ChatGPT App

This folder contains a ChatGPT Apps SDK scaffold for the unified Alma + ILIAS study hub.

## Tool surface

- `search`: standard read-only search for unified portal items
- `fetch`: standard read-only fetch by item id
- `get_study_snapshot`: combined status for upcoming schedule, tasks, grades, and spaces
- `get_upcoming_schedule`: Alma timetable view for next lectures or meetings
- `get_current_tasks`: ILIAS derived task overview
- `get_current_grades`: Alma exam rows plus tracked credits and passed exam count
- `get_learning_spaces`: authenticated ILIAS memberships
- `get_course_catalog_filters`: valid Alma module-search filters for degree, subject, faculty, language, and element type
- `search_courses`: Alma module-description search for course discovery and next-semester planning
- `show_dashboard`: widget-backed study overview
- `list_documents`: widget-backed Alma study-service document list

The widget uses the MCP Apps bridge for tool-result updates and only falls back to `window.openai.sendFollowUpMessage(...)` for optional follow-up messaging. The data tools are designed so ChatGPT can answer questions like:

- "What are my next lectures or meetings?"
- "What tasks are due soon?"
- "What are my current grades and credits?"
- "Which learning spaces am I enrolled in?"
- "What courses fit my degree or subject next semester?"

## Development

```bash
npm install
npm run build
npm run dev
```

The server listens on `http://localhost:8080/mcp` by default.

Set `PORTAL_API_BASE_URL` to point at the Python backend in `../package`. The app is live-data only and returns explicit backend errors when that API is not reachable.

Typical local setup:

```bash
cd ../package
ALMA_USERNAME=... ALMA_PASSWORD=... ILIAS_USERNAME=... ILIAS_PASSWORD=... PORT=8001 PYTHONPATH=src python -m tue_api_wrapper.api_server

cd ../chatgpt
PORTAL_API_BASE_URL=http://127.0.0.1:8001 npm run dev
```

Health check:

```bash
curl http://localhost:8080/healthz
```

## Cloud Run

The server is already an Apps SDK / MCP server. On Cloud Run, the public connector URL is:

```text
https://YOUR_SERVICE_URL/mcp
```

Use the Cloud Run service origin itself as `APP_BASE_URL`. This keeps the widget metadata aligned with the deployed host origin, which is important for app submission and iframe loading.

Build the container manually:

```bash
docker build -t gcr.io/PROJECT_ID/tue-study-hub-chatgpt .
```

Deploy the container manually:

```bash
gcloud run deploy tue-study-hub-chatgpt \
  --image gcr.io/PROJECT_ID/tue-study-hub-chatgpt \
  --region europe-west3 \
  --allow-unauthenticated \
  --set-env-vars PORTAL_API_BASE_URL=https://your-backend.example.com
```

Then update the service so `APP_BASE_URL` matches the Cloud Run URL that was assigned:

```bash
gcloud run services update tue-study-hub-chatgpt \
  --region europe-west3 \
  --update-env-vars APP_BASE_URL=https://YOUR_SERVICE_URL
```

Or use the included helper, which builds, deploys, reads the resulting Cloud Run URL, and then writes it back into `APP_BASE_URL` automatically:

```bash
./scripts/deploy-cloud-run.sh PROJECT_ID europe-west3 \
  gcr.io/PROJECT_ID/tue-study-hub-chatgpt \
  https://your-backend.example.com
```

If you prefer declarative deployment, edit the placeholders in [cloudrun.service.yaml](/Users/sebastianboehler/Documents/GitHub/tue-api-wrapper/chatgpt/cloudrun.service.yaml) and apply it with `gcloud run services replace`.

Cloud Build is also included:

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions _IMAGE=gcr.io/PROJECT_ID/tue-study-hub-chatgpt
```

After deployment, verify:

```bash
curl https://YOUR_SERVICE_URL/healthz
curl https://YOUR_SERVICE_URL/
```

Expected endpoints:

- root: `/`
- health: `/healthz`
- MCP connector: `/mcp`
