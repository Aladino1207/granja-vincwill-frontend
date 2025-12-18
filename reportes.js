// --- Lógica de UI ---
const tipoReporteEl = document.getElementById('tipoReporte');
const groupLote = document.getElementById('groupLote');
const groupLoteB = document.getElementById('groupLoteB');
const groupFechas = [document.getElementById('groupFechaInicio'), document.getElementById('groupFechaFin')];
const loteSelect = document.getElementById('loteSelect');
const loteSelectB = document.getElementById('loteSelectB');

// Mostrar/Ocultar campos según el reporte
tipoReporteEl.addEventListener('change', () => {
  const tipo = tipoReporteEl.value;

  // Resetear visibilidad
  groupFechas.forEach(el => el.style.display = 'none');
  groupLote.style.display = 'none';
  groupLoteB.style.display = 'none';

  // Lógica de visibilidad
  if (tipo === 'liquidacion') {
    groupLote.style.display = 'block';
    document.getElementById('lblLoteA').textContent = "Seleccionar Lote";
  }
  else if (tipo === 'comparativa') {
    groupLote.style.display = 'block';
    groupLoteB.style.display = 'block'; // Mostrar segundo selector
    document.getElementById('lblLoteA').textContent = "Lote A (Base)";
  }
  else if (tipo === 'inventario-actual') {
    // Nada
  }
  else {
    // Costos, Ventas, Sanitario
    groupFechas.forEach(el => el.style.display = 'block');
    groupLote.style.display = 'block'; // Opcional en estos reportes
    document.getElementById('lblLoteA').textContent = "Filtrar por Lote (Opcional)";
  }
});

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const lotes = await res.json();

    // Función interna para llenar un select
    const llenar = (selectEl) => {
      selectEl.innerHTML = '<option value="">Selecciona un Lote</option>';
      lotes.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = `${l.loteId} (${l.estado})`;
        selectEl.appendChild(opt);
      });
    };

    llenar(loteSelect);
    llenar(loteSelectB);

  } catch (error) { console.error(error); }
}

// --- Generación ---
let currentReportData = null;

