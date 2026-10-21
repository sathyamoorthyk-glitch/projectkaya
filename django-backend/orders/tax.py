"""GST maths. Prices in the shop are GST-inclusive, so tax is carved OUT of the price."""
from decimal import ROUND_HALF_UP, Decimal

TWO = Decimal("0.01")
ZERO = Decimal("0.00")


def q(x):
    return Decimal(x).quantize(TWO, rounding=ROUND_HALF_UP)


def split_inclusive(amount, rate, intra_state):
    """Same state as the store -> CGST + SGST (half each). Different state -> IGST."""
    amount, rate = q(amount), Decimal(rate)
    taxable = q(amount * 100 / (100 + rate))
    tax = amount - taxable
    if intra_state:
        cgst = q(tax / 2)
        return {"taxable": taxable, "cgst": cgst, "sgst": tax - cgst, "igst": ZERO, "tax": tax}
    return {"taxable": taxable, "cgst": ZERO, "sgst": ZERO, "igst": tax, "tax": tax}
