# tue-api-wrapper Python package

Python SDK, FastAPI server, and local MCP server for University of Tübingen study systems.

The package has three entry points:

- `TuebingenPublicClient`: public data that does not need credentials
- `TuebingenAuthenticatedClient`: private student data with explicit credentials or `.env`
- `tue-mcp`: local MCP server for agents and LLM tools

## Install for local development

```bash
cd package
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

Install MCP support when you want the agent server:

```bash
pip install -e ".[mcp]"
```

## Public data example

```python
from tue_api_wrapper import TuebingenPublicClient

client = TuebingenPublicClient()

modules = client.alma.search_modules("machine learning", max_results=10)
events = client.campus.events(query="AI", limit=5)
canteens = client.campus.canteens()
recordings = client.timms.search("theoretische informatik", limit=5)
```

## Authenticated data example

Use a local `.env` file:

```bash
UNI_USERNAME=your-zdv-id
UNI_PASSWORD=your-password
```

Then:

```python
from tue_api_wrapper import TuebingenAuthenticatedClient

client = TuebingenAuthenticatedClient.from_env()

timetable = client.alma.timetable("Sommer 2026")
tasks = client.ilias.tasks()
deadlines = client.moodle.deadlines(days=30)
inbox = client.mail.inbox(limit=5)
```

You can also pass credentials directly:

```python
client = TuebingenAuthenticatedClient.login(
    username="your-zdv-id",
    password="your-password",
)
```

## Local MCP server

```bash
cd package
pip install -e ".[mcp]"
tue-mcp
```

Use `stdio` for most local agent clients. For HTTP-based clients:

```bash
tue-mcp --transport streamable-http --host 127.0.0.1 --port 8765
```

## FastAPI server

```bash
tue-api-server
```

The API starts on `http://127.0.0.1:8000` and exposes OpenAPI docs at `/docs`.

## Publishing

Python packages are usually published on [PyPI](https://pypi.org/), the Python package registry. This repository is not published there yet. Until then, install from a local checkout or directly from GitHub:

```bash
pip install "tue-api-wrapper @ git+https://github.com/SebastianBoehler/tue-api-wrapper.git#subdirectory=package"
```

MCP extras from GitHub:

```bash
pip install "tue-api-wrapper[mcp] @ git+https://github.com/SebastianBoehler/tue-api-wrapper.git#subdirectory=package"
```

Publishing to PyPI later will require a PyPI account or trusted publishing setup. Do not publish from an agent without a deliberate release checklist.

## More docs

- [`../docs/python-sdk.md`](../docs/python-sdk.md)
- [`../docs/mcp.md`](../docs/mcp.md)
- [`../docs/release-pypi.md`](../docs/release-pypi.md)
- [`../examples/`](../examples/)
- [`../README.md`](../README.md)
