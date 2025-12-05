// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;
    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const lotes = await res.json();
    const select = document.getElementById('loteId');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Stock: ${lote.cantidad})`;
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarVacunasForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

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
      option.dataset.stock = item.cantidad;
      option.dataset.unidad = unidad; // Guardamos la unidad base para la calculadora
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
        const fechaVisual = s.fecha ? new Date(s.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A';

        // Formateo inteligente: Si es entero se muestra entero, si es decimal muestra hasta 4 dígitos
        const cantidadVisual = Number.isInteger(s.cantidad) ? s.cantidad : parseFloat(s.cantidad).toFixed(4);
        // Intentamos mostrar la unidad si el backend la enviara (requiere update en backend), por ahora mostramos la cantidad precisa

        tr.innerHTML = `
          <td>${s.loteId ? (s.Lote ? s.Lote.loteId : s.loteId) : 'N/A'}</td>
          <td>${s.tipo}</td>
          <td>${s.nombre}</td>
          <td>${s.Vacuna ? s.Vacuna.producto : '-'}</td>
          <td>${cantidadVisual}</td>
          <td>${fechaVisual}</td>
          <td><button onclick="eliminarSalud(${s.id})" class="btn btn-sm btn-peligro">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
      });
    } else { tbody.innerHTML = '<tr><td colspan="7">No hay registros.</td></tr>'; }
  } catch (error) { console.error(error); }
}

// --- INTELIGENCIA DE FILTRADO DE INSUMOS ---
async function precargarInventarioSanitario() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const items = await res.json();
      // Guardamos en memoria solo lo que nos sirve (Vacunas y Medicinas)
      inventarioSanitario = items.filter(i => i.categoria === 'Vacuna' || i.categoria === 'Medicina' || i.categoria === 'Otro');
    }
  } catch (e) { console.error("Error cargando inventario sanitario", e); }
}

function filtrarYMostrarInsumos(tipoEvento) {
  const select = document.getElementById('vacunaSelect');
  select.innerHTML = '<option value="">Seleccione Producto</option>';

  let filtrados = [];

  if (tipoEvento === 'Vacunación') {
    // Mostrar SOLO Vacunas
    filtrados = inventarioSanitario.filter(i => i.categoria === 'Vacuna');
  } else if (tipoEvento === 'Tratamiento') {
    // Mostrar Medicinas (y Otros por si acaso)
    filtrados = inventarioSanitario.filter(i => i.categoria === 'Medicina' || i.categoria === 'Otro');
  } else {
    // Si es Mortalidad u Otro, no mostramos nada o todo (depende de tu lógica, aquí ocultamos)
    return;
  }

  filtrados.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    const unidad = item.unidadMedida || 'Unidades';
    option.textContent = `${item.producto} (Stock: ${item.cantidad} ${unidad})`;

    // Datos para la calculadora
    option.dataset.unidad = unidad;
    option.dataset.nombre = item.producto;
    select.appendChild(option);
  });
}

