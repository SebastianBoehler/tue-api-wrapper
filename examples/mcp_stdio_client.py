from __future__ import annotations

import asyncio
import os
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_DIR = ROOT / "package"


async def main() -> None:
    server = StdioServerParameters(
        command="python",
        args=["-m", "tue_api_wrapper.mcp_server", "--env-file", str(PACKAGE_DIR / ".env")],
        cwd=PACKAGE_DIR,
        env={**os.environ, "PYTHONPATH": str(PACKAGE_DIR / "src")},
    )

    async with stdio_client(server) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("Available tools:")
            for tool in tools.tools:
                print(f"- {tool.name}")

            result = await session.call_tool(
                "public_alma_search_modules",
                {"query": "machine learning", "max_results": 3},
            )
            print("\nSearch result:")
            print(result.content)


if __name__ == "__main__":
    asyncio.run(main())
