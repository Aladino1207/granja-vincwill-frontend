// --- Variables Globales ---
let inventarioAlimentos = [];

console.log("seguimiento.js cargado y listo (Versión Compatible)");

// ==========================================
// 1. CARGA DE DATOS
// ==========================================

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    // Filtramos lotes activos
    const lotesActivos = Array.isArray(lotes)
      ? lotes.filter(l => l.estado === 'disponible' || l.estado === 'ocupado')
      : [];

    lotesActivos.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId}`;
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarAlimentosParaSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const items = await res.json();

    // Filtrar solo Alimentos y guardar en memoria
    if (Array.isArray(items)) {
      inventarioAlimentos = items.filter(i => i.categoria === 'Alimento' && i.cantidad > 0);
    }

    const select = document.getElementById('alimentoSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona Alimento</option>';

    inventarioAlimentos.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      const unidad = item.unidadMedida || 'Unidades';

      option.textContent = `${item.producto}`;
      // Guardamos datos para validación y visualización
      option.dataset.stock = item.cantidad;
      option.dataset.unidad = unidad;

      select.appendChild(option);
    });
  } catch (error) { console.error('Error al cargar alimentos:', error); }
}

async function cargarSeguimientos() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/seguimiento?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('tablaSeguimiento');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros de seguimiento.</td></tr>';
      return;
    }

    data.forEach(s => {
      const tr = document.createElement('tr');

      // Mapeo de nombres antiguos (Backend) a visualización
      // Backend: s.peso | Frontend nuevo quería: s.pesoPromedio
      const pesoVal = s.peso !== undefined ? s.peso : s.pesoPromedio;
      const pesoVisual = pesoVal ? Number(pesoVal).toFixed(4).replace(/\.?0+$/, "") : '-';

      // Backend: s.consumo | Frontend nuevo quería: s.consumoAlimento
      const consumoValRaw = s.consumo !== undefined ? s.consumo : s.consumoAlimento;

      let infoConsumo = '-';
      if (consumoValRaw > 0) {
        const consumoVal = Number(consumoValRaw).toFixed(4).replace(/\.?0+$/, "");
        const prodNombre = s.Inventario ? s.Inventario.producto : 'Alimento';
        // Asumimos unidad del inventario asociado si existe
        const unidad = s.Inventario ? (s.Inventario.unidadMedida || '') : '';
        infoConsumo = `${consumoVal} ${unidad} (${prodNombre})`;
      }

      tr.innerHTML = `
        <td>${s.Lote ? s.Lote.loteId : 'N/A'}</td>
        <td>Semana ${s.semana || s.semanaVida}</td>
        <td>${pesoVisual} lb</td>
        <td>${infoConsumo}</td>
        <td>${s.observaciones || '-'}</td>
        <td>${new Date(s.fecha || s.fechaRegistro).toLocaleDateString()}</td>
        <td>
          <button onclick="eliminarSeguimiento(${s.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

// ==========================================
// 2. CONVERSOR DE UNIDADES
// ==========================================

function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (!unidadBase || !unidadInput) return cantidadInput;

  const uIn = unidadInput.toLowerCase().trim().replace(/s$/, '');
  const uBase = unidadBase.toLowerCase().trim().replace(/s$/, '');

  if (uIn === uBase) return cantidadInput;

  console.log(`Convirtiendo Alimento: ${cantidadInput} ${uIn} a ${uBase}`);

  // --- PESO ---
  if (uBase === 'qq' || uBase === 'quintal') {
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 100;
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput / 45.36;
    if (uIn === 'saco') return cantidadInput;
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 45360;
  }
  if (uBase === 'lb' || uBase === 'libra') {
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput * 2.20462;
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput * 100;
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 453.592;
    if (uIn === 'saco') return cantidadInput * 100;
  }
  if (uBase === 'kg' || uBase === 'kilo') {
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 2.20462;
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput * 45.36;
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 1000;
    if (uIn === 'saco') return cantidadInput * 45.36;
  }
  if (uBase === 'saco') {
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput;
    if (uIn === 'lb') return cantidadInput / 100;
  }

  return cantidadInput;
}

// ==========================================
// 3. LOGICA DE GUARDADO (Payload Adaptado)
// ==========================================

