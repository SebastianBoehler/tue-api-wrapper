export interface CampusMenuPhoto {
  thumbnail?: string;
  medium?: string;
  large?: string;
  full?: string;
  [key: string]: string | undefined;
}

export interface CampusMenu {
  id: string;
  menu_line: string | null;
  menu_date: string | null;
  items: string[];
  meats: string[];
  student_price: string | null;
  guest_price: string | null;
  pupil_price: string | null;
  icons: string[];
  filters_include: string[];
  allergens: string[];
  additives: string[];
  co2: string | null;
  photo: CampusMenuPhoto | null;
}

export interface CampusCanteen {
  canteen_id: string;
  canteen: string;
  page_url: string | null;
  address: string | null;
  map_url: string | null;
  menus: CampusMenu[];
}

export interface CampusFoodPlanPayload {
  date: string;
  canteens: CampusCanteen[];
  matched_menu_count: number;
  requested_canteen_ids: string[];
  requested_icons: string[];
}

export interface CampusFoodPlanView extends CampusFoodPlanPayload {
  view: "mensa";
}
