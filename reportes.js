// --- Lógica de UI ---
const tipoReporteEl = document.getElementById('tipoReporte');
const groupFechas = [document.getElementById('groupFechaInicio'), document.getElementById('groupFechaFin')];
const loteSelect = document.getElementById('loteSelect');

// Mostrar/Ocultar campos según el reporte
tipoReporteEl.addEventListener('change', () => {
  const tipo = tipoReporteEl.value;
  if (tipo === 'liquidacion') {
    // Liquidación requiere Lote, no fechas
    groupFechas.forEach(el => el.style.display = 'none');
    loteSelect.required = true;
    document.getElementById('fechaInicio').required = false;
    document.getElementById('fechaFin').required = false;
  } else {
    // Otros reportes requieren fechas
    groupFechas.forEach(el => el.style.display = 'flex');
    loteSelect.required = false;
    document.getElementById('fechaInicio').required = true;
    document.getElementById('fechaFin').required = true;
  }
});

async function cargarLotesForSelect() {
  // (Misma lógica blindada de siempre...)
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

// --- Generación de Datos ---
let currentReportData = null;

async function generarReporte(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = tipoReporteEl.value;

  // Preparar payload
  const payload = {
    tipoReporte: tipo,
    granjaId: granjaId,
    loteId: loteSelect.value || null,
    fechaInicio: document.getElementById('fechaInicio').value || new Date().toISOString(),
    fechaFin: document.getElementById('fechaFin').value || new Date().toISOString()
  };

  try {
    const btn = document.getElementById('btnGenerar');
    btn.textContent = 'Analizando...';
    btn.disabled = true;

    const res = await fetch(`${window.API_URL}/reporte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Error en el servidor');
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

  // Si es LIQUIDACIÓN, mostramos tarjeta de resumen especial
  if (tipo === 'liquidacion') {
    const kpi = data[0]; // Viene un solo objeto con todo
    resumenDiv.style.display = 'block';
    resumenDiv.innerHTML = `
            <h4 style="color: var(--color-primario); border-bottom: 1px solid #ddd; padding-bottom: 10px;">Resumen del Lote: ${kpi.lote}</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 15px;">
                <div><strong>Aves Iniciadas:</strong> ${kpi.avesIniciadas}</div>
                <div><strong>Aves Vendidas:</strong> ${kpi.avesVendidas}</div>
                <div><strong>Mortalidad:</strong> <span style="color: red;">${kpi.mortalidad}</span></div>
                <div><strong>Conversión (CA):</strong> <span style="color: blue;">${kpi.conversion}</span></div>
                <div><strong>Utilidad Neta:</strong> <span style="color: green; font-size: 1.2rem;">$${kpi.utilidad.toFixed(2)}</span></div>
                <div><strong>Rentabilidad:</strong> <strong>${kpi.rentabilidad}</strong></div>
            </div>
        `;
    // Ocultamos la tabla tradicional porque la liquidación es un formato libre
    document.querySelector('.tabla-responsive-wrapper').style.display = 'none';
  } else {
    // Reportes normales (tablas)
    document.querySelector('.tabla-responsive-wrapper').style.display = 'block';
    const headers = Object.keys(data[0]);
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = headers.map(h => `<td>${row[h]}</td>`).join('');
      tbody.appendChild(tr);
    });
  }

  // Activar botón PDF
  document.getElementById('btnDescargarPDF').onclick = () => generarPDF(data, tipo);
}

// --- Generador PDF Avanzado ---
function generarPDF(data, tipo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // Título
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text(tipo === 'liquidacion' ? 'LIQUIDACIÓN DE LOTE' : `REPORTE DE ${tipo.toUpperCase()}`, 105, 20, null, null, 'center');

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Granja: ${granja.nombre}`, 14, 30);
  doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 14, 35);

  if (tipo === 'liquidacion') {
    // Diseño especial para Liquidación (Tipo Factura)
    const kpi = data[0];

    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);

    // Bloque Producción
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("Indicadores Productivos", 14, 50);
    doc.setFontSize(11); doc.setTextColor(80);
    doc.text(`Lote: ${kpi.lote}`, 14, 60);
    doc.text(`Proveedor: ${kpi.proveedor}`, 14, 66);
    doc.text(`Aves Iniciadas: ${kpi.avesIniciadas}`, 14, 72);
    doc.text(`Mortalidad: ${kpi.mortalidad}`, 14, 78);
    doc.text(`Conversión (CA): ${kpi.conversion}`, 100, 60);
    doc.text(`Peso Promedio: ${kpi.pesoPromedio}`, 100, 66);
    doc.text(`Consumo Total: ${kpi.consumoTotal}`, 100, 72);

    // Bloque Financiero
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("Balance Financiero", 14, 95);
    doc.autoTable({
      startY: 100,
      head: [['Concepto', 'Valor']],
      body: [
        ['Ingresos Totales (Venta)', `$ ${kpi.totalIngresos.toFixed(2)}`],
        ['Costos Totales Producción', `$ ${kpi.totalCostos.toFixed(2)}`],
        [{ content: 'UTILIDAD NETA', styles: { fontStyle: 'bold', fillColor: [230, 255, 230] } }, `$ ${kpi.utilidad.toFixed(2)}`],
        ['Rentabilidad sobre Costo', kpi.rentabilidad]
      ],
      theme: 'grid',
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

  } else {
    // Tabla estándar para otros reportes
    const headers = Object.keys(data[0]);
    const body = data.map(Object.values);
    doc.autoTable({
      head: [headers],
      body: body,
      startY: 45,
      theme: 'striped'
    });
  }

  doc.save(`Reporte_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  cargarLotesForSelect();
  // Inicializar lógica de perfil y sidebar
  initializeUserProfile();
  initializeSidebar();
});