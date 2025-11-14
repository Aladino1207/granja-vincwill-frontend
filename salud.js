// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteId'); // ID del select en salud.html
    if (!select) throw new Error('Elemento loteId no encontrado');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Stock: ${lote.cantidad})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

async function cargarSalud() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/salud?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
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
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarSalud(e) {
  e.preventDefault();

  const saludId = document.getElementById('saludId').value;
  const esEdicion = !!saludId;
  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

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
    fechaRetiro: fechaRetiroCalculada,
    granjaId: granjaId // V 3.0: Añadido
  };

  const url = esEdicion
    ? `${API_URL}/salud/${saludId}`
    : `${API_URL}/salud`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(salud)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarSalud();
      // Si fue mortalidad, recargamos los lotes para ver el stock actualizado
      if (salud.tipo.toLowerCase() === 'mortalidad') {
        await cargarLotesForSelect();
      }
    } else {
      const errorText = await res.json();
      alert('Error al guardar: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarSalud(id) {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${API_URL}/salud/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
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
  // NOTA: El backend V 3.0 NO revierte el stock al eliminar mortalidad (por simplicidad)
  if (confirm('¿Seguro que quieres eliminar este evento? (Esto NO devolverá stock si fue una mortalidad)')) {
    try {
      const token = localStorage.getItem('token');
      // V 3.0: Obtenemos la granja activa
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      // V 3.0: Añadimos granjaId al fetch
      await fetch(`${API_URL}/salud/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarSalud();
      // Recargamos lotes por si acaso la lógica de backend cambia
      cargarLotesForSelect();
    } catch (error) {
      alert('Error al eliminar evento');
    }
  }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Salud (${granja.nombre})`;
  }

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
        form.reset();
        document.getElementById('saludId').value = '';
        formTitle.textContent = 'Registrar Evento de Salud';
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