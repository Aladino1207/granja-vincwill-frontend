// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // CORRECCIÓN: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Todos los Lotes</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      // Mostramos Lote ID y si está vendido o disponible
      option.textContent = `${lote.loteId} (${lote.estado})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

// --- Funciones de Reporte (BLINDADAS) ---

async function generarReporte(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipoReporte = document.getElementById('tipoReporte').value;
  const loteId = document.getElementById('loteSelect').value || '';
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;

  if (!fechaInicio || !fechaFin) {
    alert('Por favor, selecciona ambas fechas.');
    return;
  }

  // Deshabilitar botón de PDF mientras se carga
  const pdfBtn = document.querySelector('button[type="submit"]'); // O el ID si tiene
  const originalText = pdfBtn.textContent;
  pdfBtn.disabled = true;
  pdfBtn.textContent = 'Generando...';

  try {
    const res = await fetch(`${window.API_URL}/reporte`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      // CORRECCIÓN: Enviamos granjaId en el body
      body: JSON.stringify({
        tipoReporte,
        loteId,
        fechaInicio,
        fechaFin,
        granjaId
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    mostrarPrevisualizacion(data, tipoReporte);

    // Si tienes un botón específico para descargar PDF aparte:
    // const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    // if(downloadPdfBtn) { ... } 

    // Por simplicidad, en tu versión actual el botón de generar hace todo o muestra la tabla.
    // Si quieres descarga automática:
    if (data.length > 0 && confirm("Reporte generado. ¿Deseas descargar el PDF ahora?")) {
      generarPDF(data, tipoReporte, fechaInicio, fechaFin);
    }

  } catch (error) {
    console.error('Error al generar reporte:', error);
    alert('Error al generar reporte: ' + error.message);
  } finally {
    pdfBtn.disabled = false;
    pdfBtn.textContent = originalText;
  }
}

function mostrarPrevisualizacion(data, tipoReporte) {
  const tbody = document.getElementById('reporteTableBody');
  const thead = document.getElementById('reporteTableHead');
  if (!tbody || !thead) return;

  tbody.innerHTML = '';
  thead.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay datos para los criterios seleccionados.</td></tr>';
    return;
  }

  // Generar cabeceras dinámicamente basadas en el primer objeto
  const headers = Object.keys(data[0]);
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = headers.map(h => {
      let val = row[h];
      // Formato simple para dinero si parece dinero
      if (typeof val === 'number' && (h.includes('Monto') || h.includes('Costo') || h.includes('Precio'))) {
        val = `$${val.toFixed(2)}`;
      }
      return `<td>${val || '-'}</td>`;
    }).join('');
    tbody.appendChild(tr);
  });
}

function generarPDF(data, tipoReporte, fechaInicio, fechaFin) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(44, 62, 80);
  doc.text(`Reporte: ${tipoReporte.toUpperCase()}`, 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Granja: ${granja.nombre || 'Principal'}`, 14, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 36);
  doc.text(`Periodo: ${fechaInicio} al ${fechaFin}`, 14, 42);

  // Tabla
  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    const body = data.map(row => Object.values(row));

    doc.autoTable({
      head: [headers],
      body: body,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' } // Si hubiera pie
    });
  } else {
    doc.text('No hay datos disponibles.', 14, 60);
  }

  // Numeración de páginas
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
  }

  doc.save(`Reporte_${tipoReporte}_${fechaInicio}.pdf`);
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));
  if (granja) {
    const title = document.querySelector('header h1');
    if (title) title.textContent = `Reportes (${granja.nombre})`;
  }

  // Asignar el evento al formulario
  const form = document.getElementById('reporteForm');
  if (form) form.onsubmit = generarReporte;

  cargarLotesForSelect();
});