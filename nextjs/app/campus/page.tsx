import { AppShell } from "../../components/app-shell";
import { CampusHub } from "../../components/campus-hub";
import { ErrorPanel } from "../../components/error-panel";
import { PortalApiError } from "../../lib/portal-api";
import {
  getCampusBuildingDetail,
  getCampusBuildings,
  getCampusCanteens
} from "../../lib/product-api";

function parseOptionalInt(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function CampusPage({
  searchParams
}: {
  searchParams?: Promise<{ canteenId?: string; buildingPath?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCanteenId = parseOptionalInt(params.canteenId);

  try {
    const [canteens, directory] = await Promise.all([
      getCampusCanteens(),
      getCampusBuildings()
    ]);
    if (!canteens.length) {
      throw new PortalApiError("No active Tübingen canteen feeds were returned by the mealplan API.");
    }
    if (!directory.buildings.length) {
      throw new PortalApiError("No campus buildings were returned by the official address directory.");
    }
    const selectedCanteen = canteens.find((item) => Number.parseInt(item.canteen_id, 10) === selectedCanteenId) ?? canteens[0];
    const selectedBuildingPath = params.buildingPath?.trim() || directory.buildings[0]?.path || "";
    const building = await getCampusBuildingDetail(selectedBuildingPath);

    return (
      <AppShell title="Campus Logistics">
        <CampusHub
          canteens={canteens}
          selectedCanteen={selectedCanteen}
          directory={directory}
          selectedBuilding={building}
          currentBuildingPath={selectedBuildingPath}
        />
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Campus logistics could not load live data.";
    return (
      <AppShell title="Campus Logistics">
        <ErrorPanel title="Campus unavailable" message={message} />
      </AppShell>
    );
  }
}
