package output

import (
	"encoding/json"
	"fmt"
	"os"
)

func PrintJSON(value any) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(value)
}

func PrintError(err error) int {
	fmt.Fprintln(os.Stderr, err.Error())
	return 1
}
