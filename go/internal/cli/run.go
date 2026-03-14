package cli

import (
	"fmt"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/env"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/output"
)

func Run(args []string) int {
	if err := env.LoadLocalEnv(".env.local", ".env"); err != nil {
		return output.PrintError(err)
	}

	if len(args) == 0 {
		printRootUsage()
		return 1
	}

	switch args[0] {
	case "alma":
		return runAlma(args[1:])
	case "ilias":
		return runIlias(args[1:])
	case "-h", "--help", "help":
		printRootUsage()
		return 0
	default:
		return output.PrintError(fmt.Errorf("unknown command %q", args[0]))
	}
}

func printRootUsage() {
	fmt.Println("Usage:")
	fmt.Println("  tue alma current-lectures [--date DD.MM.YYYY] [--limit N] [--json]")
	fmt.Println("  tue ilias search --term QUERY [--page N] [--json]")
	fmt.Println("  tue ilias info --target REF_ID_OR_URL [--json]")
}
