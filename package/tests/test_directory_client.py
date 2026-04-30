from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.directory_client import parse_directory_response


class DirectoryClientParsingTests(unittest.TestCase):
    def test_people_result_page_preserves_form_actions(self) -> None:
        html = """
        <html><body><div id="content">
          <h1>Personen</h1>
          <form action="./SearchResultPersons.aspx">
            <input type="hidden" name="__VIEWSTATE" value="state" />
            <input type="hidden" name="__EVENTTARGET" value="" />
            <input type="hidden" name="__EVENTARGUMENT" value="" />
          </form>
          <h2>Informatik</h2>
          <ul>
            <li><a href="javascript:__doPostBack('ctl00$MainContent$ctl01','')">Ada Lovelace</a><span>(Chair)</span></li>
          </ul>
        </div></body></html>
        """

        response = parse_directory_response(
            html,
            query="Ada",
            page_url="https://epv-welt.uni-tuebingen.de/RestrictedPages/SearchResultPersons.aspx",
        )

        self.assertEqual(response.outcome, "people")
        self.assertEqual(response.form.action_url, "https://epv-welt.uni-tuebingen.de/RestrictedPages/SearchResultPersons.aspx")
        self.assertEqual(response.sections[0].items[0].action.target, "ctl00$MainContent$ctl01")

    def test_person_page_extracts_mail_image_as_at_sign(self) -> None:
        html = """
        <html><body><div id="content">
          <h1>Ada Lovelace</h1>
          <h3>Mathematics</h3>
          <table><tr><td>Status:</td><td>Professor</td></tr></table>
          <div class="cp_title"><span>Contact</span></div>
          <div class="cp_content">
            <table>
              <tr><td>E-Mail:</td><td>ada<img alt="At" />uni-tuebingen.de</td></tr>
              <tr><td>Web:</td><td>https://example.test</td></tr>
            </table>
          </div>
        </div></body></html>
        """

        response = parse_directory_response(
            html,
            query="Ada",
            page_url="https://epv-welt.uni-tuebingen.de/RestrictedPages/SinglePerson.aspx",
        )

        self.assertEqual(response.outcome, "person")
        self.assertEqual(response.person.name, "Ada Lovelace")
        self.assertEqual(response.person.contact_sections[0].fields[0].value, "ada@uni-tuebingen.de")


if __name__ == "__main__":
    unittest.main()
