// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    select.innerHTML = '<option value="">Todos los Lotes</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId}`;
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
  // V 3.0: Obtenemos la granja activa
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
  const pdfBtn = document.getElementById('pdfBtn');
  pdfBtn.disabled = true;
  pdfBtn.textContent = 'Generando...';

  try {
    const res = await fetch(`${API_URL}/reporte`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      // V 3.0: Añadimos granjaId al body
      body: JSON.stringify({
        tipoReporte,
        loteId,
        fechaInicio,
        fechaFin,
        granjaId
      })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    mostrarPrevisualizacion(data, tipoReporte);

    // Habilitamos el botón de PDF
    pdfBtn.disabled = false;
    pdfBtn.textContent = 'Generar Reporte PDF';
    // Asignamos el evento con los datos ya cargados
    pdfBtn.onclick = () => {
      generarPDF(data, tipoReporte, fechaInicio, fechaFin);
    };

  } catch (error) {
    console.error('Error al generar reporte:', error);
    alert('Error al generar reporte: ' + error.message);
    pdfBtn.textContent = 'Generar Reporte PDF'; // Restaurar botón
  }
}

function mostrarPrevisualizacion(data, tipoReporte) {
  const tbody = document.getElementById('reporteTableBody');
  const thead = document.getElementById('reporteTableHead');
  tbody.innerHTML = '';
  thead.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No hay datos para mostrar</td></tr>';
    return;
  }

  // Usamos el primer objeto para sacar los headers
  const headers = Object.keys(data[0]);
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = headers.map(h => `<td>${row[h] || 'N/A'}</td>`).join('');
    tbody.appendChild(tr);
  });
}

function generarPDF(data, tipoReporte, fechaInicio, fechaFin) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // Encabezado
  doc.setFontSize(18);
  doc.text(`Reporte de ${tipoReporte.charAt(0).toUpperCase() + tipoReporte.slice(1)}`, 14, 22);
  doc.setFontSize(12);
  doc.text(`Granja: ${granja.nombre || 'N/A'}`, 14, 30);
  doc.setFontSize(10);
  doc.text(`Período: ${fechaInicio} a ${fechaFin}`, 14, 36);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 42);

  // Tabla
  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    const body = data.map(row => Object.values(row));

    doc.autoTable({
      head: [headers],
      body: body,
      startY: 50,
      styles: { overflow: 'linebreak', fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontSize: 9 },
    });
  } else {
    doc.text('No hay datos disponibles para este reporte.', 14, 50);
  }

  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
  }

  doc.save(`reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Reportes (${granja.nombre})`;
  }

  // Deshabilitar botón de PDF hasta que se generen datos
  document.getElementById('pdfBtn').disabled = true;

  // Asignar el evento al formulario principal
  document.getElementById('reporteForm').onsubmit = generarReporte;

  cargarLotesForSelect(); // Carga lotes de esta granja
});