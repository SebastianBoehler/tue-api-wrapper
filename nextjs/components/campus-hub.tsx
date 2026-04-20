import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CampusBuildingDetail,
  CampusBuildingDirectory,
  CampusCanteen,
  KufTrainingOccupancy
} from "../lib/product-types";
import { CampusBuildingExplorer } from "./campus-building-explorer";
import { KufOccupancyCard } from "./kuf-occupancy-card";

function buildCampusHref(options: { canteenId?: string; buildingPath?: string }) {
  const params = new URLSearchParams();
  if (options.canteenId) {
    params.set("canteenId", options.canteenId);
  }
  if (options.buildingPath) {
    params.set("buildingPath", options.buildingPath);
  }
  return `/campus?${params.toString()}`;
}

export function CampusHub({
  canteens,
  selectedCanteen,
  directory,
  selectedBuilding,
  currentBuildingPath,
  kufOccupancy
}: {
  canteens: CampusCanteen[];
  selectedCanteen: CampusCanteen;
  directory: CampusBuildingDirectory;
  selectedBuilding: CampusBuildingDetail;
  currentBuildingPath: string;
  kufOccupancy: KufTrainingOccupancy;
}) {
  return (
    <>
      <Card className="border-primary/15 bg-primary/5">
        <CardHeader>
          <div>
            <CardDescription>my-stuwe.de and uni-tuebingen.de</CardDescription>
            <CardTitle className="text-2xl">Campus logistics</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Live Tübingen mensa feeds, campus map shortcuts, and a searchable building directory in one place.
            </p>
          </div>
          <CardAction className="flex gap-2">
            <Button variant="outline" size="xs" asChild>
              <a href={directory.source_url} target="_blank" rel="noreferrer">
                Open maps
              </a>
            </Button>
            {selectedCanteen.page_url ? (
              <Button variant="outline" size="xs" asChild>
                <a href={selectedCanteen.page_url} target="_blank" rel="noreferrer">
                  Open canteen page
                </a>
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-border px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Tübingen feeds</p>
            <p className="mt-1 text-3xl font-semibold">{canteens.length}</p>
          </div>
          <div className="rounded-3xl border border-border px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Buildings</p>
            <p className="mt-1 text-3xl font-semibold">{directory.buildings.length}</p>
          </div>
          <div className="rounded-3xl border border-border px-4 py-3 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Area maps</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {directory.area_links.slice(0, 6).map((link) => (
                <a key={link.path} href={link.url} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 text-xs">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <KufOccupancyCard occupancy={kufOccupancy} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Canteens</CardTitle>
              <CardDescription>Compare menus, prices, and allergens across the live Tübingen mealplan feeds.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {canteens.map((canteen) => (
                <Link
                  key={canteen.canteen_id}
                  href={buildCampusHref({ canteenId: canteen.canteen_id, buildingPath: currentBuildingPath }) as Route}
                  className={`rounded-3xl border p-4 transition-colors hover:bg-muted/40 ${selectedCanteen.canteen_id === canteen.canteen_id ? "border-primary/30 bg-primary/5" : "border-border"
                    }`}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{canteen.canteen_id}</Badge>
                    {canteen.address ? <Badge variant="outline">{canteen.address}</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm font-medium">{canteen.canteen}</p>
                  {canteen.menus[0] ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <p>{canteen.menus[0].items[0] ?? "Menu available"}</p>
                      {canteen.menus[0].student_price ? <p className="mt-1">Student {canteen.menus[0].student_price} €</p> : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No active menus were published for this feed.</p>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedCanteen.canteen}</CardTitle>
              <CardDescription>{selectedCanteen.address ?? "Campus meal feed"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedCanteen.map_url ? (
                  <Button variant="outline" size="xs" asChild>
                    <a href={selectedCanteen.map_url} target="_blank" rel="noreferrer">
                      Open map
                    </a>
                  </Button>
                ) : null}
                {selectedCanteen.page_url ? (
                  <Button variant="outline" size="xs" asChild>
                    <a href={selectedCanteen.page_url} target="_blank" rel="noreferrer">
                      Open my-stuwe page
                    </a>
                  </Button>
                ) : null}
              </div>
              {selectedCanteen.menus.length ? (
                selectedCanteen.menus.slice(0, 8).map((menu) => (
                  <div key={menu.id} className="rounded-3xl border border-border px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {menu.menu_line ? <Badge variant="secondary">{menu.menu_line}</Badge> : null}
                      {menu.menu_date ? <Badge variant="outline">{menu.menu_date}</Badge> : null}
                      {menu.student_price ? <Badge variant="outline">Student {menu.student_price} €</Badge> : null}
                    </div>
                    <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
                      {menu.items.map((item) => (
                        <li key={`${menu.id}-${item}`}>{item}</li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {menu.icons.map((icon) => (
                        <span key={`${menu.id}-${icon}`} className="rounded-full border border-border px-2 py-1">{icon}</span>
                      ))}
                      {menu.allergens.map((allergen) => (
                        <span key={`${menu.id}-${allergen}`} className="rounded-full border border-border px-2 py-1">{allergen}</span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-muted px-4 py-5 text-sm text-muted-foreground">
                  No active menus were published for this canteen at the moment.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Building explorer</CardTitle>
              <CardDescription>Filter the official university address list and open the matching detail page.</CardDescription>
            </CardHeader>
            <CardContent>
              <CampusBuildingExplorer
                buildings={directory.buildings}
                selectedPath={currentBuildingPath}
                currentCanteenId={selectedCanteen.canteen_id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedBuilding.title}</CardTitle>
              <CardDescription>{selectedBuilding.subtitle ?? selectedBuilding.source_url}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedBuilding.map_label ? <Badge variant="secondary">{selectedBuilding.map_label}</Badge> : null}
                {selectedBuilding.building_number ? <Badge variant="outline">{selectedBuilding.building_number}</Badge> : null}
                {selectedBuilding.latitude !== null && selectedBuilding.longitude !== null ? (
                  <Badge variant="outline">{selectedBuilding.latitude.toFixed(3)}, {selectedBuilding.longitude.toFixed(3)}</Badge>
                ) : null}
              </div>
              {selectedBuilding.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedBuilding.image_url}
                  alt={selectedBuilding.title}
                  className="w-full rounded-3xl object-cover"
                />
              ) : null}
              {selectedBuilding.address_lines.length ? (
                <div className="rounded-3xl border border-border px-4 py-3 text-sm text-muted-foreground">
                  {selectedBuilding.address_lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
              {selectedBuilding.marker_description ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedBuilding.marker_description}</p>
              ) : null}
              <Button variant="outline" asChild>
                <a href={selectedBuilding.source_url} target="_blank" rel="noreferrer">
                  Open official building page
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
