package ilias

import (
	"net/url"
	"strings"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/dom"
	"golang.org/x/net/html"
)

func childElementsByTag(node *html.Node, tag string) []*html.Node {
	var children []*html.Node
	for _, child := range dom.ElementChildren(node) {
		if dom.IsElement(child, tag) {
			children = append(children, child)
		}
	}
	return children
}

func hasBreadcrumbAncestor(node *html.Node) bool {
	for parent := node.Parent; parent != nil; parent = parent.Parent {
		if dom.IsElement(parent, "ol") && dom.HasClass(parent, "breadcrumb") {
			return true
		}
	}
	return false
}

func hasTableNavAncestor(node *html.Node) bool {
	for parent := node.Parent; parent != nil; parent = parent.Parent {
		if dom.IsElement(parent, "div") && dom.HasClass(parent, "ilTableNav") {
			return true
		}
	}
	return false
}

func findActionURL(node *html.Node, pageURL, marker string) *string {
	link := dom.FindFirst(node, func(node *html.Node) bool {
		if !dom.IsElement(node, "a") {
			return false
		}
		href, ok := dom.Attr(node, "href")
		return ok && strings.Contains(href, marker)
	})
	return hrefPtr(link, pageURL)
}

func hrefPtr(node *html.Node, pageURL string) *string {
	if node == nil {
		return nil
	}
	href, ok := dom.Attr(node, "href")
	if !ok || href == "" {
		return nil
	}
	return stringPtr(resolveURL(pageURL, href))
}

func parseItemType(favoriteURL *string) *string {
	if favoriteURL == nil {
		return nil
	}
	parsed, err := url.Parse(*favoriteURL)
	if err != nil {
		return nil
	}
	value := parsed.Query().Get("type")
	if value == "" {
		return nil
	}
	return stringPtr(value)
}

func hasAttr(node *html.Node, key string) bool {
	_, ok := dom.Attr(node, key)
	return ok
}

func stringPtr(value string) *string {
	return &value
}
