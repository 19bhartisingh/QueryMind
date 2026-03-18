"""
pdf_exporter.py — Branded PDF report generator for QueryMind
Uses ReportLab Platypus for a clean, professional layout.

Two entry points:
  build_query_pdf(title, subtitle, sql, columns, rows, insights, chart_b64)  → bytes
  build_dashboard_pdf(title, subtitle, goal, db_name, kpi_row, panels)       → bytes
"""

import io
import base64
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, KeepTogether, PageBreak,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF

# ─────────────────────────────────────────────────────────
#  BRAND PALETTE
# ─────────────────────────────────────────────────────────

C_BLUE      = colors.HexColor("#2563EB")
C_BLUE_DARK = colors.HexColor("#1D4ED8")
C_BLUE_PALE = colors.HexColor("#EFF6FF")
C_VIOLET    = colors.HexColor("#7C3AED")
C_INK       = colors.HexColor("#1A1714")
C_INK2      = colors.HexColor("#4A4640")
C_INK3      = colors.HexColor("#8A837A")
C_BG        = colors.HexColor("#F7F6F3")
C_BORDER    = colors.HexColor("#E5E0D8")
C_GREEN     = colors.HexColor("#16A34A")
C_GREEN_BG  = colors.HexColor("#F0FDF4")
C_AMBER     = colors.HexColor("#D97706")
C_AMBER_BG  = colors.HexColor("#FFFBEB")
C_WHITE     = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

# ─────────────────────────────────────────────────────────
#  STYLES
# ─────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    return {
        "logo_name":   S("logo_name",   fontName="Helvetica-Bold", fontSize=18,
                          textColor=C_INK, leading=22),
        "logo_sub":    S("logo_sub",    fontName="Helvetica",      fontSize=9,
                          textColor=C_INK3, leading=12),
        "h1":          S("h1",          fontName="Helvetica-Bold", fontSize=22,
                          textColor=C_INK,  leading=27, spaceAfter=4),
        "h2":          S("h2",          fontName="Helvetica-Bold", fontSize=14,
                          textColor=C_INK,  leading=18, spaceAfter=2),
        "h3":          S("h3",          fontName="Helvetica-Bold", fontSize=11,
                          textColor=C_INK2, leading=15, spaceAfter=2),
        "subtitle":    S("subtitle",    fontName="Helvetica",      fontSize=12,
                          textColor=C_INK3, leading=16, spaceAfter=8),
        "body":        S("body",        fontName="Helvetica",      fontSize=10,
                          textColor=C_INK2, leading=15),
        "body_small":  S("body_small",  fontName="Helvetica",      fontSize=9,
                          textColor=C_INK3, leading=13),
        "insight_text":S("insight_text",fontName="Helvetica",      fontSize=10,
                          textColor=C_INK2, leading=15),
        "mono":        S("mono",        fontName="Courier",        fontSize=8.5,
                          textColor=colors.HexColor("#334155"),
                          backColor=colors.HexColor("#1E293B"),
                          leading=13),
        "kpi_value":   S("kpi_value",   fontName="Helvetica-Bold", fontSize=24,
                          textColor=C_BLUE,  leading=28, alignment=TA_CENTER),
        "kpi_label":   S("kpi_label",   fontName="Helvetica",      fontSize=9,
                          textColor=C_INK3,  leading=12, alignment=TA_CENTER),
        "section_label": S("section_label", fontName="Helvetica-Bold", fontSize=8,
                          textColor=C_INK3, leading=10,
                          letterSpacing=1.0, spaceBefore=12, spaceAfter=4),
        "footer":      S("footer",      fontName="Helvetica",      fontSize=8,
                          textColor=C_INK3, alignment=TA_CENTER),
        "table_header":S("table_header",fontName="Helvetica-Bold", fontSize=9,
                          textColor=C_WHITE, alignment=TA_LEFT),
        "table_cell":  S("table_cell",  fontName="Helvetica",      fontSize=9,
                          textColor=C_INK2, alignment=TA_LEFT),
    }


# ─────────────────────────────────────────────────────────
#  HEADER / FOOTER CANVAS CALLBACKS
# ─────────────────────────────────────────────────────────

