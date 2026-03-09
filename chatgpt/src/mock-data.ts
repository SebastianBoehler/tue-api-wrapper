import type { DashboardPayload, SearchItem } from "./types.js";

export const mockDashboard: DashboardPayload = {
  generatedAt: "2026-03-09T09:00:00Z",
  termLabel: "Sommer 2026",
  hero: {
    title: "Study Hub",
    subtitle: "A single in-chat surface for Alma scheduling, documents, and ILIAS links."
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
        location: "Sand 14",
        description: "Weekly seminar slot"
      },
      {
        summary: "MPC Exercise Group",
        start: "2026-04-14T08:30:00+02:00",
        end: "2026-04-14T10:00:00+02:00",
        location: "Morgenstelle 16",
        description: "Exercise session"
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
    }
  ],
  exams: [
    {
      title: "Studienbegleitende Leistungen",
      number: "9055",
      grade: "1,0",
      status: "BE"
    },
    {
      title: "Theoretical Foundations",
      number: "9057",
      grade: null,
      status: "AN"
    }
  ],
  ilias: {
    title: "ILIAS Universität Tübingen",
    mainbarLinks: [
      {
        label: "Dashboard",
        url: "https://ovidius.uni-tuebingen.de/ilias3/goto.php/root/1"
      },
      {
        label: "Calendar",
        url: "https://ovidius.uni-tuebingen.de/ilias3/goto.php/root/1"
      }
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

export const mockSearchItems: SearchItem[] = [
  {
    id: "event:1",
    title: "Machine Learning Seminar",
    url: mockDashboard.agenda.exportUrl,
    text: "Machine Learning Seminar\nStart: 2026-04-13T10:15:00+02:00\nLocation: Sand 14",
    metadata: { kind: "agenda" }
  },
  {
    id: "document:downloadEnrolmentCertificate",
    title: "Immatrikulationsbescheinigung / Studienbescheinigung",
    url: "https://alma.uni-tuebingen.de/alma/pages/cm/exa/enrollment/info/start.xhtml?_flowId=studyservice-flow",
    text: "Document export job for enrollment certificate",
    metadata: { kind: "document" }
  },
  {
    id: "category:Machine Learning",
    title: "Machine Learning",
    url: "https://ovidius.uni-tuebingen.de/ilias3/goto.php/crs/5289869",
    text: "ILIAS top category for Machine Learning",
    metadata: { kind: "ilias-category" }
  }
];
