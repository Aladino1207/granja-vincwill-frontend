// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const items = await res.json();
    const select = document.getElementById('vacunaSelect');
    select.innerHTML = '<option value="">Selecciona Vacuna/Medicina</option>';

    const filtrados = items.filter(i => i.categoria === 'Vacuna' || i.categoria === 'Medicina' || i.categoria === 'Otro');

    filtrados.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      const unidad = item.unidadMedida || 'Unidades';
      option.textContent = `${item.producto}`;
      option.dataset.nombre = item.producto;
      option.dataset.stock = item.cantidad;
      option.dataset.unidad = unidad; // Guardamos la unidad base
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarVacunasForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // CORRECCIÓN: Usamos window.API_URL
    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const items = await res.json();

    const select = document.getElementById('vacunaSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona Vacuna/Medicina</option>';

    // Filtramos solo lo que sea Vacuna, Medicina u Otro
    const filtrados = items.filter(i =>
      i.categoria === 'Vacuna' || i.categoria === 'Medicina' || i.categoria === 'Otro'
    );

    filtrados.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;

      // V 3.4: Recuperamos la unidad de medida
      const unidad = item.unidadMedida || 'Unidades';

      option.textContent = `${item.producto} (Stock: ${item.cantidad} ${unidad})`;
      option.dataset.nombre = item.producto;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar vacunas para select:', error);
  }
}

