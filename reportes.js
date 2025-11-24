// --- Lógica de UI ---
const tipoReporteEl = document.getElementById('tipoReporte');
const groupFechas = [document.getElementById('groupFechaInicio'), document.getElementById('groupFechaFin')];
const loteSelect = document.getElementById('loteSelect');

// Mostrar/Ocultar campos según el reporte
tipoReporteEl.addEventListener('change', () => {
  const tipo = tipoReporteEl.value;

  if (tipo === 'liquidacion') {
    // Liquidación: Solo Lote
    groupFechas.forEach(el => el.style.display = 'none');
    loteSelect.parentElement.style.display = 'flex';
    loteSelect.required = true;
    document.getElementById('fechaInicio').required = false;
  } else if (tipo === 'inventario-actual') {
    // Inventario Actual: Nada (es foto instantánea)
    groupFechas.forEach(el => el.style.display = 'none');
    loteSelect.parentElement.style.display = 'none';
    loteSelect.required = false;
    document.getElementById('fechaInicio').required = false;
  } else {
    // Estándar: Fechas (y Lote opcional)
    groupFechas.forEach(el => el.style.display = 'flex');
    loteSelect.parentElement.style.display = 'flex';
    loteSelect.required = false;
    document.getElementById('fechaInicio').required = true;
  }
});

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;
    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const lotes = await res.json();
    loteSelect.innerHTML = '<option value="">-- Seleccionar Lote --</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (${lote.estado})`;
      loteSelect.appendChild(option);
    });
  } catch (e) { console.error(e); }
}

// --- Generación ---
let currentReportData = null;

async function generarReporte(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = tipoReporteEl.value;

  const payload = {
    tipoReporte: tipo,
    granjaId: granjaId,
    loteId: loteSelect.value || null,
    fechaInicio: document.getElementById('fechaInicio').value || new Date().toISOString(),
    fechaFin: document.getElementById('fechaFin').value || new Date().toISOString()
  };

  try {
    const btn = document.getElementById('btnGenerar');
    btn.textContent = 'Procesando...';
    btn.disabled = true;

    const res = await fetch(`${window.API_URL}/reporte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error del servidor');
    }

    currentReportData = await res.json();
    mostrarResultados(currentReportData, tipo);

  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    const btn = document.getElementById('btnGenerar');
    btn.textContent = 'Generar Informe';
    btn.disabled = false;
  }
}

function mostrarResultados(data, tipo) {
  document.getElementById('previewArea').style.display = 'block';
  const tbody = document.getElementById('reporteTableBody');
  const thead = document.getElementById('reporteTableHead');
  const resumenDiv = document.getElementById('liquidacionResumen');

  tbody.innerHTML = '';
  thead.innerHTML = '';
  resumenDiv.style.display = 'none';

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">Sin datos.</td></tr>';
    return;
  }

  if (tipo === 'liquidacion') {
    const kpi = data[0];
    resumenDiv.style.display = 'block';
    document.querySelector('.tabla-responsive-wrapper').style.display = 'none';

    resumenDiv.innerHTML = `
            <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Liquidación: ${kpi.lote}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                <div>
                    <h4 style="color: #7f8c8d;">Producción</h4>
                    <p><strong>Aves Iniciadas:</strong> ${kpi.avesIniciadas} <small>(M:${kpi.machos}/H:${kpi.hembras})</small></p>
                    <p><strong>Aves Vendidas:</strong> ${kpi.avesVendidas}</p>
                    <p><strong>Conversión (CA):</strong> <span style="color: blue;">${kpi.conversion}</span></p>
                    <p><strong>Mortalidad:</strong> <span style="color: red;">${kpi.mortalidad}</span></p>
                </div>
                <div>
                    <h4 style="color: #7f8c8d;">Finanzas</h4>
                    <p><strong>Venta Total:</strong> ${kpi.totalIngresos.toFixed(2)}</p>
                    <p><strong>Costo Total:</strong> ${kpi.totalCostos.toFixed(2)}</p>
                    <p><strong>Utilidad:</strong> <span style="color: green; font-size: 1.2rem;">$${kpi.utilidad.toFixed(2)}</span></p>
                    <p><strong>Rentabilidad:</strong> ${kpi.rentabilidad}</p>
                </div>
            </div>
        `;
  } else {
    document.querySelector('.tabla-responsive-wrapper').style.display = 'block';
    const headers = Object.keys(data[0]);
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = headers.map(h => `<td>${row[h]}</td>`).join('');
      tbody.appendChild(tr);
    });
  }

  document.getElementById('btnDescargarPDF').onclick = () => generarPDF(data, tipo);
}

function generarPDF(data, tipo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // Header Corporativo
  doc.setFillColor(44, 62, 80);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("VincWill Intelligence", 14, 16);

  doc.setFontSize(10);
  doc.text(`Granja: ${granja.nombre}`, 190, 16, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(tipo.toUpperCase().replace('-', ' '), 14, 40);
  doc.setFontSize(10);
  doc.text(`Fecha Emisión: ${new Date().toLocaleString()}`, 14, 46);

  if (tipo === 'liquidacion') {
    const kpi = data[0];

    // Bloque de Datos
    doc.setDrawColor(200);
    doc.line(14, 50, 196, 50);

    doc.text(`Lote: ${kpi.lote}`, 14, 60);
    doc.text(`Proveedor: ${kpi.proveedor}`, 100, 60);

    // Tabla manual para detalles
    doc.autoTable({
      startY: 70,
      head: [['Indicador', 'Valor', 'Indicador', 'Valor']],
      body: [
        ['Aves Iniciadas', `${kpi.avesIniciadas}`, 'Machos / Hembras', `${kpi.machos} / ${kpi.hembras}`],
        ['Aves Vendidas', `${kpi.avesVendidas}`, 'Peso Promedio', `${kpi.pesoPromedio}`],
        ['Mortalidad', `${kpi.mortalidad}`, 'Conversión (CA)', `${kpi.conversion}`],
        ['', '', '', ''], // Espacio
        ['Ingresos Totales', `$${kpi.totalIngresos.toFixed(2)}`, 'Costos Totales', `$${kpi.totalCostos.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] }
    });

    // Resultado Final Grande
    doc.setFontSize(16);
    doc.setTextColor(39, 174, 96); // Verde
    doc.text(`UTILIDAD NETA: $${kpi.utilidad.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 20);
    doc.setTextColor(100);
    doc.setFontSize(12);
    doc.text(`Rentabilidad: ${kpi.rentabilidad}`, 14, doc.lastAutoTable.finalY + 28);

  } else if (tipo === 'inventario-actual') {
    // Reporte de Inventario Valorizado
    const headers = Object.keys(data[0]);
    const body = data.map(Object.values);

    doc.autoTable({
      startY: 55,
      head: [headers],
      body: body,
      theme: 'striped',
      styles: { fontSize: 8 },
      columnStyles: {
        5: { fontStyle: 'bold', halign: 'right' } // Columna de Valor Total alineada a la derecha
      },
      didParseCell: function (data) {
        // Poner en negrita la fila de TOTAL ACTIVOS
        if (data.row.raw[0] === 'TOTAL ACTIVOS') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
        }
      }
    });

  } else {
    // Tabla Genérica
    const headers = Object.keys(data[0]);
    const body = data.map(Object.values);
    doc.autoTable({ startY: 55, head: [headers], body: body });
  }

  doc.save(`Reporte_${tipo}.pdf`);
}

document.addEventListener('DOMContentLoaded', () => {
  cargarLotesForSelect();

  const form = document.getElementById('reporteForm');
  if (form) form.onsubmit = generarReporte;
});