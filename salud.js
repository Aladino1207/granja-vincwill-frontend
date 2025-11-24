// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
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
    const items = await res.json();
    const select = document.getElementById('vacunaSelect');
    select.innerHTML = '<option value="">Selecciona Vacuna/Medicina</option>';

    // Filtramos solo lo que sea Vacuna o Medicina (asumiendo categoría)
    // O mostramos todo si prefieres
    const filtrados = items.filter(i =>
      i.categoria === 'Vacuna' || i.categoria === 'Medicina' || i.categoria === 'Otro'
    );

    filtrados.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.producto} (Stock: ${item.cantidad})`;
      option.dataset.nombre = item.producto; // Para autocompletar nombre
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarSalud() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/salud?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const salud = await res.json();
    const tbody = document.getElementById('saludTableBody');
    tbody.innerHTML = '';
    if (Array.isArray(salud) && salud.length > 0) {
      salud.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${s.loteId || 'N/A'}</td>
          <td>${s.tipo || 'N/A'}</td>
          <td>${s.nombre || 'N/A'}</td>
          <td>${s.Vacuna ? s.Vacuna.producto : '-'}</td>
          <td>${s.cantidad || 0}</td>
          <td>${s.fecha ? new Date(s.fecha).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button onclick="editarSalud(${s.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
            <button onclick="eliminarSalud(${s.id})" class="btn btn-sm btn-peligro">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No hay eventos de salud registrados</td></tr>';
    }
  } catch (error) { console.error(error); }
}



// --- LÓGICA DEL FORMULARIO DESPLEGABLE (Sin cambios) ---
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
  document.getElementById('vacunaGroup').style.display = 'none';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarSalud(e) {
  e.preventDefault();
  const saludId = document.getElementById('saludId').value;
  const esEdicion = !!saludId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  // Cálculo retiro
  const diasRetiro = parseInt(document.getElementById('diasRetiro').value) || 0;
  const fechaEvento = new Date(document.getElementById('fecha').value);
  let fechaRetiroCalculada = null;
  if (diasRetiro > 0) {
    fechaEvento.setDate(fechaEvento.getDate() + diasRetiro);
    fechaRetiroCalculada = fechaEvento;
  }

  const vacunaSelect = document.getElementById('vacunaSelect');
  const vacunaId = (vacunaSelect.value && document.getElementById('vacunaGroup').style.display !== 'none')
    ? parseInt(vacunaSelect.value) : null;

  const salud = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: document.getElementById('tipo').value,
    nombre: document.getElementById('nombre').value,
    cantidad: parseFloat(document.getElementById('cantidad').value),
    vacunaId: vacunaId, // Enviamos el ID del inventario
    fecha: document.getElementById('fecha').value,
    fechaRetiro: fechaRetiroCalculada,
    granjaId: granjaId
  };

  const url = esEdicion ? `${window.API_URL}/salud/${saludId}` : `${window.API_URL}/salud`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(salud)
    });
    if (res.ok) {
      cerrarFormulario();
      await cargarSalud();
      await cargarVacunasForSelect(); // Recargar stock
      // Si fue mortalidad, recargamos lotes
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
  alert("Para corregir inventario, por favor elimine este evento y créelo de nuevo.");
}

async function eliminarSalud(id) {
  if (confirm('¿Eliminar evento? (Nota: El stock de vacunas NO se devuelve automáticamente en V3.3)')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
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
  const nombreInput = document.getElementById('nombre');

  // Lógica para mostrar/ocultar el select de vacunas
  tipoSelect.addEventListener('change', () => {
    const tipo = tipoSelect.value;
    const vacunaGroup = document.getElementById('vacunaGroup');

    if (tipo === 'Vacunación' || tipo === 'Tratamiento') {
      vacunaGroup.style.display = 'flex';
      // Hacemos el select requerido
      vacunaSelect.required = true;
    } else {
      vacunaGroup.style.display = 'none';
      vacunaSelect.value = "";
      vacunaSelect.required = false;
    }
  });

  // Autocompletar nombre al seleccionar vacuna
  vacunaSelect.addEventListener('change', () => {
    const selectedOption = vacunaSelect.options[vacunaSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.nombre) {
      nombreInput.value = selectedOption.dataset.nombre;
    }
  });

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';
    toggleBtn.addEventListener('click', () => {
      const isOpen = document.getElementById('formContainer').classList.contains('is-open');
      if (isOpen) cerrarFormulario();
      else {
        form.reset();
        document.getElementById('saludId').value = '';
        document.getElementById('formTitle').textContent = 'Registrar Evento de Salud';
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