class _BrandedCanvas:
    """Mixin that draws the branded header bar and footer on every page."""

    def __init__(self, *args, report_title="QueryMind Report",
                 report_date="", **kwargs):
        self._report_title = report_title
        self._report_date  = report_date

    def _draw_header(self, canvas, doc):
        canvas.saveState()
        # Gradient-ish header bar (two rects simulate gradient)
        canvas.setFillColor(C_BLUE)
        canvas.rect(0, PAGE_H - 14 * mm, PAGE_W / 2, 14 * mm, fill=1, stroke=0)
        canvas.setFillColor(C_VIOLET)
        canvas.rect(PAGE_W / 2, PAGE_H - 14 * mm, PAGE_W / 2, 14 * mm, fill=1, stroke=0)
        # Logo mark (small square with "Q")
        canvas.setFillColor(C_WHITE)
        canvas.roundRect(MARGIN - 2, PAGE_H - 11 * mm, 7 * mm, 7 * mm, 1.5 * mm, fill=1, stroke=0)
        canvas.setFillColor(C_BLUE)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.drawCentredString(MARGIN + 1.5 * mm, PAGE_H - 7 * mm, "Q")
        # App name
        canvas.setFillColor(C_WHITE)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(MARGIN + 9 * mm, PAGE_H - 7 * mm, "QueryMind")
        # Page right
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 7 * mm,
                               f"Page {doc.page}")
        canvas.restoreState()

    def _draw_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(C_BORDER)
        canvas.rect(MARGIN, 10 * mm, PAGE_W - 2 * MARGIN, 0.3 * mm, fill=1, stroke=0)
        canvas.setFillColor(C_INK3)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(MARGIN, 7 * mm, f"Generated by QueryMind · {self._report_date}")
        canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, "Confidential — Internal Use")
        canvas.restoreState()


def _make_doc(buf, title="QueryMind Report", date_str=""):
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=title,
        author="QueryMind",
    )

    def on_page(canvas, doc):
        canvas.saveState()

        # ── header bar ──
        canvas.setFillColor(C_BLUE)
        canvas.rect(0, PAGE_H - 14*mm, PAGE_W/2, 14*mm, fill=1, stroke=0)
        canvas.setFillColor(C_VIOLET)
        canvas.rect(PAGE_W/2, PAGE_H - 14*mm, PAGE_W/2, 14*mm, fill=1, stroke=0)
        # logo box
        canvas.setFillColor(C_WHITE)
        canvas.roundRect(MARGIN - 2, PAGE_H - 11*mm, 7*mm, 7*mm, 1.5*mm, fill=1, stroke=0)
        canvas.setFillColor(C_BLUE)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.drawCentredString(MARGIN + 1.5*mm, PAGE_H - 7*mm, "Q")
        canvas.setFillColor(C_WHITE)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(MARGIN + 9*mm, PAGE_H - 7*mm, "QueryMind")
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 7*mm, f"Page {doc.page}")

        # ── footer ──
        canvas.setFillColor(C_BORDER)
        canvas.rect(MARGIN, 10*mm, PAGE_W - 2*MARGIN, 0.3*mm, fill=1, stroke=0)
        canvas.setFillColor(C_INK3)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(MARGIN, 7*mm, f"Generated by QueryMind · {date_str}")
        canvas.drawRightString(PAGE_W - MARGIN, 7*mm, "Confidential — Internal Use")

        canvas.restoreState()

    doc._on_page = on_page
    return doc


# ─────────────────────────────────────────────────────────
#  SHARED BUILDING BLOCKS
# ─────────────────────────────────────────────────────────

def _section_label(text: str, st: dict) -> Paragraph:
    return Paragraph(text.upper(), st["section_label"])


def _divider(color=C_BORDER, thickness=0.5, space_before=6, space_after=6):
    return HRFlowable(
        width="100%", thickness=thickness, color=color,
        spaceAfter=space_after * mm, spaceBefore=space_before * mm,
        dash=None,
    )


