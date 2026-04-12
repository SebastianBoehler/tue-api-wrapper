from __future__ import annotations


ASSIGNMENT_ROW_LIMIT_SUFFIXES = (
    ":modules:moduleAssignments:moduleAssignmentsNavi2NumRowsInput",
    ":courseOfStudies:courseOfStudyAssignments:courseOfStudyAssignmentsNavi2NumRowsInput",
)


def set_assignment_row_limits(payload: dict[str, str], *, limit: str = "300") -> None:
    for name in tuple(payload):
        if name.endswith(ASSIGNMENT_ROW_LIMIT_SUFFIXES):
            payload[name] = limit
