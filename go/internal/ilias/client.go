package ilias

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/config"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/dom"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/httpx"
	"golang.org/x/net/html"
)

type Client struct {
	http *httpx.Client
}

func NewClient(timeout time.Duration) (*Client, error) {
	httpClient, err := httpx.New(timeout)
	if err != nil {
		return nil, err
	}
	return &Client{http: httpClient}, nil
}

func (c *Client) Login(username, password string) error {
	resp, body, err := c.http.Get(config.IliasLoginURL)
	if err != nil {
		return err
	}
	if err := expectOK(resp); err != nil {
		return err
	}

	shibURL, err := extractShibLoginURL(string(body), resp.Request.URL.String())
	if err != nil {
		return err
	}

	resp, body, err = c.http.Get(shibURL)
	if err != nil {
		return err
	}
	if err := expectOK(resp); err != nil {
		return err
	}

	form, err := extractIDPLoginForm(string(body), resp.Request.URL.String())
	if err != nil {
		return err
	}

	payload := cloneValues(form.Payload)
	payload.Set("j_username", username)
	payload.Set("j_password", password)
	payload.Set("_eventId_proceed", payload.Get("_eventId_proceed"))

	resp, body, err = c.http.PostForm(form.ActionURL, payload)
	if err != nil {
		return err
	}
	if err := expectOK(resp); err != nil {
		return err
	}

	if message := extractIDPError(string(body)); message != "" {
		return fmt.Errorf("%s", message)
	}

	return c.completeSAMLHandoff(resp, body)
}

func (c *Client) completeSAMLHandoff(resp *http.Response, body []byte) error {
	currentResp := resp
	currentBody := body

	for attempt := 0; attempt < 6; attempt++ {
		htmlInput := string(currentBody)
		host := currentResp.Request.URL.Host
		if host == "ovidius.uni-tuebingen.de" && strings.Contains(htmlInput, "ILIAS Universität Tübingen") {
			return nil
		}

		if strings.Contains(htmlInput, "SAMLResponse") && strings.Contains(htmlInput, "RelayState") {
			form, err := extractHiddenForm(htmlInput, currentResp.Request.URL.String(), map[string]bool{
				"SAMLResponse": true,
				"RelayState":   true,
			})
			if err != nil {
				return err
			}
			currentResp, currentBody, err = c.http.PostForm(form.ActionURL, form.Payload)
			if err != nil {
				return err
			}
			if err := expectOK(currentResp); err != nil {
				return err
			}
			continue
		}

		if host == "idp.uni-tuebingen.de" && strings.Contains(htmlInput, "_eventId_proceed") {
			form, err := extractHiddenForm(htmlInput, currentResp.Request.URL.String(), map[string]bool{
				"_eventId_proceed": true,
			})
			if err != nil {
				return err
			}
			currentResp, currentBody, err = c.http.PostForm(form.ActionURL, form.Payload)
			if err != nil {
				return err
			}
			if err := expectOK(currentResp); err != nil {
				return err
			}
			continue
		}

		break
	}

	return fmt.Errorf("could not complete the ILIAS SAML handoff into an authenticated page")
}

type loginForm struct {
	ActionURL string
	Payload   url.Values
}

func extractShibLoginURL(htmlInput, pageURL string) (string, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return "", err
	}
	link := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "a") {
			return false
		}
		href, ok := dom.Attr(node, "href")
		return ok && strings.Contains(href, "shib_login.php")
	})
	if link == nil {
		return "", fmt.Errorf("could not find the ILIAS Shibboleth login link")
	}
	href, _ := dom.Attr(link, "href")
	return resolveURL(pageURL, href), nil
}

func extractIDPLoginForm(htmlInput, pageURL string) (*loginForm, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}
	formNode := dom.FindFirst(root, func(node *html.Node) bool {
		if !dom.IsElement(node, "form") {
			return false
		}
		passwordField := dom.FindFirst(node, func(node *html.Node) bool {
			if !dom.IsElement(node, "input") {
				return false
			}
			name, _ := dom.Attr(node, "name")
			return name == "j_password"
		})
		return passwordField != nil
	})
	if formNode == nil {
		return nil, fmt.Errorf("could not find the Shibboleth IdP username/password form")
	}

	action, _ := dom.Attr(formNode, "action")
	payload := url.Values{}
	for _, input := range dom.FindAll(formNode, func(node *html.Node) bool { return dom.IsElement(node, "input") }) {
		name, ok := dom.Attr(input, "name")
		if !ok || name == "" {
			continue
		}
		fieldType, _ := dom.Attr(input, "type")
		if fieldType == "checkbox" {
			continue
		}
		value, _ := dom.Attr(input, "value")
		payload.Set(name, value)
	}

	return &loginForm{ActionURL: resolveURL(pageURL, action), Payload: payload}, nil
}

func extractHiddenForm(htmlInput, pageURL string, required map[string]bool) (*loginForm, error) {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return nil, err
	}

	for _, formNode := range dom.FindAll(root, func(node *html.Node) bool { return dom.IsElement(node, "form") }) {
		payload := url.Values{}
		for _, input := range dom.FindAll(formNode, func(node *html.Node) bool { return dom.IsElement(node, "input") }) {
			name, ok := dom.Attr(input, "name")
			if !ok || name == "" {
				continue
			}
			value, _ := dom.Attr(input, "value")
			payload.Set(name, value)
		}

		if hasAllRequired(payload, required) {
			action, _ := dom.Attr(formNode, "action")
			return &loginForm{ActionURL: resolveURL(pageURL, action), Payload: payload}, nil
		}
	}

	return nil, fmt.Errorf("could not find a form with the required hidden fields")
}

func extractIDPError(htmlInput string) string {
	root, err := dom.Parse(htmlInput)
	if err != nil {
		return ""
	}
	node := dom.FindFirst(root, func(node *html.Node) bool {
		return dom.IsElement(node, "div") && dom.HasClass(node, "form-error")
	})
	if node == nil {
		return ""
	}
	return dom.Text(node)
}

func expectOK(resp *http.Response) error {
	if resp.StatusCode >= 400 {
		return fmt.Errorf("%s", resp.Status)
	}
	return nil
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

func hasAllRequired(payload url.Values, required map[string]bool) bool {
	for field := range required {
		if _, ok := payload[field]; !ok {
			return false
		}
	}
	return true
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