def _title_block(title: str, subtitle: str, db_name: str,
                 date_str: str, st: dict) -> list:
    """Large title + subtitle + metadata row."""
    meta = f"Database: {db_name}   ·   {date_str}" if db_name else date_str
    return [
        Spacer(1, 4 * mm),
        Paragraph(title, st["h1"]),
        Paragraph(subtitle, st["subtitle"]) if subtitle else Spacer(1, 2*mm),
        Paragraph(meta, st["body_small"]),
        _divider(space_before=4, space_after=2),
    ]


def _sql_block(sql: str, st: dict) -> list:
    if not sql:
        return []
    # Word-wrap long lines at ~90 chars
    wrapped = _wrap_sql(sql, 90)
    lines = wrapped.replace("<", "&lt;").replace(">", "&gt;")
    sql_para = Paragraph(
        f'<font face="Courier" size="8" color="#94A3B8">{lines}</font>',
        ParagraphStyle("sqlinner", backColor=colors.HexColor("#1E293B"),
                       fontName="Courier", fontSize=8, leading=13,
                       textColor=colors.HexColor("#94A3B8"),
                       leftIndent=6, rightIndent=6,
                       spaceBefore=4, spaceAfter=4,
                       borderPad=6, borderRadius=6),
    )
    return [
        _section_label("SQL Query", st),
        sql_para,
        Spacer(1, 3 * mm),
    ]


def _wrap_sql(sql: str, width: int) -> str:
    """Break long SQL lines for readability."""
    out = []
    for line in sql.splitlines():
        while len(line) > width:
            out.append(line[:width])
            line = "    " + line[width:]
        out.append(line)
    return "\n".join(out)


def _insights_block(insights: list, st: dict) -> list:
    if not insights:
        return []

    ICON_COLORS = {
        "📈": C_GREEN,   "📉": colors.HexColor("#DC2626"),
        "🏆": C_AMBER,   "⚠️": C_AMBER,
        "💡": C_BLUE,    "🔍": C_VIOLET,
        "📊": C_BLUE,    "🎯": C_GREEN,
        "⚡": C_AMBER,   "🔗": C_VIOLET,
    }

    rows_data = []
    for ins in insights:
        icon = ins.get("icon", "💡")
        text = ins.get("text", "")
        col = ICON_COLORS.get(icon, C_BLUE)
        rows_data.append([
            Paragraph(icon, ParagraphStyle("ic", fontName="Helvetica",
                                           fontSize=12, leading=14,
                                           alignment=TA_CENTER)),
            Paragraph(text, st["insight_text"]),
        ])

    tbl = Table(rows_data, colWidths=[12*mm, PAGE_W - 2*MARGIN - 12*mm - 4*mm])
    tbl.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",   (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1),
         [C_BLUE_PALE, colors.HexColor("#F5F3FF")]),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, C_BORDER),
        ("ROUNDEDCORNERS", [4]),
    ]))

    return [
        _section_label("AI Insights", st),
        tbl,
        Spacer(1, 4 * mm),
    ]


def _data_table_block(columns: list, rows: list, st: dict,
                      max_rows: int = 100) -> list:
    if not columns or not rows:
        return []

    display_rows = rows[:max_rows]
    truncated    = len(rows) > max_rows

    # Header row
    header = [Paragraph(str(c), st["table_header"]) for c in columns]

    # Data rows — truncate long cell values
    data_rows = []
    for row in display_rows:
        cells = []
        for c in columns:
            val = row.get(c, "")
            if val is None:
                val = "—"
            s = str(val)
            if len(s) > 60:
                s = s[:57] + "…"
            cells.append(Paragraph(s, st["table_cell"]))
        data_rows.append(cells)

    all_rows = [header] + data_rows

    # Dynamic column widths — distribute evenly but cap at 50mm
    usable_w   = PAGE_W - 2 * MARGIN
    n_cols     = len(columns)
    col_w      = min(50 * mm, usable_w / n_cols)
    col_widths = [col_w] * n_cols

    tbl = Table(all_rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        # Header
        ("BACKGROUND",   (0, 0), (-1, 0),  C_BLUE),
        ("TEXTCOLOR",    (0, 0), (-1, 0),  C_WHITE),
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0),  8.5),
        ("TOPPADDING",   (0, 0), (-1, 0),  6),
        ("BOTTOMPADDING",(0, 0), (-1, 0),  6),
        # Alternating row shading
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_BG]),
        ("FONTSIZE",     (0, 1), (-1, -1), 8.5),
        ("TOPPADDING",   (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 1), (-1, -1), 5),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Grid
        ("GRID",         (0, 0), (-1, -1), 0.4, C_BORDER),
        ("LINEBELOW",    (0, 0), (-1, 0),  1.5, C_BLUE),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements = [
        _section_label(f"Data Table  ({len(rows)} rows{', showing first '+str(max_rows) if truncated else ''})", st),
        tbl,
        Spacer(1, 4 * mm),
    ]
    return elements


