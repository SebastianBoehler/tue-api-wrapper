from __future__ import annotations

from tue_api_wrapper import TuebingenPublicClient


def main() -> None:
    client = TuebingenPublicClient()

    modules = client.alma.search_modules("machine learning", max_results=5)
    events = client.campus.events(query="AI", limit=3)
    recordings = client.timms.search("data science", limit=3)

    print("Alma modules:")
    print(modules)
    print("\nCampus events:")
    print(events)
    print("\nTIMMS recordings:")
    print(recordings)


if __name__ == "__main__":
    main()
