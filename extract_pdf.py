#!/usr/bin/env python3
"""Extract text from PDF pages 4-14 to understand spell-to-prism mappings."""

try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

import sys

def extract_with_pypdf2(pdf_path):
    """Extract text using PyPDF2."""
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        # Pages 4-14 (0-indexed: 3-13)
        for page_num in range(3, min(14, len(pdf_reader.pages))):
            page = pdf_reader.pages[page_num]
            text += f"\n--- Page {page_num + 1} ---\n"
            text += page.extract_text()
        return text

def extract_with_pdfplumber(pdf_path):
    """Extract text using pdfplumber."""
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        # Pages 4-14 (0-indexed: 3-13)
        for page_num in range(3, min(14, len(pdf.pages))):
            page = pdf.pages[page_num]
            text += f"\n--- Page {page_num + 1} ---\n"
            text += page.extract_text()
        return text

if __name__ == "__main__":
    pdf_path = "Prism of Magic_ Homebrew System for D&D 5e - 11-17.pdf"
    
    if HAS_PDFPLUMBER:
        print(extract_with_pdfplumber(pdf_path))
    elif HAS_PYPDF2:
        print(extract_with_pypdf2(pdf_path))
    else:
        print("ERROR: No PDF library available. Please install pdfplumber or PyPDF2:")
        print("  pip install pdfplumber")
        print("  or")
        print("  pip install PyPDF2")
        sys.exit(1)