def _chart_image_block(chart_b64: Optional[str], title: str, st: dict) -> list:
    """Embed a base64 PNG chart image from ECharts getDataURL()."""
    if not chart_b64:
        return []
    try:
        # Strip data URI prefix if present
        if "," in chart_b64:
            chart_b64 = chart_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(chart_b64)
        img_buf   = io.BytesIO(img_bytes)
        max_w     = PAGE_W - 2 * MARGIN
        img       = Image(img_buf, width=max_w, height=max_w * 0.5)
        img.hAlign = "CENTER"
        return [
            _section_label(f"Chart: {title}" if title else "Chart", st),
            img,
            Spacer(1, 4 * mm),
        ]
    except Exception as e:
        print(f"Chart image embed error: {e}")
        return []


# ─────────────────────────────────────────────────────────
#  QUERY REPORT PDF
# ─────────────────────────────────────────────────────────

def build_query_pdf(
    title:     str,
    subtitle:  str      = "",
    sql:       str      = "",
    columns:   list     = None,
    rows:      list     = None,
    insights:  list     = None,
    chart_b64: str      = None,
    db_name:   str      = "",
    question:  str      = "",
) -> bytes:
    """
    Build a branded single-query PDF report.
    Returns raw PDF bytes.
    """
    columns  = columns  or []
    rows     = rows     or []
    insights = insights or []
    st       = _styles()
    date_str = datetime.now().strftime("%B %d, %Y  %H:%M")

    buf = io.BytesIO()
    doc = _make_doc(buf, title=title, date_str=date_str)

    story = []
    story += _title_block(title, subtitle or question, db_name, date_str, st)

    # SQL
    if sql:
        story += _sql_block(sql, st)

    # Chart
    if chart_b64:
        story += _chart_image_block(chart_b64, title, st)

    # Data table
    if columns and rows:
        story += _data_table_block(columns, rows, st)

    # Insights
    if insights:
        story += _insights_block(insights, st)

    # Empty state
    if not columns and not insights and not chart_b64:
        story.append(Paragraph("No data was returned by this query.", st["body"]))

    doc.build(story, onFirstPage=doc._on_page, onLaterPages=doc._on_page)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────
#  DASHBOARD PDF
# ─────────────────────────────────────────────────────────

_THEME_COLORS = {
    "blue":    colors.HexColor("#2563EB"),
    "teal":    colors.HexColor("#0D9488"),
    "violet":  colors.HexColor("#7C3AED"),
    "amber":   colors.HexColor("#D97706"),
    "rose":    colors.HexColor("#E11D48"),
    "emerald": colors.HexColor("#059669"),
    "orange":  colors.HexColor("#EA580C"),
    "cyan":    colors.HexColor("#0891B2"),
    "indigo":  colors.HexColor("#4338CA"),
    "pink":    colors.HexColor("#DB2777"),
}

_ACCENT_SEQ = [
    "blue","teal","violet","amber","rose",
    "emerald","orange","cyan","indigo","pink"
]


