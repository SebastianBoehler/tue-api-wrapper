package dom

import (
	"strings"

	"golang.org/x/net/html"
)

func Parse(input string) (*html.Node, error) {
	return html.Parse(strings.NewReader(input))
}

func FindFirst(node *html.Node, predicate func(*html.Node) bool) *html.Node {
	if node == nil {
		return nil
	}
	if predicate(node) {
		return node
	}
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if found := FindFirst(child, predicate); found != nil {
			return found
		}
	}
	return nil
}

func FindAll(node *html.Node, predicate func(*html.Node) bool) []*html.Node {
	var results []*html.Node
	var walk func(*html.Node)
	walk = func(current *html.Node) {
		if current == nil {
			return
		}
		if predicate(current) {
			results = append(results, current)
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(node)
	return results
}

func ElementChildren(node *html.Node) []*html.Node {
	var children []*html.Node
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == html.ElementNode {
			children = append(children, child)
		}
	}
	return children
}

func Attr(node *html.Node, key string) (string, bool) {
	for _, attr := range node.Attr {
		if attr.Key == key {
			return attr.Val, true
		}
	}
	return "", false
}

func HasClass(node *html.Node, className string) bool {
	value, ok := Attr(node, "class")
	if !ok {
		return false
	}
	for _, candidate := range strings.Fields(value) {
		if candidate == className {
			return true
		}
	}
	return false
}

func Text(node *html.Node) string {
	var parts []string
	var walk func(*html.Node)
	walk = func(current *html.Node) {
		if current == nil {
			return
		}
		if current.Type == html.TextNode {
			text := NormalizeSpace(current.Data)
			if text != "" {
				parts = append(parts, text)
			}
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(node)
	return NormalizeSpace(strings.Join(parts, " "))
}

func NormalizeSpace(value string) string {
	return strings.Join(strings.Fields(value), " ")
}

func IsElement(node *html.Node, tag string) bool {
	return node != nil && node.Type == html.ElementNode && node.Data == tag
}
