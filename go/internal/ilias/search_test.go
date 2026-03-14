package ilias

import "testing"

func TestExtractSearchForm(t *testing.T) {
	html := `
	<form action="/ilias.php?baseClass=ilsearchcontrollergui&amp;cmd=post&amp;fallbackCmd=performSearch&amp;rtoken=abc" method="post">
	  <input type="text" name="term" value="" />
	  <input type="radio" name="type" value="1" checked="checked" />
	  <input type="submit" name="cmd[performSearch]" value="Suche" />
	</form>
	`

	form, err := extractSearchForm(html, "https://ovidius.example/ilias.php?baseClass=ilSearchControllerGUI")
	if err != nil {
		t.Fatalf("extractSearchForm returned error: %v", err)
	}
	if got := form.SearchButton; got != "cmd[performSearch]" {
		t.Fatalf("unexpected search button: %s", got)
	}
	if got := form.Payload.Get("type"); got != "1" {
		t.Fatalf("unexpected radio payload: %s", got)
	}
}

func TestParseSearchPage(t *testing.T) {
	html := `
	<div class="ilTableNav">
	  <a href="/ilias.php?page_number=2">weiter</a>
	</div>
	<table class="table table-striped fullwidth">
	  <tr><th>Typ</th><th>Titel / Beschreibung</th><th>Aktionen</th></tr>
	  <tr>
	    <td></td>
	    <td>
	      <div class="il_ContainerListItem">
	        <div class="il_ContainerItemTitle form-inline">
	          <h3 class="il_ContainerItemTitle"><a class="il_ContainerItemTitle" href="/goto.php/cat/42">Computer Graphics</a></h3>
	        </div>
	        <div class="ilListItemSection il_Description">Group homepage</div>
	        <div class="ilListItemSection il_ItemProperties">
	          <span class="il_ItemProperty">Status: Online</span>
	        </div>
	        <div class="il_ItemProperties">
	          <ol class="breadcrumb hidden-print">
	            <li><a href="/goto.php/root/1">Veranstaltungen (Magazin)</a></li>
	            <li><a href="/goto.php/cat/9">Sommersemester 2026</a></li>
	          </ol>
	        </div>
	      </div>
	    </td>
	    <td>
	      <a href="/ilias.php?baseClass=ilrepositorygui&amp;cmd=infoScreen&amp;ref_id=42">Info</a>
	      <a href="/ilias.php?cmd=addToDesk&amp;item_ref_id=42&amp;type=cat">Zu Favoriten hinzufügen</a>
	    </td>
	  </tr>
	</table>
	`

	page, err := parseSearchPage(html, "https://ovidius.example/ilias.php", "graphics", 1)
	if err != nil {
		t.Fatalf("parseSearchPage returned error: %v", err)
	}
	if page.NextPageURL == nil || *page.NextPageURL != "https://ovidius.example/ilias.php?page_number=2" {
		t.Fatalf("unexpected next page URL: %#v", page.NextPageURL)
	}
	if len(page.Results) != 1 {
		t.Fatalf("unexpected result count: %d", len(page.Results))
	}
	if got := page.Results[0].Title; got != "Computer Graphics" {
		t.Fatalf("unexpected title: %s", got)
	}
	if page.Results[0].ItemType == nil || *page.Results[0].ItemType != "cat" {
		t.Fatalf("unexpected item type: %#v", page.Results[0].ItemType)
	}
}
