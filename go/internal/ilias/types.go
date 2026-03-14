package ilias

import "net/url"

type SearchForm struct {
	ActionURL    string
	Payload      url.Values
	TermField    string
	SearchButton string
}

type SearchResult struct {
	Title             string   `json:"title"`
	URL               *string  `json:"url"`
	Description       *string  `json:"description"`
	InfoURL           *string  `json:"info_url"`
	AddToFavoritesURL *string  `json:"add_to_favorites_url"`
	Breadcrumbs       []string `json:"breadcrumbs"`
	Properties        []string `json:"properties"`
	ItemType          *string  `json:"item_type"`
}

type SearchPage struct {
	PageURL         string         `json:"page_url"`
	Query           string         `json:"query"`
	PageNumber      int            `json:"page_number"`
	PreviousPageURL *string        `json:"previous_page_url"`
	NextPageURL     *string        `json:"next_page_url"`
	Results         []SearchResult `json:"results"`
}

type InfoField struct {
	Label *string `json:"label"`
	Value string  `json:"value"`
}

type InfoSection struct {
	Title  string      `json:"title"`
	Fields []InfoField `json:"fields"`
}

type InfoPage struct {
	Title    string        `json:"title"`
	PageURL  string        `json:"page_url"`
	Sections []InfoSection `json:"sections"`
}
