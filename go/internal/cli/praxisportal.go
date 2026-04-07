package cli

var praxisportalRoutes = map[string]backendRoute{
	"filters": {
		Path:        "/api/praxisportal/filters",
		Description: "Praxisportal filter options.",
	},
	"search": {
		Path:        "/api/praxisportal/search",
		Description: "Praxisportal search. Use --query query=... and optional project_type_id, industry_id, page, per_page, sort.",
	},
	"project": {
		Path:        "/api/praxisportal/projects/{project_id}",
		PathArgs:    []string{"project_id"},
		Description: "Single Praxisportal project detail.",
	},
}

func runPraxisportal(args []string) int {
	return runBackendGroup("praxisportal", args, praxisportalRoutes)
}
