import { EstadoOrden } from '@core/models';

/**
 * Regla de negocio: un resultado solo se descarga cuando la orden está cerrada.
 * Sin backend, genera un PDF de muestra para que el flujo sea demostrable.
 */
export function descargarResultado(estado: EstadoOrden, nombreArchivo: string, titulo: string): boolean {
  if (estado !== 'cerrada') return false;
  const texto = `MediLink - ${titulo}`.replace(/[()\\]/g, '');
  const contenido = `BT /F1 18 Tf 72 720 Td (${texto}) Tj 0 -28 Td /F1 11 Tf (Documento de demostracion. Datos ficticios.) Tj ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${o.toString().padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.replace(/\.(dcm|dicom)$/i, '.pdf');
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
