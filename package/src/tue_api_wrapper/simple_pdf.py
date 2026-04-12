from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PdfPage:
    width: float
    height: float
    commands: list[bytes]


def _escape_pdf_text(value: str) -> bytes:
    cleaned = value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    return cleaned.encode("latin-1", errors="replace")


def _fmt(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


class SimplePdf:
    def __init__(self, *, width: float = 595.28, height: float = 841.89) -> None:
        self.width = width
        self.height = height
        self.pages: list[PdfPage] = []
        self.add_page()

    @property
    def page(self) -> PdfPage:
        return self.pages[-1]

    def add_page(self) -> None:
        self.pages.append(PdfPage(width=self.width, height=self.height, commands=[]))

    def text(
        self,
        x: float,
        y: float,
        value: str,
        *,
        size: float = 10,
        color: tuple[float, float, float] = (0, 0, 0),
    ) -> None:
        if not value:
            return
        r, g, b = color
        command = (
            f"BT /F1 {_fmt(size)} Tf {_fmt(r)} {_fmt(g)} {_fmt(b)} rg "
            f"{_fmt(x)} {_fmt(y)} Td ("
        ).encode("ascii")
        self.page.commands.append(command + _escape_pdf_text(value) + b") Tj ET\n")

    def rect(
        self,
        x: float,
        y: float,
        width: float,
        height: float,
        *,
        fill: tuple[float, float, float],
    ) -> None:
        r, g, b = fill
        self.page.commands.append(
            (
                f"q {_fmt(r)} {_fmt(g)} {_fmt(b)} rg "
                f"{_fmt(x)} {_fmt(y)} {_fmt(width)} {_fmt(height)} re f Q\n"
            ).encode("ascii")
        )

    def line(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        *,
        color: tuple[float, float, float] = (0, 0, 0),
        width: float = 1,
    ) -> None:
        r, g, b = color
        self.page.commands.append(
            (
                f"q {_fmt(r)} {_fmt(g)} {_fmt(b)} RG {_fmt(width)} w "
                f"{_fmt(x1)} {_fmt(y1)} m {_fmt(x2)} {_fmt(y2)} l S Q\n"
            ).encode("ascii")
        )

    def render(self) -> bytes:
        objects: list[bytes] = [b"<< /Type /Catalog /Pages 2 0 R >>"]
        pages_object_index = 2
        objects.append(b"")
        font_object_index = 3
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")

        page_refs: list[str] = []
        for page in self.pages:
            stream = b"".join(page.commands)
            content_index = len(objects) + 1
            objects.append(b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"endstream")
            page_index = len(objects) + 1
            page_refs.append(f"{page_index} 0 R")
            objects.append(
                (
                    f"<< /Type /Page /Parent {pages_object_index} 0 R "
                    f"/MediaBox [0 0 {_fmt(page.width)} {_fmt(page.height)}] "
                    f"/Resources << /Font << /F1 {font_object_index} 0 R >> >> "
                    f"/Contents {content_index} 0 R >>"
                ).encode("ascii")
            )

        objects[pages_object_index - 1] = (
            f"<< /Type /Pages /Kids [{' '.join(page_refs)}] /Count {len(page_refs)} >>"
        ).encode("ascii")

        output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for index, obj in enumerate(objects, start=1):
            offsets.append(len(output))
            output.extend(f"{index} 0 obj\n".encode("ascii"))
            output.extend(obj)
            output.extend(b"\nendobj\n")

        xref_start = len(output)
        output.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
        output.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
        output.extend(
            (
                f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
                f"startxref\n{xref_start}\n%%EOF\n"
            ).encode("ascii")
        )
        return bytes(output)
