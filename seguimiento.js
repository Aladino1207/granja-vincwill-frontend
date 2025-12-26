// --- Variables Globales ---
let inventarioAlimentos = []; // Memoria caché para validaciones

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

    // FILTRO VITAL: Solo lotes DISPONIBLES u OCUPADOS
    const lotesActivos = lotes.filter(l => l.estado === 'disponible' || l.estado === 'ocupado');

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
    inventarioAlimentos = items.filter(i => i.categoria === 'Alimento' && i.cantidad > 0);

    const select = document.getElementById('alimentoSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona Alimento</option>';

    inventarioAlimentos.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;

      // CORRECCIÓN VISUAL: Usar la unidad real del inventario, no "kg" fijo
      const unidad = item.unidadMedida || 'Unidades';
      option.textContent = `${item.producto} (Stock: ${item.cantidad} ${unidad})`;

      // Datos para la lógica de conversión
      option.dataset.stock = item.cantidad;
      option.dataset.unidad = unidad;
      option.dataset.nombre = item.producto;

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
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No hay registros de seguimiento.</td></tr>';
      return;
    }

    data.forEach(s => {
      const tr = document.createElement('tr');

      // Intentar mostrar información del alimento si existe
      let infoConsumo = s.consumoAlimento ? `${s.consumoAlimento}` : '-';
      if (s.Inventario) {
        infoConsumo += ` (${s.Inventario.producto})`; // Mostrar nombre del alimento
      }

      tr.innerHTML = `
        <td>${s.Lote ? s.Lote.loteId : 'N/A'}</td>
        <td>Semana ${s.semanaVida}</td>
        <td>${s.pesoPromedio} lb</td>
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
// Nota: Reutilizamos la lógica robusta creada en Salud.js

function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (!unidadBase || unidadInput === 'base') return cantidadInput;

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
  }

  // DESTINO: LIBRAS (lb)
  if (uBase === 'lb' || uBase === 'libra') {
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput * 2.20462;
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput * 100;
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 453.592;
  }

  // DESTINO: KILOGRAMOS (kg)
  if (uBase === 'kg' || uBase === 'kilo') {
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 2.20462;
    if (uIn === 'qq' || uIn === 'quintal') return cantidadInput * 45.36;
    if (uIn === 'g' || uIn === 'gramo') return cantidadInput / 1000;
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

  const loteId = document.getElementById('loteSelect').value;
  const semanaVida = document.getElementById('semanaVida').value;
  const pesoPromedio = document.getElementById('pesoPromedio').value;
  const observaciones = document.getElementById('observaciones').value;
  const fechaRegistro = document.getElementById('fechaRegistro').value;

  // Lógica de Alimento e Inventario
  const alimentoSelect = document.getElementById('alimentoSelect');
  const consumoInput = parseFloat(document.getElementById('consumoAlimento').value) || 0;

  // IMPORTANTE: Necesitamos saber en qué unidad el usuario está ingresando el consumo.
  // Como el HTML actual de seguimiento.html NO TIENE un select de unidad para el consumo,
  // tenemos dos opciones:
  // 1. Asumir que el usuario ingresa en la misma unidad del inventario.
  // 2. O asumir un estándar (Libras).
  // DADO TU REPORTE: Tienes "8 Quintales" en inventario. Probablemente pesas el consumo en "Libras" o "Sacos".
  // Vamos a asumir que el input es en la MISMA UNIDAD del inventario por defecto, 
  // PERO si detectamos 'qq' en inventario, haremos una conversión inteligente si el valor es muy alto (ej: 100).
  // (Para evitar errores complejos, por ahora asumimos: Input Usuario = Unidad Base Inventario).
  // *Recomendación*: Agrega un <select id="unidadConsumo"> en tu HTML para ser precisos.*

  let alimentoId = null;
  let consumoFinal = consumoInput;

  if (alimentoSelect.value && consumoInput > 0) {
    alimentoId = parseInt(alimentoSelect.value);

    const opcion = alimentoSelect.options[alimentoSelect.selectedIndex];
    const stockActual = parseFloat(opcion.dataset.stock);
    const unidadBase = opcion.dataset.unidad;

    // VALIDACIÓN DE STOCK
    if (consumoFinal > stockActual) {
      alert(`❌ Stock Insuficiente de Alimento.\nTienes: ${stockActual} ${unidadBase}\nIntentas registrar: ${consumoFinal}`);
      return;
    }

    // Nota: Si agregas un select de unidad en el HTML, aquí llamarías a calcularCantidadBase()
  }

  const payload = {
    granjaId,
    loteId: parseInt(loteId),
    semanaVida: parseInt(semanaVida),
    pesoPromedio: parseFloat(pesoPromedio),
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
      alert('Seguimiento registrado');
      cerrarFormulario();
      cargarSeguimientos();
      // Recargar alimentos para actualizar stock visualmente
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

// --- UI Helpers ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Seguimiento';
  document.getElementById('seguimientoForm').reset();
  document.getElementById('seguimientoId').value = '';
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const header = document.querySelector('header h1');
    if (header) header.textContent = `Seguimiento (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('seguimientoForm');

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
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
  cargarAlimentosParaSelect(); // Ahora muestra la unidad correcta (qq)
  cargarSeguimientos();
});