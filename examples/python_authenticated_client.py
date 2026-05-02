from __future__ import annotations

from pathlib import Path

from tue_api_wrapper import TuebingenAuthenticatedClient


def main() -> None:
    env_file = Path(__file__).resolve().parents[1] / "package" / ".env"
    client = TuebingenAuthenticatedClient.from_env(env_file)

    try:
        print("ILIAS tasks:")
        print(client.ilias.tasks())
        print("\nMoodle deadlines:")
        print(client.moodle.deadlines(days=30, limit=10))
    finally:
        client.close()


if __name__ == "__main__":
    main()
