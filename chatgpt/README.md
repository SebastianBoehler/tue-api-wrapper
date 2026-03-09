# ChatGPT App

This folder contains a ChatGPT Apps SDK scaffold for the unified Alma + ILIAS study hub.

## Tool surface

- `search`: standard read-only search for unified portal items
- `fetch`: standard read-only fetch by item id
- `show_dashboard`: widget-backed study overview
- `list_documents`: widget-backed Alma study-service document list

The widget uses the MCP Apps bridge for tool-result updates and only falls back to `window.openai.sendFollowUpMessage(...)` for optional follow-up messaging.

## Development

```bash
npm install
npm run build
npm run dev
```

The server listens on `http://localhost:8080/mcp` by default.

Set `PORTAL_API_BASE_URL` to point at the Python backend in `../package` if you want live Alma / ILIAS data. Otherwise the app uses bundled mock data.

## Cloud Run

Build the container:

```bash
docker build -t gcr.io/PROJECT_ID/tue-study-hub-chatgpt .
```

Deploy the container:

```bash
gcloud run deploy tue-study-hub-chatgpt \
  --image gcr.io/PROJECT_ID/tue-study-hub-chatgpt \
  --region europe-west3 \
  --allow-unauthenticated \
  --set-env-vars PORTAL_API_BASE_URL=https://your-backend.example.com
```

Or build and push it through Cloud Build first:

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions _IMAGE=gcr.io/PROJECT_ID/tue-study-hub-chatgpt
```
