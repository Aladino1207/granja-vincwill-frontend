let listaProveedores = [];

// --- Lógica de Carga ---
async function cargarInventario() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const inventario = await res.json();
    const tbody = document.getElementById('tablaInventario');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (inventario.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No hay inventario registrado en esta granja.</td></tr>';
      return;
    }

    inventario.forEach(item => {
      const tr = document.createElement('tr');
      const unidad = item.unidadMedida || 'Unidades';
      const totalEstimado = (item.cantidad * item.costo).toFixed(2);

      // Fecha corregida
      const fechaVisual = new Date(item.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' });

      tr.innerHTML = `
        <td><strong>${item.producto}</strong></td>
        <td>${item.Proveedor ? item.Proveedor.nombreCompania : '-'}</td>
        <td><span class="badge">${item.categoria}</span></td>
        <td><strong>${item.cantidad} ${unidad}</strong></td>
        <td>$${item.costo.toFixed(4)} / ${unidad}</td>
        <td>$${totalEstimado}</td>
        <td>${fechaVisual}</td>
        <td>
          <button onclick="editarInventario(${item.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
          <button onclick="eliminarInventario(${item.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar inventario:', error);
  }
}

// --- Cargar Proveedores ---
async function cargarProveedores() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/proveedores`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) listaProveedores = await res.json();
  } catch (error) { console.error(error); }
}

// --- UI ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nueva Compra';
  document.getElementById('inventarioForm').reset();
  document.getElementById('inventarioId').value = '';
  document.getElementById('proveedorId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Insumo';
}

// --- CRUD ---
async function guardarInventario(e) {
  e.preventDefault();

  const inventarioId = document.getElementById('inventarioId').value;
  const esEdicion = !!inventarioId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const cantidad = parseFloat(document.getElementById('cantidad').value);
  const costoTotal = parseFloat(document.getElementById('costoTotal').value);
  const provId = document.getElementById('proveedorId').value;

  if (cantidad <= 0) { alert("Cantidad debe ser mayor a 0"); return; }
  if (isNaN(costoTotal) || costoTotal < 0) { alert("El costo total no es válido"); return; }

  // Calculamos unitario
  const costoUnitario = costoTotal / cantidad;

  const inventario = {
    producto: document.getElementById('producto').value,
    categoria: document.getElementById('categoria').value,
    unidadMedida: document.getElementById('unidadMedida').value,
    cantidad: cantidad,
    costo: costoUnitario,
    costoTotal: costoTotal,
    fecha: document.getElementById('fecha').value,
    proveedorId: provId ? parseInt(provId) : null,
    granjaId: granjaId
  };

  const url = esEdicion ? `${window.API_URL}/inventario/${inventarioId}` : `${window.API_URL}/inventario`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(inventario)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarInventario();
    } else {
      const errorText = await res.json();
      alert('Error: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) { alert('Error de conexión'); }
}

async function editarInventario(id) {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario/${id}?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al cargar');
    const item = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Insumo';
    document.getElementById('inventarioId').value = item.id;
    document.getElementById('producto').value = item.producto || '';
    document.getElementById('categoria').value = item.categoria || '';
    document.getElementById('cantidad').value = item.cantidad || '';

    if (document.getElementById('unidadMedida')) {
      document.getElementById('unidadMedida').value = item.unidadMedida || 'Unidades';
    }

    const totalCalc = (item.cantidad * item.costo).toFixed(2);
    document.getElementById('costoTotal').value = totalCalc;
    document.getElementById('fecha').value = item.fecha ? item.fecha.split('T')[0] : '';

    if (item.proveedorId) {
      const proveedor = listaProveedores.find(p => p.id === item.proveedorId);
      if (proveedor) {
        document.getElementById('proveedorSearch').value = proveedor.nombreCompania;
        document.getElementById('proveedorId').value = proveedor.id;
      }
    }

    abrirFormulario();
    window.scrollTo(0, 0);
  } catch (error) { console.error(error); }
}

async function eliminarInventario(id) {
  if (confirm('¿Seguro que quieres eliminar este insumo?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();

      await fetch(`${window.API_URL}/inventario/${id}?granjaId=${granjaId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      cargarInventario();
    } catch (error) { alert('Error al eliminar'); }
  }
}

// --- Componentes reutilizables (Buscador y Modal) ---
function setupProveedorSearch() {
  const searchInput = document.getElementById('proveedorSearch');
  const resultsContainer = document.getElementById('proveedorResults');
  const dropdown = document.getElementById('proveedorDropdown');
  const hiddenInput = document.getElementById('proveedorId');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    hiddenInput.value = '';
    if (query.length < 1) { resultsContainer.innerHTML = ''; dropdown.classList.remove('is-open'); return; }
    const filtrados = listaProveedores.filter(p => p.nombreCompania.toLowerCase().includes(query));
    resultsContainer.innerHTML = '';
    if (filtrados.length > 0) {
      filtrados.forEach(p => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `<strong>${p.nombreCompania}</strong>`;
        item.onclick = () => { searchInput.value = p.nombreCompania; hiddenInput.value = p.id; dropdown.classList.remove('is-open'); };
        resultsContainer.appendChild(item);
      });
      dropdown.classList.add('is-open');
    } else dropdown.classList.remove('is-open');
  });
  document.addEventListener('click', (e) => { if (dropdown && !dropdown.contains(e.target)) dropdown.classList.remove('is-open'); });
}

function setupQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  const openBtn = document.getElementById('openQuickAddProveedor');
  const closeBtn = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');

  if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('is-open'));
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('is-open'); });

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nuevoProv = {
        nombreCompania: document.getElementById('quick_nombreCompania').value,
        ruc: document.getElementById('quick_ruc').value,
        telefono: document.getElementById('quick_telefono').value
      };
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${window.API_URL}/proveedores`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(nuevoProv)
        });
        if (res.ok) {
          const creado = await res.json();
          modal.classList.remove('is-open');
          form.reset();
          await cargarProveedores();
          document.getElementById('proveedorSearch').value = creado.nombreCompania;
          document.getElementById('proveedorId').value = creado.id;
        } else alert('Error al crear proveedor');
      } catch (e) { console.error(e); }
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));
  if (granja) document.querySelector('header h1').textContent = `Inventario (${granja.nombre})`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('inventarioForm');

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else {
          document.getElementById('inventarioForm').reset();
          document.getElementById('inventarioId').value = '';
          document.getElementById('formTitle').textContent = 'Registrar Insumo';
          abrirFormulario();
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarInventario;
    setupProveedorSearch();
    setupQuickAddModal();
  } else { if (toggleBtn) toggleBtn.style.display = 'none'; }

  cargarInventario();
  cargarProveedores();
});