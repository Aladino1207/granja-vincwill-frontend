// --- Lógica de Carga (BLINDADA) ---
async function cargarInventario() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const inventario = await res.json();
    const tbody = document.getElementById('tablaInventario');
    tbody.innerHTML = '';
    if (Array.isArray(inventario) && inventario.length > 0) {
      inventario.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.producto || 'N/A'}</td>
          <td>${item.categoria || 'N/A'}</td>
          <td>${item.cantidad || 0}</td>
          <td>${item.costo ? item.costo.toFixed(2) : 0}</td>
          <td>${item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button onclick="editarInventario(${item.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
            <button onclick="eliminarInventario(${item.id})" class="btn btn-sm btn-peligro">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No hay inventario registrado</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar inventario:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE (Sin cambios) ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Insumo';
  document.getElementById('inventarioForm').reset();
  document.getElementById('inventarioId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Insumo';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarInventario(e) {
  e.preventDefault();

  const inventarioId = document.getElementById('inventarioId').value;
  const esEdicion = !!inventarioId;
  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const inventario = {
    producto: document.getElementById('producto').value,
    categoria: document.getElementById('categoria').value,
    cantidad: parseFloat(document.getElementById('cantidad').value),
    costo: parseFloat(document.getElementById('costo').value),
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId // V 3.0: Añadido
  };

  const url = esEdicion
    ? `${window.API_URL}/inventario/${inventarioId}`
    : `${window.API_URL}/inventario`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(inventario)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarInventario();
    } else {
      const errorText = await res.json();
      alert('Error al guardar: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarInventario(id) {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/inventario/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el item');
    const item = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Insumo';
    document.getElementById('inventarioId').value = item.id;
    document.getElementById('producto').value = item.producto || '';
    document.getElementById('categoria').value = item.categoria || '';
    document.getElementById('cantidad').value = item.cantidad || '';
    document.getElementById('costo').value = item.costo || '';
    document.getElementById('fecha').value = item.fecha ? item.fecha.split('T')[0] : '';

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

async function eliminarInventario(id) {
  if (confirm('¿Seguro que quieres eliminar este insumo?')) {
    try {
      const token = localStorage.getItem('token');
      // V 3.0: Obtenemos la granja activa
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      // V 3.0: Añadimos granjaId al fetch
      await fetch(`${API_URL}/inventario/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarInventario();
    } catch (error) {
      alert('Error al eliminar insumo');
    }
  }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Inventario (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('inventarioForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';

    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        form.reset();
        document.getElementById('inventarioId').value = '';
        formTitle.textContent = 'Registrar Insumo';
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarInventario;

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarInventario();
});