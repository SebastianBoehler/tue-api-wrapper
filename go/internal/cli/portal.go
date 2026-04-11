package cli

var portalRoutes = map[string]backendRoute{
	"dashboard": {
		Path:        "/api/dashboard",
		Description: "Unified dashboard payload. Use --query term=... to override the term.",
	},
	"search": {
		Path:        "/api/search",
		Description: "Unified Alma and ILIAS search. Use --query query=... and optional --query term=....",
	},
	"item": {
		Path:        "/api/items/{item_id}",
		PathArgs:    []string{"item_id"},
		Description: "Fetch a concrete item from the unified search index.",
	},
	"course-detail": {
		Path:        "/api/course-detail",
		Description: "Combined Alma course detail with related ILIAS matches. Use --query url=... or --query title=....",
	},
	"health": {
		Path:        "/api/health",
		Description: "Backend health check.",
	},
}

func runPortal(args []string) int {
	return runBackendGroup("portal", args, portalRoutes)
}
