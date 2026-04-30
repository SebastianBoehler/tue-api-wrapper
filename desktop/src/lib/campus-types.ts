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

export interface CampusSnapshot {
  canteens?: CampusCanteen[];
  events?: UniversityCalendarResponse;
  fitness?: KufTrainingOccupancy;
  errors: string[];
}