// --- Conversor de Unidades ---
function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (!unidadBase || unidadInput === 'base') return cantidadInput;

  // Normalizar a minúsculas para evitar errores (Kg vs kg)
  const uIn = unidadInput.toLowerCase().trim();
  const uBase = unidadBase.toLowerCase().trim();

  // Si son iguales, no convertir
  if (uIn === uBase) return cantidadInput;

  // --- LÓGICA DE VOLUMEN ---
  // Base: Litros (L)
  if (uBase === 'l' || uBase === 'litros') {
    if (uIn === 'ml' || uIn === 'mililitros') return cantidadInput / 1000;
  }
  // Base: Mililitros (ml)
  if (uBase === 'ml' || uBase === 'mililitros') {
    if (uIn === 'l' || uIn === 'litros') return cantidadInput * 1000;
  }

  // --- LÓGICA DE PESO ---
  // Base: Kilogramos (kg)
  if (uBase === 'kg' || uBase === 'kilogramos') {
    if (uIn === 'g' || uIn === 'gramos') return cantidadInput / 1000;
    if (uIn === 'lb' || uIn === 'libras') return cantidadInput / 2.20462;
    if (uIn === 'qq' || uIn === 'quintales') return cantidadInput * 45.36; // 1 qq = 100 lb approx 45.36kg
  }
  // Base: Gramos (g)
  if (uBase === 'g' || uBase === 'gramos') {
    if (uIn === 'kg') return cantidadInput * 1000;
  }
  // Base: Libras (lb)
  if (uBase === 'lb' || uBase === 'libras') {
    if (uIn === 'kg') return cantidadInput * 2.20462;
  }

  // --- OTROS (Dosis, Unidades, Sacos) ---
  // Asumimos conversión directa 1:1 si no hay fórmula matemática obvia
  // o si el usuario selecciona la misma unidad en el dropdown.

  console.log(`Conversión aplicada: ${cantidadInput} ${uIn} -> ${uBase} (Sin cambio o conversión directa)`);
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
  document.getElementById('formTitle').textContent = 'Registrar Evento de Salud';
  // Ocultar campo vacuna
  if (document.getElementById('vacunaGroup')) {
    document.getElementById('vacunaGroup').style.display = 'none';
  }
  document.getElementById('stockInfo').textContent = '';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarSalud(e) {
  e.preventDefault();
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = document.getElementById('tipo').value;
  let cantidadInput = parseFloat(document.getElementById('cantidad').value);
  const unidadAplicacion = document.getElementById('unidadAplicacion').value;

  // Lógica de Inventario y Conversión
  const vacunaSelect = document.getElementById('vacunaSelect');
  const vacunaGroup = document.getElementById('vacunaGroup');
  let vacunaId = null;
  let cantidadFinal = cantidadInput;

  if (vacunaSelect && vacunaSelect.value && vacunaGroup.style.display !== 'none') {
    vacunaId = parseInt(vacunaSelect.value);
    const opcionSeleccionada = vacunaSelect.options[vacunaSelect.selectedIndex];
    const unidadBase = opcionSeleccionada.dataset.unidad;
    cantidadFinal = calcularCantidadBase(cantidadInput, unidadAplicacion, unidadBase);
  }

  // Retiro
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
    cantidad: cantidadFinal,
    vacunaId: vacunaId,
    fecha: document.getElementById('fecha').value,
    fechaRetiro: fechaRetiroCalculada,
    granjaId: granjaId
  };

  const url = `${window.API_URL}/salud`; // Solo POST por ahora
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(salud)
    });
    if (res.ok) {
      cerrarFormulario();
      await cargarSalud();
      await precargarInventarioSanitario(); // Recargar stock en memoria
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
  if (confirm('¿Eliminar evento?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/salud/${id}?granjaId=${granjaId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      cargarSalud();
    } catch (error) { alert('Error al eliminar'); }
  }
} F

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  // Referencias DOM
  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const userForm = document.getElementById('userForm');

  const granjaForm = document.getElementById('granjaForm');
  const cancelGranjaBtn = document.getElementById('cancelGranjaBtn');

  const closeAsignar = document.getElementById('closeAsignarModal');
  const formAsignar = document.getElementById('asignarForm');

  const adminSection = document.getElementById('adminSection');
  const accessDenied = document.getElementById('accessDenied');

  if (currentUser && currentUser.role === 'admin') {
    // 1. Mostrar interfaz
    if (adminSection) adminSection.style.display = 'grid';
    if (accessDenied) accessDenied.style.display = 'none';

    // 2. Configurar Formulario Usuario
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        // AQUÍ ESTÁ LA CORRECCIÓN: Llamamos a las funciones renombradas
        if (isOpen) cerrarFormularioUsuario();
        else {
          document.getElementById('userForm').reset();
          document.getElementById('usuarioId').value = '';
          document.getElementById('formTitle').textContent = 'Crear Nuevo Usuario';
          abrirFormularioUsuario();
        }
      };
    }
    if (cancelBtn) cancelBtn.onclick = cerrarFormularioUsuario;
    if (userForm) userForm.onsubmit = guardarUsuario;

    // 3. Configurar Formulario Granja
    if (granjaForm) granjaForm.onsubmit = guardarGranja;
    if (cancelGranjaBtn) cancelGranjaBtn.onclick = resetGranjaForm;

    // 4. Configurar Modal Asignación
    if (closeAsignar) closeAsignar.onclick = () => document.getElementById('asignarModal').classList.remove('is-open');
    if (formAsignar) formAsignar.onsubmit = guardarAsignacion;

    // 5. Cargar Datos
    cargarUsuarios();
    cargarTodasGranjas();

  } else {
    // Si no es admin
    if (accessDenied) accessDenied.style.display = 'block';
    if (adminSection) adminSection.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarSalud();
  precargarInventarioSanitario();
});