from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import BinaryIO

import pytesseract
from PIL import Image
from pytesseract import TesseractNotFoundError


def extract_text_from_image(file: str | Path | bytes | BinaryIO) -> str:
    """Extract UTF-8 text from an image using Tesseract OCR."""
    if isinstance(file, (str, Path)):
        image = Image.open(file)
    elif isinstance(file, bytes):
        image = Image.open(BytesIO(file))
    else:
        image = Image.open(file)

    try:
        text = pytesseract.image_to_string(image)
    except TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract OCR binary is not installed or not in PATH") from exc

    text = text.strip()
    print("OCR extracted text:", text)
    return text
