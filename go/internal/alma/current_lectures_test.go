package alma

import "testing"

func TestExtractCurrentLecturesFormDefaultsAllCoursesFilter(t *testing.T) {
	html := `
	<form id="showEventsAndExaminationsOnDateForm" action="/alma/currentLectures">
	  <input type="hidden" name="javax.faces.ViewState" value="e1s1" />
	  <input type="text" name="showEventsAndExaminationsOnDateForm:tabContainer:date-selection-container:date" value="14.03.2026" />
	  <input type="checkbox" name="showEventsAndExaminationsOnDateForm:tabContainer:filter-container:selectCheckbox" value="selectAllCourses" />
	  <input type="checkbox" name="showEventsAndExaminationsOnDateForm:tabContainer:filter-container:selectCheckbox" value="selectChangedCourses" />
	  <button type="submit" name="showEventsAndExaminationsOnDateForm:searchButtonId">Suchen</button>
	</form>
	`

	form, err := extractCurrentLecturesForm(html, "https://alma.example/current")
	if err != nil {
		t.Fatalf("extractCurrentLecturesForm returned error: %v", err)
	}

	if got := form.DateFieldName; got != "showEventsAndExaminationsOnDateForm:tabContainer:date-selection-container:date" {
		t.Fatalf("unexpected date field: %s", got)
	}
	if got := form.SearchButton; got != "showEventsAndExaminationsOnDateForm:searchButtonId" {
		t.Fatalf("unexpected search button: %s", got)
	}
	if got := form.FilterFieldName; got != "showEventsAndExaminationsOnDateForm:tabContainer:filter-container:selectCheckbox" {
		t.Fatalf("unexpected filter field: %s", got)
	}
	if len(form.FilterValues) != 1 || form.FilterValues[0] != "selectAllCourses" {
		t.Fatalf("unexpected filter values: %#v", form.FilterValues)
	}
}

func TestParseCurrentLecturesPage(t *testing.T) {
	html := `
	<input type="text" name="showEventsAndExaminationsOnDateForm:tabContainer:date-selection-container:date" value="14.03.2026" />
	<table id="showEventsAndExaminationsOnDateForm:tabContainer:term-planning-container:coursesAndExaminationsOnDateListTable:coursesAndExaminationsOnDateListTableTable" class="tableWithSelect table">
	  <tr><th>Aktion</th><th>Titel</th></tr>
	  <tr>
	    <td><a href="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;unitId=42&amp;periodId=236">Details</a></td>
	    <td><a href="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;unitId=42&amp;periodId=236">Computer Graphics</a></td>
	    <td>09:00</td>
	    <td>11:00</td>
	    <td>INF-4201</td>
	    <td>1. PG</td>
	    <td>Vorlesung</td>
	    <td>Prof. Lensch</td>
	    <td>Prof. Lensch</td>
	    <td>Sand 14</td>
	    <td>A301</td>
	    <td>Sommersemester 2026</td>
	    <td>mit Übung</td>
	    <td></td>
	  </tr>
	</table>
	`

	page, err := parseCurrentLecturesPage(html, "https://alma.example/current")
	if err != nil {
		t.Fatalf("parseCurrentLecturesPage returned error: %v", err)
	}

	if page.SelectedDate == nil || *page.SelectedDate != "14.03.2026" {
		t.Fatalf("unexpected selected date: %#v", page.SelectedDate)
	}
	if len(page.Results) != 1 {
		t.Fatalf("unexpected result count: %d", len(page.Results))
	}
	if got := page.Results[0].Title; got != "Computer Graphics" {
		t.Fatalf("unexpected title: %s", got)
	}
	if page.Results[0].DetailURL == nil || *page.Results[0].DetailURL != "https://alma.example/alma/pages/startFlow.xhtml?_flowId=detailView-flow&unitId=42&periodId=236" {
		t.Fatalf("unexpected detail URL: %#v", page.Results[0].DetailURL)
	}
}