async function guardarSeguimiento(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();

  // Elementos HTML
  const elLote = document.getElementById('loteSelect');
  const elSemana = document.getElementById('semanaVida');
  const elPeso = document.getElementById('pesoPromedio');
  const elObs = document.getElementById('observaciones');
  const elFecha = document.getElementById('fechaRegistro');
  const elAlimento = document.getElementById('alimentoSelect');
  const elConsumo = document.getElementById('consumoAlimento');
  const elUnidadConsumo = document.getElementById('unidadConsumo');

  if (!elLote || !elSemana || !elFecha || !elUnidadConsumo) {
    console.error("Faltan elementos ID en el HTML.");
    return alert("Error interno del formulario.");
  }

  // Valores del Formulario
  const loteId = elLote.value;
  const semanaVida = elSemana.value;
  const pesoPromedio = elPeso ? (parseFloat(elPeso.value) || 0) : 0;
  const observaciones = elObs ? elObs.value : "";
  const fechaRegistro = elFecha.value;

  // Lógica de Alimento
  const alimentoIdVal = elAlimento ? elAlimento.value : "";
  const consumoInput = elConsumo ? (parseFloat(elConsumo.value) || 0) : 0;
  const unidadInput = elUnidadConsumo.value;

  let alimentoId = null;
  let consumoFinal = 0;

  if (alimentoIdVal && consumoInput > 0) {
    alimentoId = parseInt(alimentoIdVal);

    const opcion = elAlimento.options[elAlimento.selectedIndex];
    if (opcion && opcion.dataset.stock) {
      const stock = parseFloat(opcion.dataset.stock);
      const unidadBase = opcion.dataset.unidad;

      consumoFinal = calcularCantidadBase(consumoInput, unidadInput, unidadBase);

      if (consumoFinal > (stock + 0.0001)) {
        return alert(`❌ Stock Insuficiente.\nInventario: ${stock} ${unidadBase}\nNecesitas: ${consumoFinal.toFixed(4)} ${unidadBase}\n(${consumoInput} ${unidadInput})`);
      }
    } else {
      consumoFinal = consumoInput;
    }
  }

  // --- TRADUCCIÓN DE NOMBRES PARA EL BACKEND ---
  // Convertimos las variables descriptivas del JS a los nombres de columna de la BD
  const payload = {
    granjaId,
    loteId: parseInt(loteId),
    semana: parseInt(semanaVida),      // Backend espera 'semana'
    peso: pesoPromedio,                // Backend espera 'peso'
    consumo: consumoFinal,             // Backend espera 'consumo'
    alimentoId: alimentoId,
    observaciones,
    fecha: fechaRegistro               // Backend espera 'fecha'
  };

  try {
    const res = await fetch(`${window.API_URL}/seguimiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Seguimiento registrado con éxito');
      cerrarFormulario();
      cargarSeguimientos();
      cargarAlimentosParaSelect();
    } else {
      const err = await res.json();
      alert('Error: ' + (err.error || 'No se pudo guardar'));
    }
  } catch (error) {
    console.error(error);
    alert('Error de conexión');
  }
}

async function eliminarSeguimiento(id) {
  if (confirm('¿Eliminar registro? Nota: El stock de alimento NO se devuelve automáticamente.')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/seguimiento/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarSeguimientos();
    } catch (error) {
      alert('Error al eliminar seguimiento');
    }
  }
}

function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
  const fechaIn = document.getElementById('fechaRegistro');
  if (fechaIn && !fechaIn.value) fechaIn.value = new Date().toISOString().split('T')[0];
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Seguimiento';
  document.getElementById('seguimientoForm').reset();
  document.getElementById('seguimientoId').value = '';
  const stockLbl = document.getElementById('stockInfo');
  if (stockLbl) stockLbl.textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const h1 = document.querySelector('header h1');
    if (h1) h1.textContent = `Seguimiento (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('seguimientoForm');

  const alimSelect = document.getElementById('alimentoSelect');
  if (alimSelect) {
    alimSelect.addEventListener('change', () => {
      const opt = alimSelect.options[alimSelect.selectedIndex];
      const lbl = document.getElementById('stockInfo');
      if (opt && opt.dataset.stock && lbl) {
        lbl.textContent = `Disponible: ${opt.dataset.stock} ${opt.dataset.unidad}`;

        const unidadStock = opt.dataset.unidad.toLowerCase();
        const unidadSelect = document.getElementById('unidadConsumo');
        if (unidadSelect) {
          if (unidadStock.includes('qq') || unidadStock.includes('quintal')) unidadSelect.value = 'qq';
          else if (unidadStock.includes('lb') || unidadStock.includes('libra')) unidadSelect.value = 'lb';
          else if (unidadStock.includes('kg') || unidadStock.includes('kilo')) unidadSelect.value = 'kg';
          else if (unidadStock.includes('saco')) unidadSelect.value = 'saco';
        }
      } else if (lbl) {
        lbl.textContent = '';
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const container = document.getElementById('formContainer');
        const isOpen = container && container.classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else abrirFormulario();
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarSeguimiento;

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarAlimentosParaSelect();
  cargarSeguimientos();
});