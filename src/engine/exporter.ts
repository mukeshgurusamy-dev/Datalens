import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { cleanSlug } from './unslug';

export interface ExportOptions {
  datasetName: string;
  elementId: string;
}

/**
 * Downloads a high-resolution 2x Retina PNG snapshot of the dashboard.
 */
export async function exportDashboardAsPng(element: HTMLElement, datasetName: string): Promise<string> {
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2, // 2x Retina resolution
    backgroundColor: '#09090b',
    filter: (node) => {
      // Exclude UI controls, buttons, customizers from the export
      if (node instanceof HTMLElement && node.getAttribute('data-export-ignore') === 'true') {
        return false;
      }
      return true;
    },
  });

  const slug = cleanSlug(datasetName);
  const link = document.createElement('a');
  link.download = `${slug}-analytics-snapshot.png`;
  link.href = dataUrl;
  link.click();

  return dataUrl;
}

/**
 * Generates an executive, multi-page A4 PDF report with boardroom branding.
 */
export async function exportDashboardAsPdf(element: HTMLElement, datasetName: string): Promise<void> {
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: '#09090b',
    filter: (node) => {
      if (node instanceof HTMLElement && node.getAttribute('data-export-ignore') === 'true') {
        return false;
      }
      return true;
    },
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12; // 12mm margins
  const contentWidth = pageWidth - margin * 2;

  // Calculate scaled image dimensions
  const imgProps = pdf.getImageProperties(dataUrl);
  const scaledHeight = (imgProps.height * contentWidth) / imgProps.width;

  let heightLeft = scaledHeight;
  let position = margin + 15; // Reserve top 15mm for boardroom header
  let page = 1;

  // Function to add executive boardroom header on each page
  const addExecutiveHeader = (pageNum: number) => {
    pdf.setFillColor(18, 18, 21); // Dark sleek background bar
    pdf.rect(0, 0, pageWidth, 16, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`DataLens Executive Briefing — ${datasetName}`, margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(161, 161, 170); // Zinc-400
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    pdf.text(`${dateStr} • Page ${pageNum}`, pageWidth - margin - 35, 10);

    // Subtle 1px dividing line
    pdf.setDrawColor(39, 39, 42);
    pdf.line(0, 16, pageWidth, 16);
  };

  // Page 1
  addExecutiveHeader(page);
  pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, scaledHeight, undefined, 'FAST');
  heightLeft -= (pageHeight - position - margin);

  // Split across multiple pages if content extends beyond A4 boundary
  while (heightLeft > 0) {
    page++;
    position = -(pageHeight * (page - 1)) + margin + 15;
    pdf.addPage();
    addExecutiveHeader(page);
    pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, scaledHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  const slug = cleanSlug(datasetName);
  pdf.save(`${slug}-executive-report.pdf`);
}
