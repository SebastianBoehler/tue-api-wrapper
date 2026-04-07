package cli

var campusRoutes = map[string]backendRoute{
	"canteens": {
		Path:        "/api/campus/canteens",
		Description: "List canteens.",
	},
	"canteen": {
		Path:        "/api/campus/canteens/{canteen_id}",
		PathArgs:    []string{"canteen_id"},
		Description: "Single canteen detail.",
	},
	"buildings": {
		Path:        "/api/campus/buildings",
		Description: "Campus buildings index.",
	},
	"building-detail": {
		Path:        "/api/campus/buildings/detail",
		Description: "Building detail. Use --query path=/campus-der-zukunft/....",
	},
}

func runCampus(args []string) int {
	return runBackendGroup("campus", args, campusRoutes)
}
