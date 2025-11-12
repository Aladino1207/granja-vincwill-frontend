// --- Lógica de Carga ---
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

async function cargarAlimentosParaSelect() {
  try {
    const res = await fetch(`${window.API_URL}/inventario`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const inventario = await res.json();
    const select = document.getElementById('alimentoSelect');
    if (!select) throw new Error('Elemento alimentoSelect no encontrado');

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
    const res = await fetch(`${window.API_URL}/seguimiento`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const seguimiento = await res.json();
    const tbody = document.getElementById('tablaSeguimiento');
    tbody.innerHTML = '';
    if (Array.isArray(seguimiento) && seguimiento.length > 0) {
      seguimiento.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${s.loteId || 'N/A'}</td>
          <td>${s.semana || 'N/A'}</td>
          <td>${s.peso || 0}</td>
          <td>${s.consumo || 0}</td>
          <td>${s.observaciones || 'N/A'}</td>
          <td>${s.fecha ? new Date(s.fecha).toLocaleDateString() : 'N/A'}</td>
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

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---

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

// --- Funciones CRUD (Modificadas) ---

async function guardarSeguimiento(e) {
  e.preventDefault();

  const seguimientoId = document.getElementById('seguimientoId').value;
  const esEdicion = !!seguimientoId;

  const seguimiento = {
    loteId: parseInt(document.getElementById('loteSelect').value),
    alimentoId: parseInt(document.getElementById('alimentoSelect').value),
    semana: parseInt(document.getElementById('semana').value),
    peso: parseFloat(document.getElementById('peso').value),
    consumo: parseFloat(document.getElementById('consumo').value),
    observaciones: document.getElementById('observaciones').value,
    fecha: document.getElementById('fecha').value
  };

  const url = esEdicion
    ? `${window.API_URL}/seguimiento/${seguimientoId}`
    : `${window.API_URL}/seguimiento`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(seguimiento)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarSeguimiento();
      await cargarAlimentosParaSelect(); // Recarga el stock de alimentos
    } else {
      const errorText = await res.text();
      alert('Error al guardar: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarSeguimiento(id) {
  try {
    const res = await fetch(`${window.API_URL}/seguimiento/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
  if (confirm('¿Seguro que quieres eliminar este seguimiento?')) {
    try {
      await fetch(`${window.API_URL}/seguimiento/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarSeguimiento();
    } catch (error) {
      alert('Error al eliminar seguimiento');
    }
  }
}

// --- Event Listener Principal ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

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
        document.getElementById('formTitle').textContent = 'Registrar Seguimiento';
        form.reset();
        document.getElementById('seguimientoId').value = '';
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