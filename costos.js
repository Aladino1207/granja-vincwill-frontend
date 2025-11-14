// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) throw new Error('Elemento loteSelect no encontrado');
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

async function cargarCostos() {
  try {
    const res = await fetch(`${window.API_URL}/costos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const costos = await res.json();
    const tbody = document.getElementById('tablaCostos');
    if (!tbody) throw new Error('Elemento tablaCostos no encontrado');
    tbody.innerHTML = '';
    if (Array.isArray(costos) && costos.length > 0) {
      costos.forEach(costo => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${costo.loteId || 'N/A'}</td>
          <td>${costo.categoria || 'N/A'}</td>
          <td>${costo.descripcion || 'N/A'}</td>
          <td>${costo.monto ? costo.monto.toFixed(2) : 0}</td>
          <td>${costo.fecha ? new Date(costo.fecha).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button onclick="editarCosto(${costo.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
            <button onclick="eliminarCosto(${costo.id})" class="btn btn-sm btn-peligro">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No hay costos registrados</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar costos:', error);
  }
}

// Función para ABRIR el formulario
function abrirFormulario() {
  const formContainer = document.getElementById('formContainer');
  const toggleBtn = document.getElementById('toggleFormBtn');
  formContainer.classList.add('is-open');
  toggleBtn.textContent = 'Cancelar';
}

// Función para CERRAR el formulario
function cerrarFormulario() {
  const formContainer = document.getElementById('formContainer');
  const toggleBtn = document.getElementById('toggleFormBtn');
  const form = document.getElementById('costoForm');
  const formTitle = document.getElementById('formTitle');

  formContainer.classList.remove('is-open');
  toggleBtn.textContent = 'Registrar Nuevo Costo';

  // Limpiamos el formulario
  form.reset();
  document.getElementById('costoId').value = '';
  formTitle.textContent = 'Registrar Costo';
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE (Sin cambios) ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Costo';
  document.getElementById('costoForm').reset();
  document.getElementById('costoId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Costo';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarCosto(e) {
  e.preventDefault();

  const costoId = document.getElementById('costoId').value;
  const esEdicion = !!costoId;

  const costo = {
    loteId: parseInt(document.getElementById('loteSelect').value),
    categoria: document.getElementById('categoria').value,
    descripcion: document.getElementById('descripcion').value,
    monto: parseFloat(document.getElementById('monto').value),
    fecha: document.getElementById('fecha').value
  };

  const url = esEdicion
    ? `${window.API_URL}/costos/${costoId}`
    : `${window.API_URL}/costos`;

  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(costo)
    });

    if (res.ok) {
      cerrarFormulario(); // ¡Éxito! Cierra el formulario
      await cargarCostos(); // Recarga la tabla
      console.log('Costo guardado y tabla recargada');
    } else {
      const errorText = await res.text();
      alert('Error al guardar costo: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarCosto(id) {
  try {
    const res = await fetch(`${window.API_URL}/costos/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const costo = await res.json();

    // Rellena el formulario
    document.getElementById('formTitle').textContent = 'Editar Costo';
    document.getElementById('costoId').value = costo.id;
    document.getElementById('loteSelect').value = costo.loteId;
    document.getElementById('categoria').value = costo.categoria;
    document.getElementById('descripcion').value = costo.descripcion;
    document.getElementById('monto').value = costo.monto;
    document.getElementById('fecha').value = costo.fecha.split('T')[0];

    abrirFormulario(); // ¡Abre el formulario!
    window.scrollTo(0, 0); // Sube al inicio de la página

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

async function eliminarCosto(id) {
  if (confirm('¿Seguro que quieres eliminar este costo?')) {
    try {
      await fetch(`${window.API_URL}/costos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarCostos();
    } catch (error) {
      alert('Error al eliminar costo');
    }
  }
} document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('costoForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block'; // Muestra el botón de "Registrar"

    // Evento para el botón principal (Abrir/Cerrar)
    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        // Abre para CREAR (limpiando el form)
        document.getElementById('formTitle').textContent = 'Registrar Costo';
        form.reset();
        document.getElementById('costoId').value = '';
        abrirFormulario();
      }
    });

    // Evento para el botón de Cancelar dentro del formulario
    cancelBtn.addEventListener('click', () => {
      cerrarFormulario();
    });

    form.onsubmit = guardarCosto; // Vincula el evento submit

  } else {
    toggleBtn.style.display = 'none'; // Oculta el botón
  }

  cargarLotesForSelect();
  cargarCostos();
});