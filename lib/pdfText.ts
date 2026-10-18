/** Extracts text from a PDF in the browser, keeping line breaks. */
export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    let lastY: number | null = null;
    for (const item of content.items as any[]) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) out += "\n";
      out += item.str + (item.hasEOL ? "\n" : " ");
      lastY = y;
    }
    out += "\n";
  }
  return out;
}
