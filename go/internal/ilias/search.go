package ilias

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/config"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/dom"
	"golang.org/x/net/html"
)

func (c *Client) Search(term string, page int) (*SearchPage, error) {
	query := strings.TrimSpace(term)
	if query == "" {
		return nil, fmt.Errorf("a non-empty ILIAS search term is required")
	}
	if page < 1 {
		page = 1
	}

	resp, body, err := c.http.Get(config.IliasSearchURL)
	if err != nil {
		return nil, err
	}
	if err := expectOK(resp); err != nil {
		return nil, err
	}

	form, err := extractSearchForm(string(body), resp.Request.URL.String())
	if err != nil {
		return nil, err
	}

	payload := cloneValues(form.Payload)
	payload.Set(form.TermField, query)
	payload.Set(form.SearchButton, "Suche")

	resp, body, err = c.http.PostForm(form.ActionURL, payload)
	if err != nil {
		return nil, err
	}
	if err := expectOK(resp); err != nil {
		return nil, err
	}

	current, err := parseSearchPage(string(body), resp.Request.URL.String(), query, 1)
	if err != nil {
		return nil, err
	}
	for current.PageNumber < page {
		if current.NextPageURL == nil {
			return nil, fmt.Errorf("ILIAS search does not expose page %d for term %q", page, query)
		}
		resp, body, err = c.http.Get(*current.NextPageURL)
		if err != nil {
			return nil, err
		}
		if err := expectOK(resp); err != nil {
			return nil, err
		}
		current, err = parseSearchPage(string(body), resp.Request.URL.String(), query, current.PageNumber+1)
		if err != nil {
			return nil, err
		}
	}

	return current, nil
}

func extractSearchForm(htmlInput, pageURL string) (*SearchForm, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}
	formNode := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "form") {
			return false
		}
		action, ok := dom.Attr(node, "action")
		return ok && strings.Contains(action, "performSearch")
	})
	if formNode == nil {
		return nil, fmt.Errorf("could not find the ILIAS search form")
	}

	payload := url.Values{}
	for _, node := range dom.FindAll(formNode, func(node *html.Node) bool {
		return dom.IsElement(node, "input") || dom.IsElement(node, "select")
	}) {
		name, ok := dom.Attr(node, "name")
		if !ok || name == "" {
			continue
		}

		if dom.IsElement(node, "select") {
			continue
		}

		fieldType, _ := dom.Attr(node, "type")
		switch fieldType {
		case "button", "file", "image", "password", "reset", "submit":
			continue
		case "checkbox", "radio":
			if hasAttr(node, "checked") {
				value, _ := dom.Attr(node, "value")
				if value == "" {
					value = "1"
				}
				payload.Set(name, value)
			}
			continue
		default:
			value, _ := dom.Attr(node, "value")
			payload.Set(name, value)
		}
	}

	searchButton := dom.FindFirst(formNode, func(node *html.Node) bool {
		if !dom.IsElement(node, "input") {
			return false
		}
		fieldType, _ := dom.Attr(node, "type")
		name, _ := dom.Attr(node, "name")
		return fieldType == "submit" && name == "cmd[performSearch]"
	})
	if searchButton == nil {
		return nil, fmt.Errorf("could not identify the ILIAS search submit button")
	}

	action, _ := dom.Attr(formNode, "action")
	return &SearchForm{
		ActionURL:    resolveURL(pageURL, action),
		Payload:      payload,
		TermField:    "term",
		SearchButton: "cmd[performSearch]",
	}, nil
}

func parseSearchPage(htmlInput, pageURL, query string, pageNumber int) (*SearchPage, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}

	table := dom.FindFirst(root, func(node *html.Node) bool {
		return dom.IsElement(node, "table") && dom.HasClass(node, "table") &&
			dom.HasClass(node, "table-striped") && dom.HasClass(node, "fullwidth")
	})

	results := []SearchResult{}
	if table != nil {
		for _, row := range dom.FindAll(table, func(node *html.Node) bool { return dom.IsElement(node, "tr") }) {
			cells := childElementsByTag(row, "td")
			if len(cells) < 3 {
				continue
			}

			container := dom.FindFirst(cells[1], func(node *html.Node) bool {
				return dom.IsElement(node, "div") && dom.HasClass(node, "il_ContainerListItem")
			})
			if container == nil {
				continue
			}

			titleLink := dom.FindFirst(container, func(node *html.Node) bool {
				if !dom.IsElement(node, "a") || !dom.HasClass(node, "il_ContainerItemTitle") {
					return false
				}
				href, ok := dom.Attr(node, "href")
				return ok && href != ""
			})
			titleNode := titleLink
			if titleNode == nil {
				titleNode = dom.FindFirst(container, func(node *html.Node) bool {
					return dom.IsElement(node, "h3") && dom.HasClass(node, "il_ContainerItemTitle")
				})
			}
			if titleNode == nil {
				continue
			}

			var description *string
			descriptionNode := dom.FindFirst(container, func(node *html.Node) bool {
				return dom.IsElement(node, "div") && dom.HasClass(node, "il_Description")
			})
			if descriptionNode != nil {
				description = stringPtr(dom.Text(descriptionNode))
			}

			breadcrumbs := []string{}
			for _, link := range dom.FindAll(container, func(node *html.Node) bool {
				return dom.IsElement(node, "a") && hasBreadcrumbAncestor(node)
			}) {
				label := dom.Text(link)
				if label != "" {
					breadcrumbs = append(breadcrumbs, label)
				}
			}

			var properties []string
			for _, property := range dom.FindAll(container, func(node *html.Node) bool {
				return dom.IsElement(node, "span") &&
					(dom.HasClass(node, "il_ItemAlertProperty") || dom.HasClass(node, "il_ItemProperty"))
			}) {
				value := dom.Text(property)
				if value != "" {
					properties = append(properties, value)
				}
			}

			infoURL := findActionURL(row, pageURL, "cmd=infoScreen")
			favoriteURL := findActionURL(row, pageURL, "cmd=addToDesk")
			itemType := parseItemType(favoriteURL)
			title := dom.Text(titleNode)
			titleURL := hrefPtr(titleLink, pageURL)

			results = append(results, SearchResult{
				Title:             title,
				URL:               titleURL,
				Description:       description,
				InfoURL:           infoURL,
				AddToFavoritesURL: favoriteURL,
				Breadcrumbs:       breadcrumbs,
				Properties:        properties,
				ItemType:          itemType,
			})
		}
	}

	if table == nil && !strings.Contains(htmlInput, "Suchergebnisse") && !strings.Contains(htmlInput, "ILIAS Universität Tübingen") {
		return nil, fmt.Errorf("the response did not look like an authenticated ILIAS search page")
	}

	var previousPageURL *string
	var nextPageURL *string
	for _, link := range dom.FindAll(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "a") {
			return false
		}
		href, ok := dom.Attr(node, "href")
		return ok && href != "" && hasTableNavAncestor(node)
	}) {
		label := strings.ToLower(dom.Text(link))
		switch label {
		case "zurück":
			previousPageURL = hrefPtr(link, pageURL)
		case "weiter":
			nextPageURL = hrefPtr(link, pageURL)
		}
	}

	return &SearchPage{
		PageURL:         pageURL,
		Query:           query,
		PageNumber:      pageNumber,
		PreviousPageURL: previousPageURL,
		NextPageURL:     nextPageURL,
		Results:         results,
	}, nil
}