async function cargarSalud() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;
    const res = await fetch(`${window.API_URL}/salud?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const salud = await res.json();
    const tbody = document.getElementById('saludTableBody');
    tbody.innerHTML = '';
    if (Array.isArray(salud) && salud.length > 0) {
      salud.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${s.loteId || 'N/A'}</td>
          <td>${s.tipo}</td>
          <td>${s.nombre}</td>
          <td>${s.Vacuna ? s.Vacuna.producto : '-'}</td>
          <td>${s.cantidad.toFixed(4)}</td> <!-- Mostramos decimales -->
          <td>${new Date(s.fecha).toLocaleDateString()}</td>
          <td>
             <button onclick="eliminarSalud(${s.id})" class="btn btn-sm btn-peligro">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else { tbody.innerHTML = '<tr><td colspan="7">Sin registros.</td></tr>'; }
  } catch (error) { console.error(error); }
}

// --- Conversor de Unidades ---
function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (unidadInput === 'base' || !unidadBase) return cantidadInput;

  // Normalizar textos
  const uIn = unidadInput.toLowerCase();
  const uBase = unidadBase.toLowerCase();

  // 1. Conversión de Volumen (L <-> ml)
  if (uBase === 'l' || uBase === 'litros') {
    if (uIn === 'ml') return cantidadInput / 1000;
  }
  if (uBase === 'ml' || uBase === 'mililitros') {
    if (uIn === 'l') return cantidadInput * 1000;
  }

  // 2. Conversión de Peso (kg <-> g)
  if (uBase === 'kg' || uBase === 'kilogramos') {
    if (uIn === 'g') return cantidadInput / 1000;
    if (uIn === 'lb') return cantidadInput / 2.20462;
  }

  // Si no hay coincidencia lógica, asumimos que el usuario sabe lo que hace (1 a 1)
  return cantidadInput;
}

// --- UI Logic ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Evento';
  document.getElementById('saludForm').reset();
  document.getElementById('saludId').value = '';
  document.getElementById('vacunaGroup').style.display = 'none';
  document.getElementById('stockInfo').textContent = '';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarSalud(e) {
  e.preventDefault();
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  // Datos básicos
  const tipo = document.getElementById('tipo').value;
  let cantidadInput = parseFloat(document.getElementById('cantidad').value);
  const unidadAplicacion = document.getElementById('unidadAplicacion').value;

  // Lógica de Inventario y Conversión
  const vacunaSelect = document.getElementById('vacunaSelect');
  const vacunaId = (vacunaSelect.value && document.getElementById('vacunaGroup').style.display !== 'none') ? parseInt(vacunaSelect.value) : null;

  let cantidadFinal = cantidadInput;

  // Si es una vacuna del inventario, aplicamos conversión
  if (vacunaId) {
    const opcionSeleccionada = vacunaSelect.options[vacunaSelect.selectedIndex];
    const unidadBase = opcionSeleccionada.dataset.unidad;

    // Convertimos a la unidad del inventario
    cantidadFinal = calcularCantidadBase(cantidadInput, unidadAplicacion, unidadBase);

    console.log(`Conversión: ${cantidadInput} ${unidadAplicacion} -> ${cantidadFinal} ${unidadBase}`);
  }

  // Cálculo retiro
  const diasRetiro = parseInt(document.getElementById('diasRetiro').value) || 0;
  const fechaEvento = new Date(document.getElementById('fecha').value);
  let fechaRetiroCalculada = null;
  if (diasRetiro > 0) {
    fechaEvento.setDate(fechaEvento.getDate() + diasRetiro);
    fechaRetiroCalculada = fechaEvento;
  }

  const salud = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: tipo,
    nombre: document.getElementById('nombre').value,
    cantidad: cantidadFinal, // Enviamos la cantidad YA CONVERTIDA
    vacunaId: vacunaId,
    fecha: document.getElementById('fecha').value,
    fechaRetiro: fechaRetiroCalculada,
    granjaId: granjaId
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/salud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(salud)
    });
    if (res.ok) {
      cerrarFormulario();
      await cargarSalud();
      await cargarVacunasForSelect();
      if (salud.tipo === 'Mortalidad') await cargarLotesForSelect();
    } else {
      const errorText = await res.json();
      alert('Error: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) { alert('Error de conexión'); }
}

async function editarSalud(id) {
  // Lógica de edición (simplificada: solo carga datos)
  // Nota: Editar transacciones de inventario es complejo.
  // Recomendación: Mejor borrar y crear de nuevo.
  alert("Para corregir inventario, por favor elimine este evento y créelo de nuevo. Eliminar no Revierte el Stock automaticamente");
}

async function eliminarSalud(id) {
  if (confirm('¿Seguro que quieres eliminar este evento?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      await fetch(`${window.API_URL}/salud/${id}?granjaId=${granjaId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      cargarSalud();
    } catch (error) { alert('Error al eliminar'); }
  }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));
  if (granja) document.querySelector('header h1').textContent = `Salud (${granja.nombre})`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('saludForm');
  const tipoSelect = document.getElementById('tipo');
  const vacunaSelect = document.getElementById('vacunaSelect');
  const stockInfo = document.getElementById('stockInfo');

  if (tipoSelect) {
    tipoSelect.addEventListener('change', () => {
      const tipo = tipoSelect.value;
      const vacunaGroup = document.getElementById('vacunaGroup');
      if (tipo === 'Vacunación' || tipo === 'Tratamiento') {
        vacunaGroup.style.display = 'flex';
        vacunaSelect.required = true;
      } else {
        vacunaGroup.style.display = 'none';
        vacunaSelect.value = "";
        vacunaSelect.required = false;
        stockInfo.textContent = "";
      }
    });
  }

  if (vacunaSelect) {
    vacunaSelect.addEventListener('change', () => {
      const opt = vacunaSelect.options[vacunaSelect.selectedIndex];
      if (opt && opt.dataset.nombre) {
        document.getElementById('nombre').value = opt.dataset.nombre;
        stockInfo.textContent = `Stock Disponible: ${opt.dataset.stock} ${opt.dataset.unidad}`;
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';
    toggleBtn.addEventListener('click', () => {
      const isOpen = document.getElementById('formContainer').classList.contains('is-open');
      if (isOpen) cerrarFormulario();
      else {
        form.reset();
        document.getElementById('saludId').value = '';
        document.getElementById('vacunaGroup').style.display = 'none';
        abrirFormulario();
      }
    });
    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarSalud;
  } else { toggleBtn.style.display = 'none'; }

  cargarLotesForSelect();
  cargarVacunasForSelect();
  cargarSalud();
});