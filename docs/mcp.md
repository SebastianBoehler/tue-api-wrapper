# Local MCP Server

The package includes a local MCP server so agents can call University of Tübingen tools without every project writing its own server.

## Install

```bash
cd package
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[mcp]"
```

## Credentials

Public tools do not need credentials.

Authenticated tools read credentials from environment variables or a local `.env` file:

```bash
UNI_USERNAME=your-zdv-id
UNI_PASSWORD=your-password
```

Optional mail-only overrides:

```bash
MAIL_USERNAME=your-mail-login
MAIL_PASSWORD=your-mail-password
```

## Run With Stdio

Most local MCP clients use stdio:

```bash
tue-mcp
```

Example MCP client command:

```json
{
  "mcpServers": {
    "tue-api-wrapper": {
      "command": "tue-mcp"
    }
  }
}
```

If the command is not on your PATH, use the full path to the virtualenv executable, for example `package/.venv/bin/tue-mcp`.

## Run With HTTP

For HTTP-based tools:

```bash
tue-mcp --transport streamable-http --host 127.0.0.1 --port 8765
```

The MCP endpoint is:

```text
http://127.0.0.1:8765/mcp
```

## Tool Groups

Public tools:

- `public_alma_search_modules`
- `public_alma_current_lectures`
- `public_campus_events`
- `public_campus_canteens`
- `public_timms_search`

Authenticated tools:

- `authenticated_alma_timetable`
- `authenticated_ilias_tasks`
- `authenticated_moodle_deadlines`
- `authenticated_mail_inbox`

## Design Notes

This MCP server is intended for local student projects and agent experiments. It keeps university credentials in the local process and does not provide multi-user hosted authentication. For a public hosted ChatGPT app, prefer public tools or add a real account-linking design first.
