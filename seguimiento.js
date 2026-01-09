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

      // Formato Decimales (4 dígitos, sin ceros extra)
      const pesoVisual = s.pesoPromedio ? Number(s.pesoPromedio).toFixed(4).replace(/\.?0+$/, "") : '-';

      let infoConsumo = '-';
      if (s.consumoAlimento > 0) {
        // Nota: Aquí mostramos lo que se guardó en BD (que es la unidad base del inventario)
        const consumoVal = Number(s.consumoAlimento).toFixed(4).replace(/\.?0+$/, "");
        const prodNombre = s.Inventario ? s.Inventario.producto : 'Alimento';
        // Idealmente deberíamos saber la unidad, pero asumimos la del producto
        const unidadDisplay = s.Inventario ? (s.Inventario.unidadMedida || '') : '';
        infoConsumo = `${consumoVal} ${unidadDisplay} (${prodNombre})`;
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
// 2. CONVERSOR DE UNIDADES (El Cerebro Matemático)
// ==========================================

function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (!unidadBase || !unidadInput) return cantidadInput;

  // Normalizar strings
  const uIn = unidadInput.toLowerCase().trim().replace(/s$/, '');
  const uBase = unidadBase.toLowerCase().trim().replace(/s$/, '');

  if (uIn === uBase) return cantidadInput;

  console.log(`Convirtiendo Alimento: ${cantidadInput} ${uIn} a ${uBase}`);

  // --- PESO (Lo más común en alimentos) ---

  // DESTINO: QUINTALES (qq) - Muy común en balanceado
  if (uBase === 'qq' || uBase === 'quintal') {
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 100; // 1 qq = 100 lb
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput / 45.36;
    if (uIn === 'saco') return cantidadInput; // Asumimos 1 saco = 1 qq si no se especifica
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 45360;
  }

  // DESTINO: LIBRAS (lb)
  if (uBase === 'lb' || uBase === 'libra') {
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput * 2.20462;
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput * 100;
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 453.592;
    if (uIn === 'saco') return cantidadInput * 100; // Asumiendo saco de 100lb
  }

  // DESTINO: KILOGRAMOS (kg)
  if (uBase === 'kg' || uBase === 'kilo') {
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 2.20462;
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput * 45.36;
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 1000;
    if (uIn === 'saco') return cantidadInput * 45.36;
  }

  // DESTINO: SACOS (Si la base es 'saco')
  if (uBase === 'saco') {
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput;
    if (uIn === 'lb') return cantidadInput / 100; // Asumiendo saco estandar 100lb
  }

  return cantidadInput; // Fallback
}

// ==========================================
// 3. LOGICA DE GUARDADO
// ==========================================

async function guardarSeguimiento(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();

  // --- VALIDACIÓN DE DOM ---
  const elLote = document.getElementById('loteSelect');
  const elSemana = document.getElementById('semanaVida');
  const elPeso = document.getElementById('pesoPromedio');
  const elObs = document.getElementById('observaciones');
  const elFecha = document.getElementById('fechaRegistro');
  const elAlimento = document.getElementById('alimentoSelect');
  const elConsumo = document.getElementById('consumoAlimento');
  const elUnidadConsumo = document.getElementById('unidadConsumo'); // NUEVO

  if (!elLote || !elSemana || !elFecha || !elUnidadConsumo) {
    console.error("Faltan elementos ID en el HTML.");
    return alert("Error interno del formulario (IDs faltantes).");
  }

  // --- OBTENCIÓN DE VALORES ---
  const loteId = elLote.value;
  const semanaVida = elSemana.value;
  const pesoPromedio = elPeso ? (parseFloat(elPeso.value) || 0) : 0;
  const observaciones = elObs ? elObs.value : "";
  const fechaRegistro = elFecha.value;

  // Lógica de Alimento
  const alimentoIdVal = elAlimento ? elAlimento.value : "";
  const consumoInput = elConsumo ? (parseFloat(elConsumo.value) || 0) : 0;
  const unidadInput = elUnidadConsumo.value; // Unidad que eligió el usuario

  let alimentoId = null;
  let consumoFinal = 0; // Esto será lo que se guarde (convertido a unidad base)

  if (alimentoIdVal && consumoInput > 0) {
    alimentoId = parseInt(alimentoIdVal);

    // Obtener datos del inventario (Base)
    const opcion = elAlimento.options[elAlimento.selectedIndex];
    if (opcion && opcion.dataset.stock) {
      const stock = parseFloat(opcion.dataset.stock);
      const unidadBase = opcion.dataset.unidad;

      // CONVERSIÓN MAGISTRAL
      consumoFinal = calcularCantidadBase(consumoInput, unidadInput, unidadBase);

      console.log(`Validación: Stock ${stock} ${unidadBase} vs Pedido ${consumoFinal.toFixed(4)} ${unidadBase} (Input: ${consumoInput} ${unidadInput})`);

      // Validación de Stock (con margen float)
      if (consumoFinal > (stock + 0.0001)) {
        return alert(`❌ Stock Insuficiente.\nInventario: ${stock} ${unidadBase}\nNecesitas: ${consumoFinal.toFixed(4)} ${unidadBase}\n(${consumoInput} ${unidadInput})`);
      }
    } else {
      // Si por alguna razón no hay datos de unidad, pasamos directo
      consumoFinal = consumoInput;
    }
  }

  const payload = {
    granjaId,
    loteId: parseInt(loteId),
    semanaVida: parseInt(semanaVida),
    pesoPromedio: pesoPromedio,
    consumoAlimento: consumoFinal, // Se guarda el valor convertido a la unidad del inventario
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

        // Intentar pre-seleccionar la unidad correcta en el input
        const unidadStock = opt.dataset.unidad.toLowerCase();
        const unidadSelect = document.getElementById('unidadConsumo');
        if (unidadSelect) {
          // Mapeo simple para autoselección
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