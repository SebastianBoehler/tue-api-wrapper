from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_portal_messages_client import fetch_portal_messages_feed, refresh_portal_messages_feed
from tue_api_wrapper.client import AlmaClient


START_PAGE_HTML = """
<form id="startPage" action="/alma/pages/cs/sys/portal/hisinoneStartPage.faces">
  <input type="hidden" name="activePageElementId" value="startPage:portletInstanceId_1013310:hisinoneFunction:load" />
  <input type="hidden" name="refreshButtonClickedId" value="" />
  <input type="hidden" name="authenticity_token" value="token-1" />
  <input type="hidden" name="startPage_SUBMIT" value="1" />
  <input type="hidden" name="javax.faces.ViewState" value="view-1" />
  <div id="startPage:messages-infobox"></div>
  <div id="startPage:portletInstanceId_1013311:portalMessagesContainer">
    <button
      id="startPage:portletInstanceId_1013311:configurePortalMessages"
      name="startPage:portletInstanceId_1013311:configurePortalMessages"
      type="submit"
      value="Meine Kommunikationskanäle"
    >
      <span>Meine Kommunikationskanäle</span>
    </button>
  </div>
</form>
"""

SETTINGS_PARTIAL_RESPONSE = """<?xml version="1.0" encoding="UTF-8"?>
<partial-response id="j_id__v_7">
  <changes>
    <update id="startPage:portletInstanceId_1013311:portalMessagesContainer"><![CDATA[
      <div id="startPage:portletInstanceId_1013311:portalMessagesContainer">
        <div class="portalMessagesSettings">
          <h2>Feed</h2>
          <a href="/alma/pages/cs/sys/portal/feed/portalMessagesFeed.faces?user=user-1&amp;hash=hash-old" class="link_feed">Als Feed abonnieren</a>
          <button
            id="startPage:portletInstanceId_1013311:renewSecurityToken"
            name="startPage:portletInstanceId_1013311:renewSecurityToken"
            type="submit"
            value="Feed-Sicherheitsmaßnahmen erneuern"
          >
            <span>Feed-Sicherheitsmaßnahmen erneuern</span>
          </button>
        </div>
      </div>
    ]]></update>
    <update id="j_id__v_7:javax.faces.ViewState:1"><![CDATA[view-2]]></update>
  </changes>
</partial-response>
"""

REFRESHED_SETTINGS_PARTIAL_RESPONSE = SETTINGS_PARTIAL_RESPONSE.replace("hash-old", "hash-new").replace("view-2", "view-3")


class _FakeResponse:
    def __init__(self, *, url: str, text: str = "", status_code: int = 200) -> None:
        self.url = url
        self._text = text
        self.status_code = status_code
        self.headers = {"content-type": "text/html; charset=utf-8"}

    @property
    def text(self) -> str:
        return self._text

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise AssertionError(f"Unexpected HTTP status {self.status_code} for {self.url}")


class _RecordingSession:
    def __init__(self, *, get_responses: list[_FakeResponse], post_responses: list[_FakeResponse]) -> None:
        self._get_responses = list(get_responses)
        self._post_responses = list(post_responses)
        self.headers: dict[str, str] = {}
        self.posts: list[tuple[str, dict[str, str]]] = []

    def get(self, url: str, timeout: int, allow_redirects: bool = True) -> _FakeResponse:
        if not self._get_responses:
            raise AssertionError(f"No fake GET response left for {url}")
        return self._get_responses.pop(0)

    def post(self, url: str, data: dict[str, str], timeout: int, allow_redirects: bool = True) -> _FakeResponse:
        self.posts.append((url, dict(data)))
        if not self._post_responses:
            raise AssertionError(f"No fake POST response left for {url}")
        return self._post_responses.pop(0)


class _FakeAlmaClient(AlmaClient):
    def __init__(self, *, session: _RecordingSession) -> None:
        super().__init__(base_url="https://alma.example", session=session)


class AlmaPortalMessagesFeatureTests(unittest.TestCase):
    def test_fetch_portal_messages_feed_opens_settings_panel(self) -> None:
        session = _RecordingSession(
            get_responses=[_FakeResponse(url="https://alma.example/start", text=START_PAGE_HTML)],
            post_responses=[_FakeResponse(url="https://alma.example/start", text=SETTINGS_PARTIAL_RESPONSE)],
        )
        client = _FakeAlmaClient(session=session)

        feed = fetch_portal_messages_feed(client)

        self.assertEqual(feed.page_url, "https://alma.example/start")
        self.assertTrue(feed.can_refresh_feed)
        self.assertIn("hash-old", feed.feed_url or "")
        self.assertEqual(session.posts[0][1]["javax.faces.source"], "startPage:portletInstanceId_1013311:configurePortalMessages")
        self.assertEqual(
            session.posts[0][1]["javax.faces.partial.render"],
            "startPage:portletInstanceId_1013311:portalMessagesContainer startPage:messages-infobox",
        )
        self.assertEqual(session.posts[0][1]["startPage"], "startPage")

    def test_refresh_portal_messages_feed_posts_renew_trigger_with_updated_view_state(self) -> None:
        session = _RecordingSession(
            get_responses=[
                _FakeResponse(url="https://alma.example/start", text=START_PAGE_HTML),
                _FakeResponse(url="https://alma.example/start", text=START_PAGE_HTML),
            ],
            post_responses=[
                _FakeResponse(url="https://alma.example/start", text=SETTINGS_PARTIAL_RESPONSE),
                _FakeResponse(url="https://alma.example/start", text=START_PAGE_HTML),
                _FakeResponse(url="https://alma.example/start", text=REFRESHED_SETTINGS_PARTIAL_RESPONSE),
            ],
        )
        client = _FakeAlmaClient(session=session)

        refreshed = refresh_portal_messages_feed(client)

        self.assertIn("hash-new", refreshed.feed_url or "")
        self.assertEqual(len(session.posts), 3)
        self.assertEqual(
            session.posts[1][1]["startPage:portletInstanceId_1013311:renewSecurityToken"],
            "Feed-Sicherheitsmaßnahmen erneuern",
        )
        self.assertEqual(session.posts[1][1]["javax.faces.ViewState"], "view-2")
        self.assertEqual(session.posts[1][1]["DISABLE_VALIDATION"], "true")
        self.assertEqual(session.posts[1][1]["DISABLE_AUTOSCROLL"], "true")


if __name__ == "__main__":
    unittest.main()
