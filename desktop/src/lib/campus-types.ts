export interface CampusMenuItem {
  id: string;
  menu_line?: string | null;
  menu_date?: string | null;
  items: string[];
  meats: string[];
  student_price?: string | null;
}

export interface CampusCanteen {
  canteen_id: string;
  canteen: string;
  page_url?: string | null;
  address?: string | null;
  menus: CampusMenuItem[];
}

export interface UniversityCalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  url?: string | null;
  speaker?: string | null;
  location?: string | null;
  description?: string | null;
  categories: string[];
}

export interface UniversityCalendarResponse {
  total_hits: number;
  returned_hits: number;
  items: UniversityCalendarEvent[];
}

export interface KufTrainingOccupancy {
  facility_name: string;
  count: number;
  source_url: string;
  retrieved_at: string;
}

export interface SeatLocationStatus {
  location_id: string;
  name: string;
  long_name?: string | null;
  level?: string | null;
  building?: string | null;
  room?: string | null;
  total_seats?: number | null;
  free_seats?: number | null;
  occupied_seats?: number | null;
  occupancy_percent?: number | null;
  updated_at?: string | null;
  url?: string | null;
  geo_coordinates?: string | null;
}

export interface SeatAvailabilityResponse {
  source_url: string;
  retrieved_at: string;
  locations: SeatLocationStatus[];
}

export interface CampusSnapshot {
  canteens?: CampusCanteen[];
  events?: UniversityCalendarResponse;
  fitness?: KufTrainingOccupancy;
  seats?: SeatAvailabilityResponse;
  errors: string[];
}
