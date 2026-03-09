import type { DashboardData, DocumentReport, PortalLink } from "./types";

export const mockDashboard: DashboardData = {
  generatedAt: "2026-03-09T09:00:00Z",
  termLabel: "Sommer 2026",
  hero: {
    title: "Study Hub",
    subtitle:
      "A calmer front door for Alma schedules, study-service paperwork, and ILIAS course spaces."
  },
  metrics: [
    { label: "Upcoming events", value: 7 },
    { label: "Exam rows", value: 5 },
    { label: "Document jobs", value: 6 },
    { label: "ILIAS entry points", value: 8 }
  ],
  agenda: {
    exportUrl:
      "https://alma.uni-tuebingen.de/alma/pages/plan/individualTimetable.xhtml?_flowId=individualTimetableSchedule-flow",
    items: [
      {
        summary: "Machine Learning Seminar",
        start: "2026-04-13T10:15:00+02:00",
        end: "2026-04-13T11:45:00+02:00",
        location: "Sand 14, SR 2",
        description: "Weekly seminar slot"
      },
      {
        summary: "MPC Exercise Group",
        start: "2026-04-14T08:30:00+02:00",
        end: "2026-04-14T10:00:00+02:00",
        location: "Morgenstelle 16",
        description: "Exercise and recap"
      },
      {
        summary: "Ethics and Philosophy of ML",
        start: "2026-04-15T14:00:00+02:00",
        end: "2026-04-15T16:00:00+02:00",
        location: "Brechtbau",
        description: "Lecture block"
      }
    ]
  },
  documents: [
    {
      label: "Immatrikulationsbescheinigung / Studienbescheinigung",
      trigger_name: "downloadEnrolmentCertificate"
    },
    {
      label: "BAföG-Bescheinigung",
      trigger_name: "downloadBafoeg"
    },
    {
      label: "Datenkontrollblatt",
      trigger_name: "downloadDataSheet"
    }
  ],
  exams: [
    {
      level: 3,
      kind: "Konto",
      title: "Studienbegleitende Leistungen",
      number: "9055",
      attempt: "1",
      grade: "1,0",
      cp: "9",
      status: "BE"
    },
    {
      level: 3,
      kind: "Prüfung",
      title: "Theoretical Foundations",
      number: "9057",
      attempt: "1",
      grade: null,
      cp: "6",
      status: "AN"
    }
  ],
  enrollment: {
    selected_term: "Sommersemester 2026",
    available_terms: {
      "Wintersemester 2025/26": "220",
      "Sommersemester 2026": "229"
    },
    message: "No current enrollment warnings."
  },
  ilias: {
    title: "ILIAS Universität Tübingen",
    mainbarLinks: [
      { label: "Dashboard", url: "https://ovidius.uni-tuebingen.de/ilias3/" },
      { label: "Courses", url: "https://ovidius.uni-tuebingen.de/ilias3/" },
      { label: "Calendar", url: "https://ovidius.uni-tuebingen.de/ilias3/" }
    ],
    topCategories: [
      {
        label: "Sommersemester 2026",
        url: "https://ovidius.uni-tuebingen.de/ilias3/goto.php/root/1"
      },
      {
        label: "Machine Learning",
        url: "https://ovidius.uni-tuebingen.de/ilias3/goto.php/crs/5289869"
      }
    ]
  }
};

export const mockDocuments: DocumentReport[] = mockDashboard.documents;
export const mockIliasLinks: PortalLink[] = [
  ...mockDashboard.ilias.mainbarLinks,
  ...mockDashboard.ilias.topCategories
];
