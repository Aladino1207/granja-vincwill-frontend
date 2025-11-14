// --- Lógica de Carga (BLINDADA) ---
async function cargarLotes() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return; // Si no hay granja, no hacemos nada

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const tbody = document.getElementById('loteTableBody');
    tbody.innerHTML = '';

    if (lotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No hay lotes registrados en esta granja.</td></tr>';
      return;
    }

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

// --- LÓGICA DEL FORMULARIO DESPLEGABLE (Sin cambios) ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Agregar Nuevo Lote';

  document.getElementById('loteForm').reset();
  document.getElementById('loteDbId').value = ''; // Usamos loteDbId para el ID numérico
  document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarLote(e) {
  e.preventDefault();

  const loteDbId = document.getElementById('loteDbId').value;
  const esEdicion = !!loteDbId;

  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const lote = {
    loteId: document.getElementById('loteId').value,
    cantidad: parseInt(document.getElementById('cantidad').value),
    pesoInicial: parseFloat(document.getElementById('pesoInicial').value),
    fechaIngreso: document.getElementById('fechaIngreso').value,
    estado: document.getElementById('estado').value,
    granjaId: granjaId // V 3.0: Añadimos granjaId al body
  };

  // V 3.0: Añadimos cantidadInicial si es un lote nuevo
  if (!esEdicion) {
    lote.cantidadInicial = lote.cantidad;
  }

  const url = esEdicion
    ? `${API_URL}/lotes/${loteDbId}` // PUT
    : `${API_URL}/lotes`; // POST
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(lote) // Enviamos el objeto con granjaId
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
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/lotes/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el lote');
    const lote = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Lote';
    document.getElementById('loteDbId').value = lote.id; // ID numérico de la DB
    document.getElementById('loteId').value = lote.loteId;
    document.getElementById('cantidad').value = lote.cantidad;
    document.getElementById('pesoInicial').value = lote.pesoInicial;
    document.getElementById('fechaIngreso').value = lote.fechaIngreso.split('T')[0];
    document.getElementById('estado').value = lote.estado;

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
    alert('Error al cargar datos del lote.');
  }
}

async function eliminarLote(id) {
  if (confirm('¿Seguro que quieres eliminar este lote? Esto eliminará TODOS sus seguimientos, costos, ventas, etc.')) {
    try {
      const token = localStorage.getItem('token');
      // V 3.0: Obtenemos la granja activa
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      // V 3.0: Añadimos granjaId al fetch (DELETE usa query params)
      await fetch(`${API_URL}/lotes/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarLotes();
    } catch (error) {
      alert('Error al eliminar lote');
    }
  }
}

// --- Event Listener Principal (MODIFICADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Lotes (${granja.nombre})`;
  }

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

  cargarLotes(); // Carga solo los lotes de la granja activa
});