async function generarReporte(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = tipoReporteEl.value;

  // --- 1. LÓGICA NUEVA: CAMINO DE COMPARATIVA ---
  if (tipo === 'comparativa') {
    const idA = loteSelect.value;
    const idB = loteSelectB.value;

    if (!idA || !idB) return alert("Debes seleccionar dos lotes distintos");
    if (idA === idB) return alert("¡Selecciona lotes diferentes para comparar!");

    try {
      const btn = document.getElementById('btnGenerar');
      if (btn) { btn.textContent = 'Comparando...'; btn.disabled = true; }

      const res = await fetch(`${window.API_URL}/comparativa?granjaId=${granjaId}&loteA=${idA}&loteB=${idB}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Error en la comparación");

      const data = await res.json();
      generarTablaComparativa(data); // <--- Llamamos a la nueva función visual

    } catch (err) {
      alert("Error al comparar: " + err.message);
      console.error(err);
    } finally {
      const btn = document.getElementById('btnGenerar');
      if (btn) { btn.textContent = 'Generar Informe'; btn.disabled = false; }
    }
    return; // <--- IMPORTANTE: Aquí termina si es comparativa
  }

  // --- 2. LÓGICA ANTIGUA: REPORTE ESTÁNDAR (Tu código original intacto) ---
  const payload = {
    tipoReporte: tipo,
    granjaId: granjaId,
    loteId: loteSelect.value || null,
    fechaInicio: document.getElementById('fechaInicio').value || new Date().toISOString(),
    fechaFin: document.getElementById('fechaFin').value || new Date().toISOString()
  };

  try {
    const btn = document.getElementById('btnGenerar');
    if (btn) { btn.textContent = 'Procesando...'; btn.disabled = true; }

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
    if (btn) { btn.textContent = 'Generar Informe'; btn.disabled = false; }
  }
}

// --- FUNCIONES PARA COMPARATIVA ---

function generarTablaComparativa(data) {
  const { loteA, loteB } = data;
  const tbody = document.getElementById('reporteTableBody');
  const thead = document.getElementById('reporteTableHead');
  const area = document.getElementById('previewArea');
  const resumen = document.getElementById('liquidacionResumen');

  // Preparar UI
  area.style.display = 'block';
  resumen.style.display = 'none';
  document.querySelector('.tabla-responsive-wrapper').style.display = 'block';

  // Encabezados
  thead.innerHTML = `
        <tr>
            <th>Métrica</th>
            <th>${loteA.nombre}</th>
            <th>${loteB.nombre}</th>
            <th>Diferencia</th>
            <th>Ganador</th>
        </tr>
    `;

  // Definición de Métricas
  const metricas = [
    { key: 'ingresos', label: 'Ingresos Totales ($)', esMejorMayor: true },
    { key: 'egresos', label: 'Costos Totales ($)', esMejorMayor: false },
    { key: 'utilidad', label: 'Utilidad Neta ($)', esMejorMayor: true },
    { key: 'rentabilidad', label: 'Rentabilidad (ROI)', esMejorMayor: true },
    { key: 'mortalidad', label: 'Mortalidad', esMejorMayor: false }, // Texto complejo
    { key: 'costoPorAve', label: 'Costo Prod. por Ave ($)', esMejorMayor: false },
    { key: 'pesoTotal', label: 'Peso Total Vendido (Kg)', esMejorMayor: true }
  ];

  tbody.innerHTML = '';

  metricas.forEach(m => {
    const valA = loteA[m.key];
    const valB = loteB[m.key];

    // Limpieza de datos para cálculo numérico (quitar %, paréntesis, letras)
    let numA = parseFloat(String(valA).replace('%', '').split(' ')[0]) || 0;
    let numB = parseFloat(String(valB).replace('%', '').split(' ')[0]) || 0;

    let dif = (numA - numB).toFixed(2);
    let ganador = '-';
    let color = '#7f8c8d'; // Gris por defecto

    if (numA !== numB) {
      // Lógica para determinar ganador
      let ganaA = m.esMejorMayor ? (numA > numB) : (numA < numB);
      ganador = ganaA ? loteA.nombre : loteB.nombre;
      color = '#27ae60'; // Verde siempre para el ganador visualmente
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td><strong>${m.label}</strong></td>
            <td>${valA}</td>
            <td>${valB}</td>
            <td>${dif}</td>
            <td style="color: ${color}; font-weight: bold;">${ganador}</td>
        `;
    tbody.appendChild(tr);
  });

  // Configurar botón PDF específico
  document.getElementById('btnDescargarPDF').onclick = () => exportarPDFComparativa(loteA, loteB);
}

function exportarPDFComparativa(loteA, loteB) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // Header
  doc.setFillColor(44, 62, 80);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Reporte Comparativo de Lotes", 14, 16);
  doc.setFontSize(10);
  doc.text(`Granja: ${granja.nombre}`, 190, 16, { align: 'right' });

  doc.setTextColor(0);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 35);

  // Tabla
  doc.autoTable({
    html: '#reporteTable',
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [52, 152, 219] },
    styles: { halign: 'center' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
  });

  // Veredicto
  let utilA = parseFloat(loteA.utilidad);
  let utilB = parseFloat(loteB.utilidad);
  let mejor = utilA > utilB ? loteA.nombre : loteB.nombre;
  let extra = Math.abs(utilA - utilB).toFixed(2);

  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Conclusión basada en utilidad neta:", 14, finalY);

  doc.setFontSize(14);
  doc.setTextColor(39, 174, 96);
  doc.setFont("helvetica", "bold");
  doc.text(`El lote más rentable fue ${mejor} generando $${extra} adicionales.`, 14, finalY + 7);

  doc.save(`Versus_${loteA.nombre}_vs_${loteB.nombre}.pdf`);
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