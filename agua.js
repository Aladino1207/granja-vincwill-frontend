// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

async function cargarAgua() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/agua?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const registros = await res.json();
    const tbody = document.getElementById('aguaTableBody');
    tbody.innerHTML = '';

    if (Array.isArray(registros) && registros.length > 0) {
      registros.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.Lote ? r.Lote.loteId : 'N/A'}</td>
          <td>${r.cantidad} L</td>
          <td>${new Date(r.fecha).toLocaleDateString()}</td>
          <td>
            <button onclick="editarAgua(${r.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
            <button onclick="eliminarAgua(${r.id})" class="btn btn-sm btn-peligro">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="4">No hay registros de consumo de agua</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar registros de agua:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Consumo';
  document.getElementById('aguaForm').reset();
  document.getElementById('aguaId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Consumo de Agua';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarAgua(e) {
  e.preventDefault();

  const aguaId = document.getElementById('aguaId').value;
  const esEdicion = !!aguaId;
  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const registro = {
    loteId: parseInt(document.getElementById('loteSelect').value),
    cantidad: parseFloat(document.getElementById('cantidad').value),
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId // V 3.0: Añadido
  };

  const url = esEdicion
    ? `${window.API_URL}/agua/${aguaId}`
    : `${window.API_URL}/agua`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(registro)
    });
    if (res.ok) {
      cerrarFormulario();
      await cargarAgua();
    } else {
      const error = await res.json();
      alert('Error al guardar: ' + (error.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión al guardar');
  }
}

async function editarAgua(id) {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/agua/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el registro');
    const r = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Consumo de Agua';
    document.getElementById('aguaId').value = r.id;
    document.getElementById('loteSelect').value = r.loteId;
    document.getElementById('cantidad').value = r.cantidad;
    document.getElementById('fecha').value = r.fecha.split('T')[0];

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

async function eliminarAgua(id) {
  if (confirm('¿Seguro que quieres eliminar este registro?')) {
    try {
      const token = localStorage.getItem('token');
      // V 3.0: Obtenemos la granja activa
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      // V 3.0: Añadimos granjaId al fetch
      const res = await fetch(`${API_URL}/agua/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        cargarAgua();
      } else {
        alert('Error al eliminar registro');
      }
    } catch (error) {
      alert('Error de conexión al eliminar');
    }
  }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Consumo de Agua (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('aguaForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';

    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        form.reset();
        document.getElementById('aguaId').value = '';
        formTitle.textContent = 'Registrar Consumo de Agua';
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarAgua;

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarAgua();
});