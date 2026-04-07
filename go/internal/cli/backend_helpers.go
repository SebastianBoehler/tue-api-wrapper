package cli

import (
	"fmt"
	"net/url"
	"os"
	"sort"
	"strings"

	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/backend"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/config"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/env"
	"github.com/SebastianBoehler/tue-api-wrapper/go/internal/output"
)

type backendRoute struct {
	Path        string
	PathArgs    []string
	Description string
}

type backendRequestOptions struct {
	Query       url.Values
	OutputPath  string
	Raw         bool
	Positionals []string
}

func runBackendGroup(group string, args []string, routes map[string]backendRoute) int {
	if len(args) == 0 {
		printBackendGroupUsage(group, routes)
		return 1
	}
	if args[0] == "-h" || args[0] == "--help" || args[0] == "help" {
		printBackendGroupUsage(group, routes)
		return 0
	}

	route, ok := routes[args[0]]
	if !ok {
		return output.PrintError(fmt.Errorf("unknown %s command %q", group, args[0]))
	}
	return runBackendRoute(group+" "+args[0], route, args[1:])
}

func runBackendRoute(command string, route backendRoute, args []string) int {
	options, err := parseBackendRequestOptions(args)
	if err != nil {
		if err == errUsageRequested {
			printBackendRouteUsage(command, route)
			return 0
		}
		return output.PrintError(err)
	}

	path, err := route.resolve(options.Positionals)
	if err != nil {
		return output.PrintError(err)
	}
	return executeBackendRequest(path, options)
}

func executeBackendRequest(path string, options backendRequestOptions) int {
	client := backend.NewClient(config.DefaultTimeout(), env.PortalAPIBaseURL())
	response, err := client.Get(path, options.Query)
	if err != nil {
		return output.PrintError(err)
	}

	if options.OutputPath != "" {
		if err := os.WriteFile(options.OutputPath, response.Body, 0o644); err != nil {
			return output.PrintError(err)
		}
		return 0
	}

	if !options.Raw && backend.IsJSONContentType(response.ContentType) {
		pretty, err := backend.PrettyJSON(response.Body)
		if err == nil {
			if _, err := os.Stdout.Write(append(pretty, '\n')); err != nil {
				return output.PrintError(err)
			}
			return 0
		}
	}

	if _, err := os.Stdout.Write(response.Body); err != nil {
		return output.PrintError(err)
	}
	return 0
}

func printBackendGroupUsage(group string, routes map[string]backendRoute) {
	fmt.Printf("Usage: tue %s <command> [--query key=value ...] [--output PATH] [--raw] [path args]\n", group)
	fmt.Println()
	fmt.Println("Commands:")

	names := make([]string, 0, len(routes))
	for name := range routes {
		names = append(names, name)
	}
	sort.Strings(names)

	for _, name := range names {
		route := routes[name]
		args := ""
		if len(route.PathArgs) > 0 {
			args = " " + strings.Join(route.PathArgs, " ")
		}
		if route.Description != "" {
			fmt.Printf("  %s%s\n", name, args)
			fmt.Printf("    %s\n", route.Description)
			continue
		}
		fmt.Printf("  %s%s\n", name, args)
	}
}

func printBackendRouteUsage(command string, route backendRoute) {
	args := ""
	if len(route.PathArgs) > 0 {
		args = " " + strings.Join(route.PathArgs, " ")
	}
	fmt.Printf("Usage: tue %s [--query key=value ...] [--output PATH] [--raw]%s\n", command, args)
	fmt.Printf("Backend path: %s\n", route.Path)
}

func (route backendRoute) resolve(positionals []string) (string, error) {
	if len(positionals) != len(route.PathArgs) {
		if len(route.PathArgs) == 0 {
			return route.Path, nil
		}
		return "", fmt.Errorf(
			"%s expects %d path arguments (%s)",
			route.Path,
			len(route.PathArgs),
			strings.Join(route.PathArgs, ", "),
		)
	}

	path := route.Path
	for index, name := range route.PathArgs {
		placeholder := "{" + name + "}"
		path = strings.ReplaceAll(path, placeholder, url.PathEscape(positionals[index]))
	}
	return path, nil
}

var errUsageRequested = fmt.Errorf("usage requested")

func parseBackendRequestOptions(args []string) (backendRequestOptions, error) {
	options := backendRequestOptions{
		Query: url.Values{},
	}

	for index := 0; index < len(args); index++ {
		arg := args[index]
		switch {
		case arg == "-h" || arg == "--help" || arg == "help":
			return options, errUsageRequested
		case arg == "--raw":
			options.Raw = true
		case arg == "--query":
			index++
			if index >= len(args) {
				return options, fmt.Errorf("--query requires key=value")
			}
			if err := addBackendQuery(options.Query, args[index]); err != nil {
				return options, err
			}
		case strings.HasPrefix(arg, "--query="):
			if err := addBackendQuery(options.Query, strings.TrimPrefix(arg, "--query=")); err != nil {
				return options, err
			}
		case arg == "--output":
			index++
			if index >= len(args) {
				return options, fmt.Errorf("--output requires a file path")
			}
			options.OutputPath = args[index]
		case strings.HasPrefix(arg, "--output="):
			options.OutputPath = strings.TrimPrefix(arg, "--output=")
		case strings.HasPrefix(arg, "-"):
			return options, fmt.Errorf("unknown flag %q", arg)
		default:
			options.Positionals = append(options.Positionals, arg)
		}
	}

	return options, nil
}

func addBackendQuery(values url.Values, item string) error {
	key, value, ok := strings.Cut(item, "=")
	if !ok || strings.TrimSpace(key) == "" {
		return fmt.Errorf("query values must use key=value, got %q", item)
	}
	values.Add(strings.TrimSpace(key), value)
	return nil
}
