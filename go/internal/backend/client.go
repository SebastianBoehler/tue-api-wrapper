package backend

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const userAgent = "tue-api-wrapper-go-backend/0.1"

type Client struct {
	baseURL string
	http    *http.Client
}

type Response struct {
	ContentType string
	Body        []byte
}

func NewClient(timeout time.Duration, baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		http: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) Get(path string, query url.Values) (*Response, error) {
	return c.Request(http.MethodGet, path, query)
}

func (c *Client) Request(method string, path string, query url.Values) (*Response, error) {
	target, err := c.resolve(path, query)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(method) == "" {
		method = http.MethodGet
	}
	req, err := http.NewRequest(method, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("%s", decodeError(resp.StatusCode, target, body))
	}

	return &Response{
		ContentType: resp.Header.Get("Content-Type"),
		Body:        body,
	}, nil
}

func IsJSONContentType(contentType string) bool {
	return strings.Contains(strings.ToLower(contentType), "json")
}

func PrettyJSON(body []byte) ([]byte, error) {
	var value any
	if err := json.Unmarshal(body, &value); err != nil {
		return nil, err
	}
	return json.MarshalIndent(value, "", "  ")
}

func (c *Client) resolve(path string, query url.Values) (string, error) {
	value := strings.TrimSpace(path)
	if value == "" {
		return "", fmt.Errorf("a non-empty backend path is required")
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		target, err := url.Parse(value)
		if err != nil {
			return "", err
		}
		appendQuery(target, query)
		return target.String(), nil
	}
	if c.baseURL == "" {
		return "", fmt.Errorf("PORTAL_API_BASE_URL is not configured")
	}

	target, err := url.Parse(c.baseURL + "/" + strings.TrimLeft(value, "/"))
	if err != nil {
		return "", err
	}
	appendQuery(target, query)
	return target.String(), nil
}

func appendQuery(target *url.URL, values url.Values) {
	if len(values) == 0 {
		return
	}
	query := target.Query()
	for key, items := range values {
		for _, item := range items {
			query.Add(key, item)
		}
	}
	target.RawQuery = query.Encode()
}

func decodeError(statusCode int, target string, body []byte) string {
	var payload struct {
		Detail string `json:"detail"`
	}
	if err := json.Unmarshal(body, &payload); err == nil && strings.TrimSpace(payload.Detail) != "" {
		return fmt.Sprintf("backend request failed for %s with %d: %s", target, statusCode, payload.Detail)
	}

	detail := strings.TrimSpace(string(body))
	if detail == "" {
		return fmt.Sprintf("backend request failed for %s with %d", target, statusCode)
	}
	return fmt.Sprintf("backend request failed for %s with %d: %s", target, statusCode, detail)
}
