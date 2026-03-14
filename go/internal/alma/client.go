package alma

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/config"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/dom"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/httpx"
	"golang.org/x/net/html"
)

type Client struct {
	baseURL string
	http    *httpx.Client
}

func NewClient(timeout time.Duration) (*Client, error) {
	httpClient, err := httpx.New(timeout)
	if err != nil {
		return nil, err
	}
	return &Client{baseURL: config.AlmaBaseURL, http: httpClient}, nil
}

func (c *Client) Login(username, password string) error {
	resp, body, err := c.http.Get(config.AlmaStartPageURL)
	if err != nil {
		return err
	}
	if err := expectOK(resp); err != nil {
		return err
	}

	form, err := extractLoginForm(string(body), resp.Request.URL.String())
	if err != nil {
		return err
	}

	payload := cloneValues(form.Payload)
	payload.Set("asdf", username)
	payload.Set("fdsa", password)
	payload.Set("submit", "")

	resp, body, err = c.http.PostForm(form.ActionURL, payload)
	if err != nil {
		return err
	}
	if err := expectOK(resp); err != nil {
		return err
	}

	html := string(body)
	if looksLoggedOut(html) {
		if message := extractLoginError(html); message != "" {
			return fmt.Errorf("%s", message)
		}
		return fmt.Errorf("Alma login did not reach an authenticated page")
	}
	return nil
}

func expectOK(resp *http.Response) error {
	if resp.StatusCode >= 400 {
		return fmt.Errorf("%s", resp.Status)
	}
	return nil
}

func extractLoginError(htmlInput string) string {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return ""
	}
	text := dom.Text(root)
	matcher := regexp.MustCompile(`Fehler:\s*(.+?)\s*(Studierende, die aktuell|$)`)
	matches := matcher.FindStringSubmatch(text)
	if len(matches) < 2 {
		return ""
	}
	return dom.NormalizeSpace(matches[1])
}

func looksLoggedOut(htmlInput string) bool {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return false
	}
	bodyNode := dom.FindFirst(root, func(node *html.Node) bool {
		return dom.IsElement(node, "body")
	})
	if bodyNode != nil {
		if classValue, ok := dom.Attr(bodyNode, "class"); ok {
			for _, className := range strings.Fields(classValue) {
				if className == "notloggedin" {
					return true
				}
			}
		}
	}

	loginForm := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "form") {
			return false
		}
		id, ok := dom.Attr(node, "id")
		return ok && id == "loginForm"
	})
	return loginForm != nil
}

type loginForm struct {
	ActionURL string
	Payload   url.Values
}

func extractLoginForm(htmlInput, pageURL string) (*loginForm, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}

	formNode := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "form") {
			return false
		}
		id, ok := dom.Attr(node, "id")
		return ok && (id == "loginForm" || id == "mobileLoginForm")
	})
	if formNode == nil {
		return nil, fmt.Errorf("could not find Alma login form")
	}

	action, _ := dom.Attr(formNode, "action")
	payload := url.Values{}
	for _, input := range dom.FindAll(formNode, func(node *html.Node) bool { return dom.IsElement(node, "input") }) {
		name, ok := dom.Attr(input, "name")
		if !ok || name == "" {
			continue
		}
		fieldType, _ := dom.Attr(input, "type")
		if fieldType == "checkbox" || fieldType == "button" {
			continue
		}
		value, _ := dom.Attr(input, "value")
		payload.Set(name, value)
	}
	if payload.Get("submit") == "" {
		payload.Set("submit", "")
	}

	return &loginForm{
		ActionURL: resolveURL(pageURL, action),
		Payload:   payload,
	}, nil
}

func resolveURL(baseURL, relative string) string {
	base, err := url.Parse(baseURL)
	if err != nil {
		return relative
	}
	target, err := url.Parse(relative)
	if err != nil {
		return relative
	}
	return base.ResolveReference(target).String()
}

func cloneValues(source url.Values) url.Values {
	cloned := url.Values{}
	for key, values := range source {
		for _, value := range values {
			cloned.Add(key, value)
		}
	}
	return cloned
}
