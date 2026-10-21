"""Bill (GST invoice) and packing list as PDF. Built-in PDF fonts have no rupee sign, so we print 'Rs.'."""
from io import BytesIO
from xml.sax.saxutils import escape

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from core.states import STATE_NAMES

_ss = getSampleStyleSheet()
BODY = ParagraphStyle("body", parent=_ss["Normal"], fontSize=9, leading=12)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8, leading=10)
H1 = ParagraphStyle("h1", parent=_ss["Heading1"], fontSize=18, spaceAfter=2)
RIGHT = ParagraphStyle("right", parent=BODY, alignment=2)


def rs(x):
    return f"Rs. {x:,.2f}"


def P(text, style=BODY):
    return Paragraph(escape(str(text)).replace("\n", "<br/>"), style)


def _ship_block(o):
    lines = [o.ship_name, o.ship_line1, o.ship_line2, o.ship_landmark and f"Near {o.ship_landmark}",
             f"{o.ship_city}, {STATE_NAMES.get(o.ship_state_code, '')} - {o.ship_pincode}", f"Phone: {o.ship_phone}"]
    return "\n".join(x for x in lines if x)


def _store_block(s):
    lines = [s.name, s.address, f"{s.pincode}".strip(), s.gstin and f"GSTIN: {s.gstin}", s.phone and f"Phone: {s.phone}"]
    return "\n".join(x for x in lines if x)


def _doc(buf, title):
    return SimpleDocTemplate(buf, pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm,
                             topMargin=14 * mm, bottomMargin=14 * mm, title=title, author=settings.SHOP_NAME)


def _grid(header_bg=colors.black):
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#999999")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f4f4")]),
    ])


def build_bill_pdf(order, bill_no):
    buf = BytesIO()
    items = list(order.items.all())
    intra = order.intra_state
    head = ["#", "Item", "HSN", "Qty", "Rate", "Taxable"] + (["CGST", "SGST"] if intra else ["IGST"]) + ["Amount"]
    rows = [head]
    for i, it in enumerate(items, 1):
        tax_cells = [rs(it.cgst), rs(it.sgst)] if intra else [rs(it.igst)]
        rows.append([i, P(f"{it.name}\n{it.brand} | {it.pack} | GST {it.gst_rate.normalize():f}% | ID {it.product_code}", SMALL),
                     it.hsn_code or "-", it.qty, rs(it.unit_price), rs(it.taxable_value), *tax_cells, rs(it.line_total)])
    tax_cols = 2 if intra else 1
    widths = [8 * mm, 56 * mm, 14 * mm, 10 * mm, 21 * mm, 21 * mm] + [17 * mm] * tax_cols + [22 * mm]
    scale = (182 * mm) / sum(widths)
    t = Table(rows, colWidths=[w * scale for w in widths], repeatRows=1)
    t.setStyle(_grid())

    totals = [["Taxable value", rs(order.taxable_value)]]
    totals += [["CGST", rs(order.cgst)], ["SGST", rs(order.sgst)]] if intra else [["IGST", rs(order.igst)]]
    totals += [["Grand total (incl. GST)", rs(order.total)]]
    tt = Table(totals, colWidths=[50 * mm, 32 * mm], hAlign="RIGHT")
    tt.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 9), ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.black)]))

    meta = Table([[P(_store_block(order.store)),
                   P(f"Bill no: {bill_no}\nOrder: {order.confirmation_no}\nDate: {order.paid_at:%d %b %Y, %I:%M %p}\n"
                     f"Payment ref: {order.razorpay_payment_id}", RIGHT)]], colWidths=[100 * mm, 82 * mm])
    parties = Table([[P("Bill to / Ship to\n" + _ship_block(order)),
                      P(f"Place of supply: {STATE_NAMES.get(order.ship_state_code, '')}\n"
                        f"Tax type: {'CGST + SGST (same state)' if intra else 'IGST (other state)'}")]],
                    colWidths=[100 * mm, 82 * mm])
    parties.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#999999")), ("VALIGN", (0, 0), (-1, -1), "TOP")]))

    _doc(buf, f"Bill {bill_no}").build([
        P("TAX INVOICE", H1), meta, Spacer(1, 6), parties, Spacer(1, 8), t, Spacer(1, 8), tt, Spacer(1, 14),
        P("All prices include GST. This is a computer-generated invoice and needs no signature.", SMALL)])
    return buf.getvalue()


def build_packing_pdf(order):
    buf = BytesIO()
    rows = [["Packed", "Item", "Brand", "Pack", "Qty"]]
    for it in order.items.all():
        rows.append(["[   ]", P(f"{it.name}\nID {it.product_code}", SMALL), it.brand, it.pack, it.qty])
    t = Table(rows, colWidths=[18 * mm, 82 * mm, 38 * mm, 24 * mm, 20 * mm], repeatRows=1)
    t.setStyle(_grid())
    top = Table([[P(f"Store: {order.store.name}\nOrder: {order.confirmation_no}\n"
                    f"Date: {order.paid_at:%d %b %Y, %I:%M %p}\nItems: {sum(i.qty for i in order.items.all())}"),
                  P("Deliver to\n" + _ship_block(order))]], colWidths=[82 * mm, 100 * mm])
    top.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#999999")), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    _doc(buf, f"Packing list {order.confirmation_no}").build([
        P("PACKING LIST", H1), Spacer(1, 6), top, Spacer(1, 8), t, Spacer(1, 12),
        P("Packed by: ____________________    Checked by: ____________________", BODY)])
    return buf.getvalue()
