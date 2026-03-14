package ilias

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/dom"
	"golang.org/x/net/html"
)

func (c *Client) FetchInfo(target string) (*InfoPage, error) {
	infoURL, err := normalizeInfoTarget(target)
	if err != nil {
		return nil, err
	}

	resp, body, err := c.http.Get(infoURL)
	if err != nil {
		return nil, err
	}
	if err := expectOK(resp); err != nil {
		return nil, err
	}
	return parseInfoPage(string(body), resp.Request.URL.String())
}

func normalizeInfoTarget(target string) (string, error) {
	value := strings.TrimSpace(target)
	if value == "" {
		return "", fmt.Errorf("a non-empty ILIAS info target is required")
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value, nil
	}
	if strings.Contains(value, "cmd=infoScreen") {
		return resolveURL("https://ovidius.uni-tuebingen.de/", strings.TrimLeft(value, "/")), nil
	}

	matcher := regexp.MustCompile(`(\d+)(?:/)?$`)
	matches := matcher.FindStringSubmatch(value)
	if len(matches) < 2 {
		return "", fmt.Errorf("ILIAS info targets must be a full info URL or expose a numeric ref_id")
	}

	return "https://ovidius.uni-tuebingen.de/ilias.php?baseClass=ilrepositorygui&cmd=infoScreen&ref_id=" + url.QueryEscape(matches[1]), nil
}

func parseInfoPage(htmlInput, pageURL string) (*InfoPage, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}

	title := "ILIAS Info"
	if heading := dom.FindFirst(root, func(node *html.Node) bool { return dom.IsElement(node, "h1") }); heading != nil {
		title = dom.Text(heading)
	} else if titleNode := dom.FindFirst(root, func(node *html.Node) bool { return dom.IsElement(node, "title") }); titleNode != nil {
		title = dom.Text(titleNode)
	}

	var sections []InfoSection
	for _, heading := range dom.FindAll(root, func(node *html.Node) bool { return dom.IsElement(node, "h2") }) {
		sectionTitle := dom.Text(heading)
		if sectionTitle == "" {
			continue
		}

		var fields []InfoField
		container := heading.Parent
		for sibling := nextElementSibling(container); sibling != nil; sibling = nextElementSibling(sibling) {
			if dom.FindFirst(sibling, func(node *html.Node) bool { return dom.IsElement(node, "h2") }) != nil {
				break
			}
			if !(dom.HasClass(sibling, "form-group") && dom.HasClass(sibling, "row")) {
				continue
			}

			children := dom.ElementChildren(sibling)
			if len(children) == 0 {
				continue
			}

			var label *string
			labelText := dom.Text(children[0])
			if labelText != "" {
				label = stringPtr(labelText)
			}
			valueText := dom.Text(children[len(children)-1])
			if valueText == "" {
				continue
			}
			fields = append(fields, InfoField{Label: label, Value: valueText})
		}

		if len(fields) > 0 {
			sections = append(sections, InfoSection{Title: sectionTitle, Fields: fields})
		}
	}

	if len(sections) == 0 && !strings.Contains(htmlInput, "ILIAS Universität Tübingen") {
		return nil, fmt.Errorf("the response did not look like an authenticated ILIAS info page")
	}

	return &InfoPage{
		Title:    title,
		PageURL:  pageURL,
		Sections: sections,
	}, nil
}

func nextElementSibling(node *html.Node) *html.Node {
	if node == nil {
		return nil
	}
	for sibling := node.NextSibling; sibling != nil; sibling = sibling.NextSibling {
		if sibling.Type == html.ElementNode {
			return sibling
		}
	}
	return nil
}
