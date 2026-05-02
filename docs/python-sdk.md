# Python SDK

The SDK is the easiest way to build student projects on top of University of Tübingen systems without reimplementing login flows, cookies, forms, and parsers.

## Install

From a local checkout:

```bash
cd package
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

From GitHub:

```bash
pip install "tue-api-wrapper @ git+https://github.com/SebastianBoehler/tue-api-wrapper.git#subdirectory=package"
```

## Public Client

Use `TuebingenPublicClient` for public data. It does not need credentials.

```python
from tue_api_wrapper import TuebingenPublicClient

client = TuebingenPublicClient()

modules = client.alma.search_modules("machine learning", max_results=10)
lectures = client.alma.current_lectures(date="02.05.2026", limit=20)
canteens = client.campus.canteens()
events = client.campus.events(query="KI", limit=10)
people = client.directory.search("informatik")
recordings = client.timms.search("theoretische informatik", limit=5)
```

## Authenticated Client

Use `TuebingenAuthenticatedClient` for private student data. Credentials stay in your local process.

Create a `.env` file:

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

Or pass credentials directly:

```python
client = TuebingenAuthenticatedClient.login(
    username="your-zdv-id",
    password="your-password",
)
```

## Available Namespaces

Public:

- `client.alma`: public module search, module details, current lectures
- `client.campus`: canteens, buildings, events, KuF occupancy
- `client.directory`: public university directory search
- `client.timms`: public lecture recording search and metadata

Authenticated:

- `client.alma`: timetable, course offerings, exams, enrollments, study planner, documents
- `client.ilias`: root page, memberships, tasks, content, forums, exercises, search
- `client.moodle`: dashboard, deadlines, courses, grades, messages, notifications
- `client.mail`: inbox, mailboxes, message details
- `client.public`: the same public client from authenticated projects

## Security Notes

- `.env` and `.env.*` are ignored by this repository.
- Do not commit university passwords, cookies, HAR files, downloaded PDFs, or mailbox exports.
- Prefer the public client for course projects unless private student data is essential.
- The SDK returns live data or clear errors. It does not silently use mock data.
