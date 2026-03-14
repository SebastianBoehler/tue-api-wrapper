package alma

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/config"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/dom"
	"golang.org/x/net/html"
)

func (c *Client) FetchCurrentLectures(date string, limit int) (*CurrentLecturesPage, error) {
	resp, body, err := c.http.Get(config.AlmaCurrentLectures)
	if err != nil {
		return nil, err
	}
	if err := expectOK(resp); err != nil {
		return nil, err
	}

	if strings.TrimSpace(date) != "" {
		form, err := extractCurrentLecturesForm(string(body), resp.Request.URL.String())
		if err != nil {
			return nil, err
		}
		payload := cloneValues(form.Payload)
		payload.Set(form.DateFieldName, date)
		if form.FilterFieldName != "" {
			payload.Del(form.FilterFieldName)
			for _, value := range form.FilterValues {
				payload.Add(form.FilterFieldName, value)
			}
		}
		payload.Set("activePageElementId", form.SearchButton)
		payload.Set(form.SearchButton, "Suchen")

		resp, body, err = c.http.PostForm(form.ActionURL, payload)
		if err != nil {
			return nil, err
		}
		if err := expectOK(resp); err != nil {
			return nil, err
		}
	}

	page, err := parseCurrentLecturesPage(string(body), resp.Request.URL.String())
	if err != nil {
		return nil, err
	}
	if limit > 0 && len(page.Results) > limit {
		page.Results = page.Results[:limit]
	}
	return page, nil
}

func extractCurrentLecturesForm(htmlInput, pageURL string) (*CurrentLecturesForm, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}
	formNode := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "form") {
			return false
		}
		id, ok := dom.Attr(node, "id")
		return ok && id == "showEventsAndExaminationsOnDateForm"
	})
	if formNode == nil {
		return nil, fmt.Errorf("could not find the Alma current-lectures form")
	}

	payload := url.Values{}
	var dateFieldName string
	var searchButton string
	var filterFieldName string
	var filterValues []string
	var allFilterValues []string

	for _, node := range dom.FindAll(formNode, func(node *html.Node) bool {
		return dom.IsElement(node, "input") || dom.IsElement(node, "select") || dom.IsElement(node, "button")
	}) {
		name, ok := dom.Attr(node, "name")
		if !ok || name == "" {
			continue
		}

		if dom.IsElement(node, "button") {
			if strings.HasSuffix(name, ":searchButtonId") {
				searchButton = name
			}
			continue
		}

		if dom.IsElement(node, "select") {
			continue
		}

		fieldType, _ := dom.Attr(node, "type")
		value, _ := dom.Attr(node, "value")
		switch fieldType {
		case "button", "file", "image", "password", "radio", "reset", "submit":
			continue
		case "checkbox":
			filterFieldName = name
			allFilterValues = append(allFilterValues, value)
			if hasAttr(node, "checked") {
				filterValues = append(filterValues, value)
			}
			continue
		default:
			payload.Set(name, value)
		}

		if strings.HasSuffix(name, ":date") {
			dateFieldName = name
		}
	}

	if dateFieldName == "" {
		return nil, fmt.Errorf("could not identify the Alma current-lectures date field")
	}
	if searchButton == "" {
		return nil, fmt.Errorf("could not identify the Alma current-lectures search button")
	}
	if len(filterValues) == 0 {
		for _, value := range allFilterValues {
			if value == "selectAllCourses" {
				filterValues = []string{"selectAllCourses"}
				break
			}
		}
	}

	action, _ := dom.Attr(formNode, "action")
	return &CurrentLecturesForm{
		ActionURL:       resolveURL(pageURL, action),
		Payload:         payload,
		DateFieldName:   dateFieldName,
		SearchButton:    searchButton,
		FilterFieldName: filterFieldName,
		FilterValues:    filterValues,
	}, nil
}

func parseCurrentLecturesPage(htmlInput, pageURL string) (*CurrentLecturesPage, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}

	var selectedDate *string
	dateInput := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "input") {
			return false
		}
		name, ok := dom.Attr(node, "name")
		return ok && strings.HasSuffix(name, ":date")
	})
	if dateInput != nil {
		value, _ := dom.Attr(dateInput, "value")
		value = strings.TrimSpace(value)
		if value != "" {
			selectedDate = stringPtr(value)
		}
	}

	table := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "table") {
			return false
		}
		id, ok := dom.Attr(node, "id")
		return ok && strings.HasSuffix(id, "coursesAndExaminationsOnDateListTableTable")
	})

	var results []CurrentLecture
	if table != nil {
		for _, row := range dom.FindAll(table, func(node *html.Node) bool { return dom.IsElement(node, "tr") }) {
			cells := findChildren(row, "td")
			if len(cells) < 13 {
				continue
			}

			values := make([]*string, 0, len(cells))
			for _, cell := range cells {
				text := dom.Text(cell)
				if text == "" {
					values = append(values, nil)
					continue
				}
				values = append(values, stringPtr(text))
			}

			detailURL := firstHref(cells[0], pageURL)
			titleURL := firstHref(cells[1], pageURL)
			if titleURL != nil {
				detailURL = titleURL
			}

			results = append(results, CurrentLecture{
				Title:               valueOr(values, 1, "-"),
				DetailURL:           detailURL,
				Start:               valueAt(values, 2),
				End:                 valueAt(values, 3),
				Number:              valueAt(values, 4),
				ParallelGroup:       valueAt(values, 5),
				EventType:           valueAt(values, 6),
				ResponsibleLecturer: valueAt(values, 7),
				Lecturer:            valueAt(values, 8),
				Building:            valueAt(values, 9),
				Room:                valueAt(values, 10),
				Semester:            valueAt(values, 11),
				Remark:              valueAt(values, 12),
			})
		}
	}

	if table == nil && !strings.Contains(htmlInput, "Tagesaktuelle Veranstaltungen anzeigen") {
		return nil, fmt.Errorf("the response did not look like an Alma current-lectures page")
	}

	return &CurrentLecturesPage{
		PageURL:      pageURL,
		SelectedDate: selectedDate,
		Results:      results,
	}, nil
}

func findChildren(node *html.Node, tag string) []*html.Node {
	var children []*html.Node
	for _, child := range dom.ElementChildren(node) {
		if dom.IsElement(child, tag) {
			children = append(children, child)
		}
	}
	return children
}

func firstHref(node *html.Node, pageURL string) *string {
	link := dom.FindFirst(node, func(node *html.Node) bool {
		if !dom.IsElement(node, "a") {
			return false
		}
		href, ok := dom.Attr(node, "href")
		return ok && href != ""
	})
	if link == nil {
		return nil
	}
	href, _ := dom.Attr(link, "href")
	return stringPtr(resolveURL(pageURL, href))
}

func hasAttr(node *html.Node, key string) bool {
	_, ok := dom.Attr(node, key)
	return ok
}

func valueAt(values []*string, index int) *string {
	if index < len(values) {
		return values[index]
	}
	return nil
}

func valueOr(values []*string, index int, fallback string) string {
	value := valueAt(values, index)
	if value == nil || *value == "" {
		return fallback
	}
	return *value
}

func stringPtr(value string) *string {
	return &value
}