def _kpi_row_block(kpis: list, st: dict) -> list:
    if not kpis:
        return []

    cards = []
    for kpi in kpis:
        rows_data = kpi.get("rows", [])
        cols_data = kpi.get("columns", [])
        label_col = kpi.get("kpi_label") or (cols_data[0] if cols_data else "")
        raw_val   = ""
        if rows_data:
            row = rows_data[0]
            raw_val = row.get(label_col, list(row.values())[0] if row else "")
        try:
            num = float(raw_val)
            if num >= 1_000_000:
                fmt = f"{num/1_000_000:.1f}M"
            elif num >= 1_000:
                fmt = f"{num/1_000:.1f}K"
            elif num == int(num):
                fmt = f"{int(num):,}"
            else:
                fmt = f"{num:.2f}"
        except (TypeError, ValueError):
            fmt = str(raw_val)

        prefix = kpi.get("kpi_prefix", "")
        suffix = kpi.get("kpi_suffix", "")
        icon   = kpi.get("kpi_icon", "📊")
        title  = kpi.get("title", label_col)
        color  = _THEME_COLORS.get(kpi.get("kpi_color", "blue"), C_BLUE)

        kpi_st = ParagraphStyle(
            "kpi_v", fontName="Helvetica-Bold", fontSize=20,
            textColor=color, leading=24, alignment=TA_CENTER,
        )
        lbl_st = ParagraphStyle(
            "kpi_l", fontName="Helvetica", fontSize=8,
            textColor=C_INK3, leading=11, alignment=TA_CENTER,
        )

        card_data = [[
            Paragraph(icon, ParagraphStyle("ic", fontName="Helvetica",
                                           fontSize=16, alignment=TA_CENTER)),
            Paragraph(f"{prefix}{fmt}{suffix}", kpi_st),
            Paragraph(title, lbl_st),
        ]]
        card = Table(card_data, colWidths=None)
        card.setStyle(TableStyle([
            ("VALIGN",  (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",(0,0),(-1,-1), 8),
            ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ]))
        cards.append(card)

    # Lay cards in a single row table
    n     = len(cards)
    w_ea  = (PAGE_W - 2 * MARGIN - (n - 1) * 3 * mm) / n
    row_t = Table([cards], colWidths=[w_ea] * n, rowHeights=[28 * mm])
    row_t.setStyle(TableStyle([
        ("BOX",          (0,0),(-1,-1), 0.5, C_BORDER),
        ("INNERGRID",    (0,0),(-1,-1), 0.5, C_BORDER),
        ("BACKGROUND",   (0,0),(-1,-1), C_BLUE_PALE),
        ("LINEABOVE",    (0,0),(-1,0),  3,   C_BLUE),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
        ("LEFTPADDING",  (0,0),(-1,-1), 4),
        ("RIGHTPADDING", (0,0),(-1,-1), 4),
    ]))

    return [
        _section_label("Key Metrics", st),
        row_t,
        Spacer(1, 5 * mm),
    ]


def _dashboard_hero_block(title: str, subtitle: str, goal: str,
                           db_name: str, date_str: str,
                           theme: str, st: dict) -> list:
    """Colored hero block for dashboard PDFs."""
    hero_color = _THEME_COLORS.get(theme, C_BLUE)
    hero_data  = [[
        Paragraph(f'<font color="white"><b>{title}</b></font>', ParagraphStyle(
            "ht", fontName="Helvetica-Bold", fontSize=18,
            textColor=C_WHITE, leading=22, spaceAfter=3)),
        Paragraph(f'<font color="#CBD5E1">{subtitle}</font>', ParagraphStyle(
            "hs", fontName="Helvetica", fontSize=11,
            textColor=colors.HexColor("#CBD5E1"), leading=15)),
        Paragraph(
            f'<font color="#94A3B8">DB: {db_name}   ·   {date_str}</font>',
            ParagraphStyle("hm", fontName="Helvetica", fontSize=9,
                           textColor=colors.HexColor("#94A3B8"), leading=13)),
    ]]
    hero_tbl = Table([[Paragraph(
        f"<b>{title}</b><br/>"
        f'<font size="11" color="#CBD5E1">{subtitle}</font><br/>'
        f'<font size="9" color="#94A3B8">Database: {db_name}   ·   {date_str}</font>',
        ParagraphStyle("hero_inner", fontName="Helvetica-Bold", fontSize=18,
                       textColor=C_WHITE, leading=24, leftIndent=4),
    )]], colWidths=[PAGE_W - 2 * MARGIN])

    hero_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), hero_color),
        ("TOPPADDING",   (0,0),(-1,-1), 14),
        ("BOTTOMPADDING",(0,0),(-1,-1), 14),
        ("LEFTPADDING",  (0,0),(-1,-1), 12),
        ("RIGHTPADDING", (0,0),(-1,-1), 12),
        ("ROUNDEDCORNERS", [6]),
    ]))

    return [
        Spacer(1, 3 * mm),
        hero_tbl,
        Spacer(1, 5 * mm),
    ]


