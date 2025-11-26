// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // CORRECCIÓN: Usamos window.API_URL
    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');

    // Limpiamos y añadimos la opción por defecto
    select.innerHTML = '<option value="">Selecciona un Lote (Opcional)</option>';

    // Filtramos solo lotes disponibles para evitar errores, o mostramos todos si prefieres historial
    // En costos es útil ver todos, pero normalmente cargamos los activos.
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (${lote.estado})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

async function cargarCostos() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // CORRECCIÓN: Usamos window.API_URL
    const res = await fetch(`${window.API_URL}/costos?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const costos = await res.json();
    const tbody = document.getElementById('tablaCostos');
    tbody.innerHTML = '';

    if (Array.isArray(costos) && costos.length > 0) {
      costos.forEach(costo => {
        const tr = document.createElement('tr');
        const nombreLote = (costo.Lote && costo.Lote.loteId) ? costo.Lote.loteId : (costo.loteId ? 'Lote ' + costo.loteId : 'Gasto General');

        // Corrección de Fecha
        const fechaVisual = costo.fecha ? new Date(costo.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A';

        tr.innerHTML = `
      <td>${nombreLote}</td>
      <td>${costo.categoria || 'N/A'}</td>
      <td>${costo.descripcion || 'N/A'}</td>
      <td>$${costo.monto ? costo.monto.toFixed(2) : '0.00'}</td>
      <td>${fechaVisual}</td> <!-- FECHA CORREGIDA -->
      <td>
        <button onclick="editarCosto(${costo.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
        <button onclick="eliminarCosto(${costo.id})" class="btn btn-sm btn-peligro">Eliminar</button>
      </td>
    `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No hay costos registrados.</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar costos:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Gasto';
  document.getElementById('costoForm').reset();
  document.getElementById('costoId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Gasto Operativo';
}

// --- Funciones CRUD ---

async function guardarCosto(e) {
  e.preventDefault();

  const costoId = document.getElementById('costoId').value;
  const esEdicion = !!costoId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const loteVal = document.getElementById('loteSelect').value;

  const costo = {
    loteId: loteVal ? parseInt(loteVal) : null, // Permitir nulo para gastos generales
    categoria: document.getElementById('categoria').value,
    descripcion: document.getElementById('descripcion').value,
    monto: parseFloat(document.getElementById('monto').value),
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId
  };

  const url = esEdicion
    ? `${window.API_URL}/costos/${costoId}`
    : `${window.API_URL}/costos`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(costo)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarCostos();
    } else {
      const errorText = await res.json();
      alert('Error al guardar costo: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
    console.error(error);
  }
}

async function editarCosto(id) {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/costos/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Costo no encontrado o sin permisos');
    const costo = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Gasto';
    document.getElementById('costoId').value = costo.id;
    document.getElementById('loteSelect').value = costo.loteId || ""; // Manejar nulo
    document.getElementById('categoria').value = costo.categoria;
    document.getElementById('descripcion').value = costo.descripcion;
    document.getElementById('monto').value = costo.monto;
    document.getElementById('fecha').value = costo.fecha.split('T')[0];

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

async function eliminarCosto(id) {
  if (confirm('¿Seguro que quieres eliminar este registro de costo?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      await fetch(`${window.API_URL}/costos/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarCostos();
    } catch (error) {
      alert('Error al eliminar costo');
    }
  }
}

// --- Event Listener Principal ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const headerEl = document.querySelector('header h1');
    if (headerEl) headerEl.textContent = `Costos (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('costoForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = formContainer.classList.contains('is-open');
        if (isOpen) {
          cerrarFormulario();
        } else {
          form.reset();
          document.getElementById('costoId').value = '';
          document.getElementById('formTitle').textContent = 'Registrar Gasto Operativo';
          abrirFormulario();
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarCosto;
  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect(); // Ahora funcionará correctamente
  cargarCostos();
});