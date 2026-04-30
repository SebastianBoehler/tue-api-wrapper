export interface DirectoryForm {
  action_url: string;
  payload: [string, string][];
}

export interface DirectoryAction {
  kind: "event" | "submit";
  target?: string | null;
  name?: string | null;
  value?: string | null;
}

export interface DirectoryField {
  label: string;
  value: string;
}

export interface DirectoryPersonSummary {
  name: string;
  subtitle?: string | null;
  action: DirectoryAction;
}

export interface DirectoryOrganizationSummary {
  name: string;
  action: DirectoryAction;
}

export interface DirectoryPersonSection {
  title: string;
  items: DirectoryPersonSummary[];
}

export interface DirectoryContactSection {
  title: string;
  fields: DirectoryField[];
}

export interface DirectoryPerson {
  name: string;
  summary?: string | null;
  attributes: DirectoryField[];
  contact_sections: DirectoryContactSection[];
}

export interface DirectoryOrganization {
  name: string;
  fields: DirectoryField[];
  person_list_action?: DirectoryAction | null;
}

export interface DirectorySearchResponse {
  query: string;
  title: string;
  outcome: "people" | "person" | "organizations" | "organization" | "empty" | "tooManyResults";
  form?: DirectoryForm | null;
  sections: DirectoryPersonSection[];
  organizations: DirectoryOrganizationSummary[];
  person?: DirectoryPerson | null;
  organization?: DirectoryOrganization | null;
  message?: string | null;
}
