// --- Variables Globales ---
let inventarioAlimentos = [];

console.log("seguimiento.js cargado y listo");

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
      // Guardamos datos para validación
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

      // Formato Decimales
      const pesoVisual = s.pesoPromedio ? Number(s.pesoPromedio).toFixed(4).replace(/\.?0+$/, "") : '-';

      let infoConsumo = '-';
      if (s.consumoAlimento > 0) {
        const consumoVal = Number(s.consumoAlimento).toFixed(2).replace(/\.?0+$/, "");
        const prodNombre = s.Inventario ? s.Inventario.producto : 'Alimento';
        infoConsumo = `${consumoVal} (${prodNombre})`;
      }

      tr.innerHTML = `
        <td>${s.Lote ? s.Lote.loteId : 'N/A'}</td>
        <td>Semana ${s.semanaVida}</td>
        <td>${pesoVisual} lb</td>
        <td>${infoConsumo}</td>
        <td>${s.observaciones || '-'}</td>
        <td>${new Date(s.fechaRegistro).toLocaleDateString()}</td>
        <td>
          <button onclick="eliminarSeguimiento(${s.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

// ==========================================
// 2. GUARDADO
// ==========================================

async function guardarSeguimiento(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();

  // --- VALIDACIÓN DE DOM (Para evitar el error null value) ---
  const elLote = document.getElementById('loteSelect');
  const elSemana = document.getElementById('semanaVida');
  const elPeso = document.getElementById('pesoPromedio');
  const elObs = document.getElementById('observaciones');
  const elFecha = document.getElementById('fechaRegistro');
  const elAlimento = document.getElementById('alimentoSelect');
  const elConsumo = document.getElementById('consumoAlimento');

  if (!elLote || !elSemana || !elFecha) {
    console.error("Faltan elementos ID en el HTML. IDs Esperados: loteSelect, semanaVida, fechaRegistro");
    return alert("Error interno del formulario (IDs faltantes). Revisa la consola.");
  }

  // --- OBTENCIÓN DE VALORES ---
  const loteId = elLote.value;
  const semanaVida = elSemana.value;
  const pesoPromedio = elPeso ? (parseFloat(elPeso.value) || 0) : 0;
  const observaciones = elObs ? elObs.value : "";
  const fechaRegistro = elFecha.value;

  // Lógica de Alimento
  const alimentoIdVal = elAlimento ? elAlimento.value : "";
  const consumoVal = elConsumo ? (parseFloat(elConsumo.value) || 0) : 0;

  let alimentoId = null;
  let consumoFinal = 0;

  if (alimentoIdVal && consumoVal > 0) {
    alimentoId = parseInt(alimentoIdVal);
    consumoFinal = consumoVal;

    // Validación de Stock
    const opcion = elAlimento.options[elAlimento.selectedIndex];
    if (opcion && opcion.dataset.stock) {
      const stock = parseFloat(opcion.dataset.stock);
      const unidad = opcion.dataset.unidad;

      // Margen de error pequeño por flotantes
      if (consumoFinal > (stock + 0.0001)) {
        return alert(`❌ Stock Insuficiente.\nTienes: ${stock} ${unidad}\nIntentas registrar: ${consumoFinal}`);
      }
    }
  }

  const payload = {
    granjaId,
    loteId: parseInt(loteId),
    semanaVida: parseInt(semanaVida),
    pesoPromedio: pesoPromedio,
    consumoAlimento: consumoFinal,
    alimentoId: alimentoId,
    observaciones,
    fechaRegistro
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
      cargarAlimentosParaSelect(); // Refrescar stock visual
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

// --- UI Helpers ---
function abrirFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.add('is-open');
  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Cancelar';

  // Fecha hoy por defecto
  const fechaIn = document.getElementById('fechaRegistro');
  if (fechaIn && !fechaIn.value) fechaIn.value = new Date().toISOString().split('T')[0];
}

function cerrarFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.remove('is-open');
  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Registrar Seguimiento';

  const form = document.getElementById('seguimientoForm');
  if (form) form.reset();

  const idField = document.getElementById('seguimientoId');
  if (idField) idField.value = '';

  const stockLbl = document.getElementById('stockInfo');
  if (stockLbl) stockLbl.textContent = '';
}

// --- Event Listener Principal ---
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

  // Listener para mostrar stock al cambiar alimento
  const alimSelect = document.getElementById('alimentoSelect');
  if (alimSelect) {
    alimSelect.addEventListener('change', () => {
      const opt = alimSelect.options[alimSelect.selectedIndex];
      const lbl = document.getElementById('stockInfo');
      if (opt && opt.dataset.stock && lbl) {
        lbl.textContent = `Disponible: ${opt.dataset.stock} ${opt.dataset.unidad}`;
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