let listaProveedores = [];

// --- Lógica de Carga (BLINDADA) ---
async function cargarLotes() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const tbody = document.getElementById('loteTableBody');
    if (!tbody) return; // Protección
    tbody.innerHTML = '';

    if (lotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No hay lotes registrados.</td></tr>';
      return;
    }

    lotes.forEach(lote => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${lote.loteId}</strong></td>
        <td>${lote.Proveedor ? lote.Proveedor.nombreCompania : '<em>No especificado</em>'}</td>
        <td>♂ ${lote.cantidadMachos || 0} / ♀ ${lote.cantidadHembras || 0}</td>
        <td><strong>${lote.cantidad}</strong></td>
        <td>${lote.pesoInicial ? lote.pesoInicial.toFixed(3) : '0.000'} kg</td>
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
    const res = await fetch(`${window.API_URL}/proveedores`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) listaProveedores = await res.json();
  } catch (error) { console.error(error); }
}

// --- Lógica de Formularios ---
function abrirFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.add('is-open');
  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Cancelar';
}

function cerrarFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.remove('is-open');

  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Agregar Nuevo Lote';

  document.getElementById('loteForm').reset();
  document.getElementById('loteDbId').value = '';
  document.getElementById('proveedorId').value = '';
  document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';

  // Resetear displays
  const dispTotal = document.getElementById('displayTotalCantidad');
  if (dispTotal) dispTotal.textContent = '0';
  const dispPeso = document.getElementById('displayPesoPromedio');
  if (dispPeso) dispPeso.textContent = '0.000 kg';
}

// --- CÁLCULOS AUTOMÁTICOS (V 3.3) ---
function calcularTotales() {
  const machos = parseInt(document.getElementById('cantidadMachos').value) || 0;
  const pesoMachos = parseFloat(document.getElementById('pesoPromedioMachos').value) || 0;
  const hembras = parseInt(document.getElementById('cantidadHembras').value) || 0;
  const pesoHembras = parseFloat(document.getElementById('pesoPromedioHembras').value) || 0;

  const totalAves = machos + hembras;
  let pesoPromedioTotal = 0;

  if (totalAves > 0) {
    // Cálculo de promedio ponderado
    const pesoTotalMasa = (machos * pesoMachos) + (hembras * pesoHembras);
    pesoPromedioTotal = pesoTotalMasa / totalAves;
  }

  // Actualizar UI
  const dispTotal = document.getElementById('displayTotalCantidad');
  if (dispTotal) dispTotal.textContent = totalAves;
  const dispPeso = document.getElementById('displayPesoPromedio');
  if (dispPeso) dispPeso.textContent = `${pesoPromedioTotal.toFixed(3)} kg`;

  return { totalAves, pesoPromedioTotal };
}


// --- CRUD ---

async function guardarLote(e) {
  e.preventDefault();

  // Recalcular por seguridad antes de guardar
  const { totalAves, pesoPromedioTotal } = calcularTotales();

  if (totalAves <= 0) {
    alert("Debes ingresar al menos un macho o una hembra.");
    return;
  }

  const loteDbId = document.getElementById('loteDbId').value;
  const esEdicion = !!loteDbId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  // Obtenemos los valores con chequeo de nulos (para evitar el error)
  const provIdEl = document.getElementById('proveedorId');
  const provId = provIdEl ? provIdEl.value : '';

  const lote = {
    loteId: document.getElementById('loteId').value,
    // Proveedor (Opcional)
    proveedorId: provId ? parseInt(provId) : null,

    // Datos detallados
    cantidadMachos: parseInt(document.getElementById('cantidadMachos').value) || 0,
    pesoPromedioMachos: parseFloat(document.getElementById('pesoPromedioMachos').value) || 0,
    cantidadHembras: parseInt(document.getElementById('cantidadHembras').value) || 0,
    pesoPromedioHembras: parseFloat(document.getElementById('pesoPromedioHembras').value) || 0,

    // Campos calculados automáticos (totales)
    cantidad: totalAves,
    pesoInicial: pesoPromedioTotal,

    fechaIngreso: document.getElementById('fechaIngreso').value,
    estado: document.getElementById('estado').value,
    granjaId: granjaId
  };

  // Si es nuevo, guardamos la cantidad inicial como referencia histórica
  if (!esEdicion) {
    lote.cantidadInicial = totalAves;
  }

  const url = esEdicion
    ? `${window.API_URL}/lotes/${loteDbId}`
    : `${window.API_URL}/lotes`;
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
    console.error(error);
  }
}

async function editarLote(id) {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes/${id}?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudo cargar el lote');
    const lote = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Lote';
    document.getElementById('loteDbId').value = lote.id;
    document.getElementById('loteId').value = lote.loteId;
    document.getElementById('fechaIngreso').value = lote.fechaIngreso.split('T')[0];
    document.getElementById('estado').value = lote.estado;

    // Poblar datos de sexado
    document.getElementById('cantidadMachos').value = lote.cantidadMachos || 0;
    document.getElementById('pesoPromedioMachos').value = lote.pesoPromedioMachos || 0;
    document.getElementById('cantidadHembras').value = lote.cantidadHembras || 0;
    document.getElementById('pesoPromedioHembras').value = lote.pesoPromedioHembras || 0;

    // Poblar proveedor en el buscador
    if (lote.proveedorId && lote.Proveedor) {
      const provInput = document.getElementById('proveedorSearch');
      const provIdInput = document.getElementById('proveedorId');
      if (provInput) provInput.value = lote.Proveedor.nombreCompania;
      if (provIdInput) provIdInput.value = lote.proveedorId;
    } else {
      const provInput = document.getElementById('proveedorSearch');
      const provIdInput = document.getElementById('proveedorId');
      if (provInput) provInput.value = '';
      if (provIdInput) provIdInput.value = '';
    }

    calcularTotales(); // Actualizar displays visuales
    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
    alert('Error al cargar datos del lote.');
  }
}

async function eliminarLote(id) {
  if (confirm('¿Seguro que quieres eliminar este lote? Esto borrará todo su historial.')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      await fetch(`${window.API_URL}/lotes/${id}?granjaId=${granjaId}`, {
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

  if (!searchInput || !resultsContainer || !dropdown) return; // Protección

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    // Limpiar ID si el usuario cambia el texto
    hiddenInput.value = '';

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
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('is-open');
    }
  });
}

// --- LÓGICA DEL MODAL DE CREACIÓN RÁPIDA ---
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
        // Usamos el endpoint global de admin
        const res = await fetch(`${window.API_URL}/proveedores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(nuevoProv)
        });

        if (res.ok) {
          const creado = await res.json();
          modal.classList.remove('is-open');
          form.reset();

          await cargarProveedores(); // Refrescar lista global

          // Auto-seleccionar en el formulario principal
          document.getElementById('proveedorSearch').value = creado.nombreCompania;
          document.getElementById('proveedorId').value = creado.id;
        } else {
          alert('Error al crear proveedor');
        }
      } catch (e) { console.error(e); }
    };
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const headerEl = document.querySelector('header h1');
    if (headerEl) headerEl.textContent = `Lotes (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('loteForm');
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
          document.getElementById('loteDbId').value = '';
          document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';
          abrirFormulario();
        }
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarLote;

    // Inicializar componentes nuevos
    setupProveedorSearch();
    setupQuickAddModal();

    // Listeners para cálculo automático en tiempo real
    document.querySelectorAll('.input-calculo').forEach(input => {
      input.addEventListener('input', calcularTotales);
    });

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotes();
  cargarProveedores(); // Cargar lista al inicio
});