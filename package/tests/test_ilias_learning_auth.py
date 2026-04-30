from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.ilias_learning_html import parse_membership_overview, parse_task_overview


AUTHENTICATED_EMPTY_PAGE = """
<html>
  <head><title>ILIAS</title></head>
  <body>
    <ul class="il-mainbar-entries"></ul>
    <a href="logout.php?baseClass=ilstartupgui">Abmelden</a>
  </body>
</html>
"""


class IliasLearningAuthTests(unittest.TestCase):
    def test_empty_authenticated_membership_overview_returns_no_items(self) -> None:
        items = parse_membership_overview(
            AUTHENTICATED_EMPTY_PAGE,
            "https://ovidius.uni-tuebingen.de/ilias3/ilias.php?baseClass=ilmembershipoverviewgui",
        )

        self.assertEqual(items, ())

    def test_empty_authenticated_task_overview_returns_no_items(self) -> None:
        items = parse_task_overview(
            AUTHENTICATED_EMPTY_PAGE,
            "https://ovidius.uni-tuebingen.de/ilias3/ilias.php?baseClass=ilderivedtasksgui",
        )

        self.assertEqual(items, ())


if __name__ == "__main__":
    unittest.main()
