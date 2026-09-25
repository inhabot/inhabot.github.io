# PDF conversion

The PDF to Markdown tab runs the vendored kordoc PDF parser in a browser worker. That parser uses `pdfjs-dist` and includes algorithms derived from OpenDataLoader PDF for reading order and table detection. It does not run the official OpenDataLoader Java or Node.js package, which cannot execute on GitHub Pages. See [NOTICE](../NOTICE) for attribution.

The Markdown to PDF tab renders Markdown as printable HTML in the browser. The user chooses **Save as PDF** in the browser's print dialog. It does not create a PDF file silently or upload the Markdown to a server.

PDF extraction is limited to 40 MB per file. Scanned PDFs without a text layer require OCR and are reported as unsupported. Images in Markdown are not loaded into the print view, so remote image URLs cannot fetch content from uploaded files.
