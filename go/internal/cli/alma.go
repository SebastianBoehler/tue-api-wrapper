package cli

import (
	"flag"
	"fmt"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/alma"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/config"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/env"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/output"
)

func runAlma(args []string) int {
	if len(args) == 0 {
		fmt.Println("Usage: tue alma current-lectures [--date DD.MM.YYYY] [--limit N] [--json]")
		return 1
	}

	switch args[0] {
	case "current-lectures":
		return runAlmaCurrentLectures(args[1:])
	default:
		return output.PrintError(fmt.Errorf("unknown alma command %q", args[0]))
	}
}

func runAlmaCurrentLectures(args []string) int {
	fs := flag.NewFlagSet("alma current-lectures", flag.ContinueOnError)
	date := fs.String("date", "", "Alma date filter in DD.MM.YYYY format")
	limit := fs.Int("limit", 50, "Maximum number of rows to return")
	asJSON := fs.Bool("json", false, "Print JSON instead of text")
	if err := fs.Parse(args); err != nil {
		return 1
	}

	username, password := env.AlmaCredentials()
	if username == "" || password == "" {
		return output.PrintError(fmt.Errorf(
			"set UNI_USERNAME and UNI_PASSWORD before using authenticated commands; legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks",
		))
	}

	client, err := alma.NewClient(config.DefaultTimeout())
	if err != nil {
		return output.PrintError(err)
	}
	if err := client.Login(username, password); err != nil {
		return output.PrintError(err)
	}

	page, err := client.FetchCurrentLectures(*date, *limit)
	if err != nil {
		return output.PrintError(err)
	}

	if *asJSON {
		if err := output.PrintJSON(page); err != nil {
			return output.PrintError(err)
		}
		return 0
	}

	selectedDate := "-"
	if page.SelectedDate != nil {
		selectedDate = *page.SelectedDate
	}
	fmt.Printf("Date: %s\n", selectedDate)
	fmt.Printf("Results: %d\n", len(page.Results))
	for index, item := range page.Results {
		start := valueOr(item.Start, "-")
		end := valueOr(item.End, "-")
		room := valueOr(item.Room, "-")
		fmt.Printf("%02d. %s - %s | %s | %s\n", index+1, start, end, item.Title, room)
	}
	return 0
}

func valueOr(value *string, fallback string) string {
	if value == nil || *value == "" {
		return fallback
	}
	return *value
}
