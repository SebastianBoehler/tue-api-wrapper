package ilias

import "testing"

func TestParseInfoPage(t *testing.T) {
	html := `
	<h1>MPC Materials</h1>
	<div><h2>Allgemein</h2></div>
	<div class="form-group row">
	  <div class="il_InfoScreenProperty control-label">Sprache</div>
	  <div class="il_InfoScreenPropertyValue">Englisch</div>
	</div>
	<div><h2>Gruppenbeitritt</h2></div>
	<div class="form-group row">
	  <div class="il_InfoScreenProperty control-label">Freie Plätze</div>
	  <div class="il_InfoScreenPropertyValue">0</div>
	</div>
	`

	page, err := parseInfoPage(html, "https://ovidius.example/info")
	if err != nil {
		t.Fatalf("parseInfoPage returned error: %v", err)
	}
	if got := page.Title; got != "MPC Materials" {
		t.Fatalf("unexpected title: %s", got)
	}
	if len(page.Sections) != 2 {
		t.Fatalf("unexpected section count: %d", len(page.Sections))
	}
	if got := page.Sections[0].Fields[0].Value; got != "Englisch" {
		t.Fatalf("unexpected field value: %s", got)
	}
}
