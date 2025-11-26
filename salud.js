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

    // CORRECCIÓN: Usamos window.API_URL
    const res = await fetch(`${window.API_URL}/salud?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const salud = await res.json();
    const tbody = document.getElementById('saludTableBody');
    if (!tbody) return;

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
      tbody.innerHTML = '<tr><td colspan="7">No hay eventos de salud registrados.</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar salud:', error);
  }
}



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
  const vacunaGroup = document.getElementById('vacunaGroup');
  // Solo enviamos vacunaId si el grupo está visible y se seleccionó algo
  const vacunaId = (vacunaSelect && vacunaSelect.value && vacunaGroup.style.display !== 'none')
    ? parseInt(vacunaSelect.value) : null;

  const salud = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: document.getElementById('tipo').value,
    nombre: document.getElementById('nombre').value,
    cantidad: parseFloat(document.getElementById('cantidad').value),
    vacunaId: vacunaId,
    fecha: document.getElementById('fecha').value,
    fechaRetiro: fechaRetiroCalculada,
    granjaId: granjaId
  };

  const url = esEdicion
    ? `${window.API_URL}/salud/${saludId}`
    : `${window.API_URL}/salud`;
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
      await cargarVacunasForSelect(); // Recargar stock vacunas
      // Si fue mortalidad, recargamos lotes para ver stock aves actualizado
      if (salud.tipo === 'Mortalidad') await cargarLotesForSelect();
    } else {
      const errorText = await res.json();
      alert('Error al guardar: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
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
  if (granja) {
    const header = document.querySelector('header h1');
    if (header) header.textContent = `Salud (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('saludForm');
  const tipoSelect = document.getElementById('tipo');
  const vacunaSelect = document.getElementById('vacunaSelect');
  const nombreInput = document.getElementById('nombre');

  // Lógica para mostrar/ocultar el select de vacunas
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
      }
    });
  }

  // Autocompletar nombre al seleccionar vacuna
  if (vacunaSelect) {
    vacunaSelect.addEventListener('change', () => {
      const selectedOption = vacunaSelect.options[vacunaSelect.selectedIndex];
      if (selectedOption && selectedOption.dataset.nombre) {
        nombreInput.value = selectedOption.dataset.nombre;
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
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
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarSalud;
  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarVacunasForSelect();
  cargarSalud();
});