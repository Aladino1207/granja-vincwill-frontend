// --- Lógica de Carga (sin cambios) ---
async function cargarLotesForSelect() {
  try {
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteId');
    if (!select) throw new Error('Elemento loteId no encontrado');
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

async function cargarSalud() {
  try {
    const res = await fetch(`${window.API_URL}/salud`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
      tbody.innerHTML = '<tr><td colspan="6">No hay eventos de salud registrados</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar salud:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---

function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}

function cerrarFormulario() {
  const formContainer = document.getElementById('formContainer');
  formContainer.classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Evento';

  document.getElementById('saludForm').reset();
  document.getElementById('saludId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Evento de Salud';
}

// --- Funciones CRUD (Modificadas) ---

async function guardarSalud(e) {
  e.preventDefault();

  const saludId = document.getElementById('saludId').value;
  const esEdicion = !!saludId;

  // Lógica de cálculo de fecha de retiro
  const diasRetiro = parseInt(document.getElementById('diasRetiro').value) || 0;
  const fechaEvento = new Date(document.getElementById('fecha').value);
  let fechaRetiroCalculada = null;
  if (diasRetiro > 0) {
    fechaEvento.setDate(fechaEvento.getDate() + diasRetiro);
    fechaRetiroCalculada = fechaEvento;
  }

  const salud = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: document.getElementById('tipo').value,
    nombre: document.getElementById('nombre').value,
    cantidad: parseFloat(document.getElementById('cantidad').value),
    fecha: document.getElementById('fecha').value,
    fechaRetiro: fechaRetiroCalculada
  };

  const url = esEdicion
    ? `${window.API_URL}/salud/${saludId}`
    : `${window.API_URL}/salud`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(salud)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarSalud();
    } else {
      const errorText = await res.text();
      alert('Error al guardar: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarSalud(id) {
  try {
    const res = await fetch(`${window.API_URL}/salud/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el evento');
    const s = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Evento de Salud';
    document.getElementById('saludId').value = s.id;
    document.getElementById('loteId').value = s.loteId;
    document.getElementById('tipo').value = s.tipo;
    document.getElementById('nombre').value = s.nombre;
    document.getElementById('cantidad').value = s.cantidad;
    document.getElementById('fecha').value = s.fecha.split('T')[0];

    // Calcular días de retiro (si existen)
    if (s.fechaRetiro) {
      const fechaEvento = new Date(s.fecha);
      const fechaRetiro = new Date(s.fechaRetiro);
      const diffTime = Math.abs(fechaRetiro - fechaEvento);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      document.getElementById('diasRetiro').value = diffDays;
    } else {
      document.getElementById('diasRetiro').value = 0;
    }

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

async function eliminarSalud(id) {
  if (confirm('¿Seguro que quieres eliminar este evento?')) {
    try {
      await fetch(`${window.API_URL}/salud/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarSalud();
    } catch (error) {
      alert('Error al eliminar evento');
    }
  }
}

// --- Event Listener Principal ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('saludForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';

    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        document.getElementById('formTitle').textContent = 'Registrar Evento de Salud';
        form.reset();
        document.getElementById('saludId').value = '';
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarSalud;

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarSalud();
});