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
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = headers.map(h => `<td>${row[h] || 'N/A'}</td>`).join('');
    tbody.appendChild(tr);
  });
}

function generarPDF(data, tipoReporte) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Reporte ${tipoReporte.charAt(0).toUpperCase() + tipoReporte.slice(1)}`, 10, 10);

  if (data && data.length) {
    doc.autoTable({
      head: [Object.keys(data[0])],
      body: data.map(row => Object.values(row)),
      startY: 20,
      styles: { overflow: 'linebreak' },
      columnStyles: { text: { cellWidth: 'auto' } }
    });
  } else {
    doc.text('No hay datos disponibles para este reporte.', 10, 20);
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