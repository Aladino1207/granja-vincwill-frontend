async function cargarLotesForSelect() {
  try {
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) throw new Error('Elemento loteSelect no encontrado');
    select.innerHTML = '<option value="">Todos los Lotes</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Cantidad: ${lote.cantidad})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
    alert('Error al cargar lotes: ' + error.message);
  }
}

async function generarReporte(e) {
  e.preventDefault();
  const tipoReporte = document.getElementById('tipoReporte').value;
  const loteId = document.getElementById('loteSelect').value || '';
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;

  if (!fechaInicio || !fechaFin) {
    alert('Por favor, selecciona ambas fechas.');
    return;
  }

  try {
    const res = await fetch(`${window.API_URL}/reporte`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ tipoReporte, loteId, fechaInicio, fechaFin })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    mostrarPrevisualizacion(data);
    generarPDF(data, tipoReporte);
  } catch (error) {
    console.error('Error al generar reporte:', error);
    alert('Error al generar reporte: ' + error.message);
  }
}

function mostrarPrevisualizacion(data) {
  const tbody = document.getElementById('reporteTableBody');
  const thead = document.getElementById('reporteTableHead');
  tbody.innerHTML = '';
  thead.innerHTML = '';

  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="5">No hay datos para mostrar</td></tr>';
    return;
  }

  const headers = Object.keys(data[0]);
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th>`).join('')}</tr>`;

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = headers.map(h => `<td>${row[h] || 'N/A'}</td>`).join('');
    tbody.appendChild(tr);
  });
}

function generarPDF(data, tipoReporte) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Encabezado
  doc.setFontSize(18);
  doc.text(`Reporte de ${tipoReporte.charAt(0).toUpperCase() + tipoReporte.slice(1)}`, 10, 10);
  doc.setFontSize(12);
  doc.text(`Granja Avícola VincWill - Generado el: ${new Date().toLocaleString()}`, 10, 15);
  if (data.length) {
    doc.text(`Período: ${data[0].fecha} a ${data[data.length - 1].fecha}`, 10, 20);
  }

  // Tabla
  if (data && data.length) {
    doc.autoTable({
      head: [Object.keys(data[0]).map(h => h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))],
      body: data.map(row => Object.values(row)),
      startY: 30,
      styles: { overflow: 'linebreak', fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 12 },
      columnStyles: { text: { cellWidth: 'auto' } }
    });
  } else {
    doc.text('No hay datos disponibles para este reporte.', 10, 30);
  }

  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Página ${i} de ${pageCount}`, 190, 290);
    doc.text('© 2025 Granja Avícola VincWill', 10, 290);
  }

  doc.save(`reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.pdf`);
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('reporteForm').style.display = 'grid';
    document.getElementById('reporteTable').style.display = 'table';
  }
  cargarLotesForSelect();
});