def build_dashboard_pdf(
    title:      str,
    subtitle:   str    = "",
    goal:       str    = "",
    db_name:    str    = "",
    theme:      str    = "blue",
    kpi_row:    list   = None,
    panels:     list   = None,
) -> bytes:
    """
    Build a branded multi-panel dashboard PDF.
    Each panel may contain a chart_b64 (ECharts getDataURL PNG),
    columns, rows, title, and insight.
    Returns raw PDF bytes.
    """
    kpi_row = kpi_row or []
    panels  = panels  or []
    st      = _styles()
    date_str = datetime.now().strftime("%B %d, %Y  %H:%M")

    buf = io.BytesIO()
    doc = _make_doc(buf, title=title, date_str=date_str)

    story = []

    # Hero banner
    story += _dashboard_hero_block(title, subtitle, goal, db_name, date_str, theme, st)

    # KPI row
    story += _kpi_row_block(kpi_row, st)

    # Panels
    for i, panel in enumerate(panels):
        if not panel.get("rows") and not panel.get("chart_b64"):
            continue

        panel_title   = panel.get("title", f"Panel {i+1}")
        panel_insight = panel.get("insight", "")
        chart_b64     = panel.get("chart_b64")
        columns       = panel.get("columns", [])
        rows          = panel.get("rows", [])
        color_theme   = panel.get("color_theme") or _ACCENT_SEQ[i % len(_ACCENT_SEQ)]
        accent_c      = _THEME_COLORS.get(color_theme, C_BLUE)

        # Panel header bar
        pnl_hdr = Table([[
            Paragraph(f"<b>{panel_title}</b>", ParagraphStyle(
                "pnl_h", fontName="Helvetica-Bold", fontSize=11,
                textColor=C_INK, leading=14)),
        ]], colWidths=[PAGE_W - 2 * MARGIN])
        pnl_hdr.setStyle(TableStyle([
            ("LINEABOVE",    (0,0),(-1,0),  3,   accent_c),
            ("BACKGROUND",   (0,0),(-1,-1), C_BG),
            ("TOPPADDING",   (0,0),(-1,-1), 8),
            ("BOTTOMPADDING",(0,0),(-1,-1), 8),
            ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ]))

        panel_elements = [pnl_hdr]

        # Insight text
        if panel_insight:
            panel_elements.append(Paragraph(
                f"<i>{panel_insight}</i>",
                ParagraphStyle("pi", fontName="Helvetica-Oblique", fontSize=9,
                               textColor=C_INK3, leading=13, leftIndent=10,
                               spaceBefore=4, spaceAfter=6),
            ))

        # Chart image
        if chart_b64:
            try:
                raw = chart_b64.split(",", 1)[1] if "," in chart_b64 else chart_b64
                img_bytes = base64.b64decode(raw)
                img_buf   = io.BytesIO(img_bytes)
                max_w     = PAGE_W - 2 * MARGIN
                img       = Image(img_buf, width=max_w, height=max_w * 0.45)
                img.hAlign = "CENTER"
                panel_elements.append(img)
            except Exception as e:
                print(f"Panel chart embed error: {e}")

        # Small data table (first 10 rows only, to keep PDF compact)
        if columns and rows and not chart_b64:
            panel_elements += _data_table_block(columns, rows, st, max_rows=10)

        panel_elements.append(Spacer(1, 5 * mm))

        story.append(KeepTogether(panel_elements) if len(panel_elements) <= 6
                     else panel_elements[0])
        if len(panel_elements) > 1:
            story += panel_elements[1:]

    doc.build(story, onFirstPage=doc._on_page, onLaterPages=doc._on_page)
    return buf.getvalue()
