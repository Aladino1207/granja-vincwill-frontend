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
    const select = document.getElementById('loteSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    // FILTRO VITAL: Solo lotes DISPONIBLES
    const lotesActivos = lotes.filter(l => l.estado === 'disponible');

    lotesActivos.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId}`;
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarAlimentosParaSelect() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const inventario = await res.json();
    const select = document.getElementById('alimentoSelect');

    // Filtramos solo por categoría "Alimento"
    const alimentos = inventario.filter(item => item.categoria === 'Alimento');
    select.innerHTML = '<option value="">Selecciona un Alimento</option>';

    alimentos.forEach(alimento => {
      const option = document.createElement('option');
      option.value = alimento.id;
      option.textContent = `${alimento.producto} (Stock: ${alimento.cantidad} kg)`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar alimentos para select:', error);
  }
}

async function cargarSeguimiento() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/seguimiento?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const seguimiento = await res.json();
    const tbody = document.getElementById('tablaSeguimiento');
    tbody.innerHTML = '';
    if (Array.isArray(seguimiento) && seguimiento.length > 0) {
      seguimiento.forEach(s => {
        const tr = document.createElement('tr');

        // CORRECCIÓN DE FECHA (UTC)
        const fechaVisual = s.fecha ? new Date(s.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A';

        tr.innerHTML = `
          <td>${s.loteId || 'N/A'}</td>
          <td>${s.semana || 'N/A'}</td>
          <td>${s.peso || 0}</td>
          <td>${s.consumo || 0}</td>
          <td>${s.observaciones || 'N/A'}</td>
          <td>${fechaVisual}</td> <!-- Fecha corregida -->
          <td>
            <button onclick="editarSeguimiento(${s.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
            <button onclick="eliminarSeguimiento(${s.id})" class="btn btn-sm btn-peligro">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No hay seguimientos registrados</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar seguimiento:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE (Sin cambios) ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Seguimiento';
  document.getElementById('seguimientoForm').reset();
  document.getElementById('seguimientoId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Seguimiento';
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarSeguimiento(e) {
  e.preventDefault();

  const seguimientoId = document.getElementById('seguimientoId').value;
  const esEdicion = !!seguimientoId;
  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const seguimiento = {
    loteId: parseInt(document.getElementById('loteSelect').value),
    alimentoId: parseInt(document.getElementById('alimentoSelect').value),
    semana: parseInt(document.getElementById('semana').value),
    peso: parseFloat(document.getElementById('peso').value),
    consumo: parseFloat(document.getElementById('consumo').value),
    observaciones: document.getElementById('observaciones').value,
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId // V 3.0: Añadido
  };

  const url = esEdicion
    ? `${window.API_URL}/seguimiento/${seguimientoId}`
    : `${window.API_URL}/seguimiento`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(seguimiento)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarSeguimiento();
      await cargarAlimentosParaSelect(); // Recarga el stock de alimentos
    } else {
      const errorText = await res.json();
      alert('Error al guardar: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarSeguimiento(id) {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/seguimiento/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el registro');
    const s = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Seguimiento';
    document.getElementById('seguimientoId').value = s.id;
    document.getElementById('loteSelect').value = s.loteId;
    document.getElementById('alimentoSelect').value = s.alimentoId; // Campo de alimento
    document.getElementById('semana').value = s.semana;
    document.getElementById('peso').value = s.peso;
    document.getElementById('consumo').value = s.consumo;
    document.getElementById('observaciones').value = s.observaciones || '';
    document.getElementById('fecha').value = s.fecha ? s.fecha.split('T')[0] : '';

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

async function eliminarSeguimiento(id) {
  // Nota: El backend V 3.0 NO revierte el stock de alimento al eliminar (por simplicidad)
  if (confirm('¿Seguro que quieres eliminar este seguimiento? (Esto NO devolverá stock de alimento)')) {
    try {
      const token = localStorage.getItem('token');
      // V 3.0: Obtenemos la granja activa
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      // V 3.0: Añadimos granjaId al fetch
      await fetch(`${window.API_URL}/seguimiento/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarSeguimiento();
    } catch (error) {
      alert('Error al eliminar seguimiento');
    }
  }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Seguimiento (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('seguimientoForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';

    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        form.reset();
        document.getElementById('seguimientoId').value = '';
        formTitle.textContent = 'Registrar Seguimiento';
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarSeguimiento;

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarAlimentosParaSelect(); // Carga los alimentos
  cargarSeguimiento();
});