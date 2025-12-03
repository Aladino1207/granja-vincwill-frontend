// --- V 3.1: Variable global para la lista de proveedores ---
let listaProveedores = [];

// --- Lógica de Carga (BLINDADA) ---
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
      tbody.innerHTML = '<tr><td colspan="6">No hay inventario registrado.</td></tr>';
      return;
    }

    inventario.forEach(item => {
      const tr = document.createElement('tr');
      const unidad = item.unidadMedida || 'Unidades';

      // Botón "Usar" (Consumo)
      const btnUsar = `<button onclick="abrirModalConsumo('${item.id}', '${item.producto}', '${item.cantidad}', '${unidad}')" class="btn btn-sm" style="background-color: #2ecc71; color: white; margin-right: 5px;">📉 Usar</button>`;

      tr.innerHTML = `
        <td><strong>${item.producto}</strong></td>
        <td>${item.Proveedor ? item.Proveedor.nombreCompania : '-'}</td>
        <td><span class="badge">${item.categoria}</span></td>
        <td><strong>${item.cantidad} ${unidad}</strong></td>
        <td>$${item.costo.toFixed(4)} / ${unidad}</td>
        <td>
          ${btnUsar}
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

// --- Cargar Lotes (Para el modal de consumo) ---
async function cargarLotesForConsumo() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const lotes = await res.json();
    const select = document.getElementById('consumoLoteId');
    select.innerHTML = '<option value="">-- Seleccionar Lote --</option>';
    lotes.forEach(l => {
      // Mostramos todos, incluso los vendidos por si es un costo tardío
      select.appendChild(new Option(`${l.loteId} (${l.estado})`, l.id));
    });
  } catch (e) { console.error(e); }
}

// --- LÓGICA DEL MODAL DE CONSUMO ---
function abrirModalConsumo(id, nombre, stock, unidad) {
  const modal = document.getElementById('consumoModal');
  document.getElementById('consumoInventarioId').value = id;
  document.getElementById('consumoNombre').value = nombre;
  document.getElementById('consumoUnidadDisplay').textContent = unidad;
  document.getElementById('consumoStockMax').textContent = `Máximo disponible: ${stock} ${unidad}`;

  // Configurar input cantidad
  const inputCant = document.getElementById('consumoCantidad');
  inputCant.value = '';
  inputCant.max = stock; // Validación HTML5

  // Cargar lotes si no están cargados
  if (document.getElementById('consumoLoteId').options.length <= 1) {
    cargarLotesForConsumo();
  }

  modal.classList.add('is-open');
}

// --- Lógica para cargar Proveedores ---
async function cargarProveedores() {
  try {
    const token = localStorage.getItem('token');
    // Los proveedores son globales (endpoint de Admin)
    const res = await fetch(`${window.API_URL}/proveedores`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudieron cargar proveedores');
    listaProveedores = await res.json();
    // Inicialmente no mostramos resultados, solo cuando el usuario escribe
  } catch (error) {
    console.error(error);
    alert('Error al cargar la lista de proveedores.');
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nuevo Insumo';
  document.getElementById('inventarioForm').reset();
  document.getElementById('inventarioId').value = '';
  document.getElementById('proveedorId').value = ''; // Limpiar ID oculto
  document.getElementById('formTitle').textContent = 'Registrar Insumo';
}

// --- Funciones CRUD (BLINDADAS) ---
async function guardarInventario(e) {
  e.preventDefault();

  const inventarioId = document.getElementById('inventarioId').value;
  const esEdicion = !!inventarioId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const cantidad = parseFloat(document.getElementById('cantidad').value);
  const costoTotal = parseFloat(document.getElementById('costoTotal').value);
  const provId = document.getElementById('proveedorId').value;

  if (cantidad <= 0) { alert("Cantidad > 0"); return; }

  // Cálculo del unitario
  const costoUnitario = costoTotal / cantidad;

  const inventario = {
    producto: document.getElementById('producto').value,
    categoria: document.getElementById('categoria').value,
    // V 3.4: Enviamos la unidad seleccionada
    unidadMedida: document.getElementById('unidadMedida').value,
    cantidad: cantidad,
    costo: costoUnitario,
    costoTotal: costoTotal,
    fecha: document.getElementById('fecha').value,
    proveedorId: provId ? parseInt(provId) : null,
    granjaId: granjaId
  };

  const url = esEdicion
    ? `${window.API_URL}/inventario/${inventarioId}`
    : `${window.API_URL}/inventario`;
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

    const res = await fetch(`${window.API_URL}/inventario/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al cargar');
    const item = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Insumo';
    document.getElementById('inventarioId').value = item.id;
    document.getElementById('producto').value = item.producto || '';
    document.getElementById('categoria').value = item.categoria || '';
    document.getElementById('cantidad').value = item.cantidad || '';

    // Cargar unidad de medida
    if (document.getElementById('unidadMedida')) {
      document.getElementById('unidadMedida').value = item.unidadMedida || 'Unidades';
    }

    // Recalcular el costo total para mostrarlo (ya que guardamos el unitario)
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
      if (!granjaId) return;

      await fetch(`${window.API_URL}/inventario/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarInventario();
    } catch (error) {
      alert('Error al eliminar insumo');
    }
  }
}

// --- V 3.1: LÓGICA DEL COMBOBOX CON BÚSQUEDA (PROVEEDOR) ---

function setupProveedorSearch() {
  const searchInput = document.getElementById('proveedorSearch');
  const resultsContainer = document.getElementById('proveedorResults');
  const dropdown = document.getElementById('proveedorDropdown');
  const hiddenInput = document.getElementById('proveedorId');

  // 1. Mostrar resultados al escribir
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      dropdown.classList.remove('is-open');
      return;
    }

    const filtrados = listaProveedores.filter(p =>
      p.nombreCompania.toLowerCase().includes(query) ||
      p.ruc.includes(query)
    );

    resultsContainer.innerHTML = ''; // Limpiar
    if (filtrados.length > 0) {
      filtrados.forEach(p => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `<strong>${p.nombreCompania}</strong> <span>(${p.ruc})</span>`;
        item.onclick = () => {
          seleccionarProveedor(p);
        };
        resultsContainer.appendChild(item);
      });
      dropdown.classList.add('is-open');
    } else {
      dropdown.classList.remove('is-open');
    }
  });

  // 2. Función para seleccionar un proveedor
  function seleccionarProveedor(proveedor) {
    searchInput.value = `${proveedor.nombreCompania} (${proveedor.ruc})`;
    hiddenInput.value = proveedor.id;
    dropdown.classList.remove('is-open');
  }

  // 3. Cerrar si se hace clic fuera
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('is-open');
    }
  });

  // 4. Limpiar si el usuario borra el texto
  searchInput.addEventListener('change', () => {
    if (searchInput.value === '') {
      hiddenInput.value = '';
    }
  });
}

// --- V 3.1: LÓGICA DEL MODAL DE CREACIÓN RÁPIDA (PROVEEDOR) ---

function setupQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  const openBtn = document.getElementById('openQuickAddProveedor');
  const closeBtn = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');
  const errorMsg = document.getElementById('quickAddError');

  openBtn.addEventListener('click', () => {
    modal.classList.add('is-open');
  });
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('is-open');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('is-open');
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    const nuevoProveedor = {
      nombreCompania: document.getElementById('quick_nombreCompania').value,
      ruc: document.getElementById('quick_ruc').value,
      telefono: document.getElementById('quick_telefono').value
    };

    try {
      const token = localStorage.getItem('token');
      // Usamos el endpoint global de admin
      const res = await fetch(`${window.API_URL}/proveedores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(nuevoProveedor)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error del servidor');
      }

      const proveedorCreado = await res.json();

      // 1. Cerrar el modal
      modal.classList.remove('is-open');
      form.reset();

      // 2. Actualizar la lista global de proveedores
      await cargarProveedores();

      // 3. Autoseleccionar el proveedor recién creado
      document.getElementById('proveedorSearch').value = `${proveedorCreado.nombreCompania} (${proveedorCreado.ruc})`;
      document.getElementById('proveedorId').value = proveedorCreado.id;

    } catch (error) {
      errorMsg.textContent = `Error: ${error.message}`;
      errorMsg.style.display = 'block';
    }
  };
}


// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    document.querySelector('header h1').textContent = `Inventario (${granja.nombre})`;
  }

  // 1. Configuración del Formulario Principal
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
          document.getElementById('proveedorId').value = '';
          document.getElementById('formTitle').textContent = 'Registrar Insumo';
          abrirFormulario();
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarInventario;

    // Inicializar componentes nuevos (V 3.x)
    setupProveedorSearch();
    setupQuickAddModal();

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  // 2. Configuración del Modal de Consumo (NUEVO)
  const modalConsumo = document.getElementById('consumoModal');
  const closeConsumo = document.getElementById('closeConsumoModal');
  const formConsumo = document.getElementById('consumoForm');
  const selectDestino = document.getElementById('consumoDestino');
  const groupLote = document.getElementById('groupConsumoLote');

  if (closeConsumo) closeConsumo.onclick = () => modalConsumo.classList.remove('is-open');

  if (selectDestino) {
    selectDestino.onchange = () => {
      if (selectDestino.value === 'lote') {
        groupLote.style.display = 'flex';
        document.getElementById('consumoLoteId').required = true;
      } else {
        groupLote.style.display = 'none';
        document.getElementById('consumoLoteId').required = false;
        document.getElementById('consumoLoteId').value = "";
      }
    };
  }

  if (formConsumo) {
    formConsumo.onsubmit = async (e) => {
      e.preventDefault();
      const granjaId = getSelectedGranjaId();
      const payload = {
        granjaId,
        inventarioId: document.getElementById('consumoInventarioId').value,
        cantidad: parseFloat(document.getElementById('consumoCantidad').value),
        motivo: document.getElementById('consumoMotivo').value,
        loteId: selectDestino.value === 'lote' ? document.getElementById('consumoLoteId').value : null
      };

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${window.API_URL}/inventario/consumo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          modalConsumo.classList.remove('is-open');
          alert("Consumo registrado y descontado correctamente.");
          cargarInventario();
        } else {
          const err = await res.json();
          alert("Error: " + err.error);
        }
      } catch (err) { alert("Error de conexión"); }
    };
  }

  // 3. Carga de Datos Iniciales
  cargarInventario();
  cargarProveedores();
});