package cli

var timmsRoutes = map[string]backendRoute{
	"search": {
		Path:        "/api/timms/search",
		Description: "TIMMS search. Use --query query=... and optional --query offset=... --query limit=....",
	},
	"suggest": {
		Path:        "/api/timms/search/suggest",
		Description: "TIMMS search suggestions. Use --query term=... and optional --query limit=....",
	},
	"item": {
		Path:        "/api/timms/items/{item_id}",
		PathArgs:    []string{"item_id"},
		Description: "TIMMS item detail.",
	},
	"streams": {
		Path:        "/api/timms/items/{item_id}/streams",
		PathArgs:    []string{"item_id"},
		Description: "TIMMS item streams.",
	},
	"cite": {
		Path:        "/api/timms/items/{item_id}/cite",
		PathArgs:    []string{"item_id"},
		Description: "TIMMS citation export. Use --query format=... and optionally --output citation.txt.",
	},
	"tree": {
		Path:        "/api/timms/tree",
		Description: "TIMMS tree traversal. Use --query node_id=... or --query node_path=....",
	},
}

func runTimms(args []string) int {
	return runBackendGroup("timms", args, timmsRoutes)
}
