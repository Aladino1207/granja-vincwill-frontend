// --- Lógica de Carga ---
async function cargarLotes() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const tbody = document.getElementById('loteTableBody');
    tbody.innerHTML = '';
    lotes.forEach(lote => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${lote.loteId}</td>
        <td>${lote.cantidad}</td>
        <td>${lote.pesoInicial}</td>
        <td>${new Date(lote.fechaIngreso).toLocaleDateString()}</td>
        <td>${lote.estado}</td>
        <td>
          <button onclick="editarLote(${lote.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
          <button onclick="eliminarLote(${lote.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar lotes:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---

function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Agregar Nuevo Lote';

  document.getElementById('loteForm').reset();
  document.getElementById('loteDbId').value = '';
  document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';
}

// --- Funciones CRUD (Modificadas) ---

async function guardarLote(e) {
  e.preventDefault();

  const loteDbId = document.getElementById('loteDbId').value;
  const esEdicion = !!loteDbId;

  const lote = {
    loteId: document.getElementById('loteId').value,
    cantidad: parseInt(document.getElementById('cantidad').value),
    pesoInicial: parseFloat(document.getElementById('pesoInicial').value),
    fechaIngreso: document.getElementById('fechaIngreso').value,
    estado: document.getElementById('estado').value
  };

  const url = esEdicion
    ? `${API_URL}/lotes/${loteDbId}`
    : `${API_URL}/lotes`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(lote)
    });
    if (res.ok) {
      cerrarFormulario();
      await cargarLotes();
    } else {
      const errorData = await res.json();
      alert('Error al guardar lote: ' + (errorData.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarLote(id) {
  try {
    const token = localStorage.getItem('token');
    // Asumimos que el backend tiene un endpoint GET /lotes/:id (lo cual es estándar)
    const res = await fetch(`${API_URL}/lotes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el lote');
    const lote = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Lote';
    document.getElementById('loteDbId').value = lote.id; // Guardamos el ID de la BD
    document.getElementById('loteId').value = lote.loteId;
    document.getElementById('cantidad').value = lote.cantidad;
    document.getElementById('pesoInicial').value = lote.pesoInicial;
    document.getElementById('fechaIngreso').value = lote.fechaIngreso.split('T')[0];
    document.getElementById('estado').value = lote.estado;

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
    alert('Error al cargar datos. Asegúrate que el backend tenga GET /lotes/:id');
  }
}

async function eliminarLote(id) {
  if (confirm('¿Seguro que quieres eliminar este lote?')) {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/lotes/${id}`, { // Usamos el ID numérico
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarLotes();
    } catch (error) {
      alert('Error al eliminar lote');
    }
  }
}

// --- Event Listener Principal ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('loteForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';

    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';
        form.reset();
        document.getElementById('loteDbId').value = '';
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarLote;

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarLotes();
});