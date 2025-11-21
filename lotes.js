// --- Variable global para proveedores ---
let listaProveedores = [];

// --- Lógica de Carga (BLINDADA) ---
async function cargarLotes() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const tbody = document.getElementById('loteTableBody');
    tbody.innerHTML = '';

    if (lotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No hay lotes registrados.</td></tr>';
      return;
    }

    lotes.forEach(lote => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${lote.loteId}</strong></td>
        <td>${lote.Proveedor ? lote.Proveedor.nombreCompania : '<em>No especificado</em>'}</td>
        <td>${lote.cantidad}</td>
        <td>${lote.pesoInicial} kg</td>
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

// --- Cargar Proveedores (Global) ---
async function cargarProveedores() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/proveedores`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al cargar proveedores');
    listaProveedores = await res.json();
  } catch (error) { console.error(error); }
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
  document.getElementById('proveedorId').value = ''; // Limpiar ID oculto
  document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';
}

// --- Funciones CRUD ---

async function guardarLote(e) {
  e.preventDefault();

  const loteDbId = document.getElementById('loteDbId').value;
  const esEdicion = !!loteDbId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const lote = {
    loteId: document.getElementById('loteId').value,
    cantidad: parseInt(document.getElementById('cantidad').value),
    pesoInicial: parseFloat(document.getElementById('pesoInicial').value),
    fechaIngreso: document.getElementById('fechaIngreso').value,
    estado: document.getElementById('estado').value,
    proveedorId: document.getElementById('proveedorId').value ? parseInt(document.getElementById('proveedorId').value) : null, // NUEVO
    granjaId: granjaId
  };

  if (!esEdicion) {
    lote.cantidadInicial = lote.cantidad;
  }

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
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${API_URL}/lotes/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el lote');
    const lote = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Lote';
    document.getElementById('loteDbId').value = lote.id;
    document.getElementById('loteId').value = lote.loteId;
    document.getElementById('cantidad').value = lote.cantidad;
    document.getElementById('pesoInicial').value = lote.pesoInicial;
    document.getElementById('fechaIngreso').value = lote.fechaIngreso.split('T')[0];
    document.getElementById('estado').value = lote.estado;

    // Poblar proveedor
    if (lote.proveedorId) {
      const prov = listaProveedores.find(p => p.id === lote.proveedorId);
      if (prov) {
        document.getElementById('proveedorSearch').value = `${prov.nombreCompania} (${prov.ruc})`;
        document.getElementById('proveedorId').value = prov.id;
      }
    }

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

async function eliminarLote(id) {
  if (confirm('¿Seguro que quieres eliminar este lote?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

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

// --- LÓGICA DE BÚSQUEDA DE PROVEEDOR ---
function setupProveedorSearch() {
  const searchInput = document.getElementById('proveedorSearch');
  const resultsContainer = document.getElementById('proveedorResults');
  const dropdown = document.getElementById('proveedorDropdown');
  const hiddenInput = document.getElementById('proveedorId');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    if (query.length < 1) {
      resultsContainer.innerHTML = '';
      dropdown.classList.remove('is-open');
      return;
    }
    const filtrados = listaProveedores.filter(p => p.nombreCompania.toLowerCase().includes(query));
    resultsContainer.innerHTML = '';

    if (filtrados.length > 0) {
      filtrados.forEach(p => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `<strong>${p.nombreCompania}</strong>`;
        item.onclick = () => {
          searchInput.value = p.nombreCompania;
          hiddenInput.value = p.id;
          dropdown.classList.remove('is-open');
        };
        resultsContainer.appendChild(item);
      });
      dropdown.classList.add('is-open');
    } else {
      dropdown.classList.remove('is-open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove('is-open');
  });

  // Limpiar ID si borra texto
  searchInput.addEventListener('change', () => {
    if (searchInput.value === '') hiddenInput.value = '';
  });
}

// --- LÓGICA DEL MODAL DE CREACIÓN RÁPIDA ---
function setupQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  const openBtn = document.getElementById('openQuickAddProveedor');
  const closeBtn = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');

  if (!openBtn) return; // Si no existe el botón (ej. en otra vista), salimos

  openBtn.addEventListener('click', () => modal.classList.add('is-open'));
  closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('is-open'); });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nuevoProv = {
      nombreCompania: document.getElementById('quick_nombreCompania').value,
      ruc: document.getElementById('quick_ruc').value,
      telefono: document.getElementById('quick_telefono').value
    };
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/proveedores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(nuevoProv)
      });
      if (res.ok) {
        const creado = await res.json();
        modal.classList.remove('is-open');
        form.reset();
        await cargarProveedores(); // Refrescar lista
        // Auto-seleccionar
        document.getElementById('proveedorSearch').value = creado.nombreCompania;
        document.getElementById('proveedorId').value = creado.id;
      } else {
        alert('Error al crear proveedor');
      }
    } catch (e) { console.error(e); }
  };
}


// --- Event Listener Principal ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) document.querySelector('header h1').textContent = `Lotes (${granja.nombre})`;

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
        form.reset();
        document.getElementById('loteDbId').value = '';
        document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarLote;

    // Inicializar componentes nuevos
    setupProveedorSearch();
    setupQuickAddModal();

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarLotes();
  cargarProveedores(); // Cargar lista al inicio
});