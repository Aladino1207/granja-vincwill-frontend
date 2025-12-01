let listaProveedores = [];

// --- Función auxiliar segura para obtener valores (BLINDAJE) ---
// Evita el error "Cannot read properties of null (reading 'value')"
const getVal = (id, type = 'string') => {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Elemento con ID '${id}' no encontrado. Usando valor por defecto.`);
    return type === 'number' ? 0 : '';
  }
  return type === 'number' ? (parseFloat(el.value) || 0) : el.value;
};

// --- Función auxiliar segura para asignar valores ---
const setVal = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.value = val;
};

// --- Lógica de Carga ---
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
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No hay lotes registrados en esta granja.</td></tr>';
      return;
    }

    lotes.forEach(lote => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${lote.loteId}</strong></td>
        <td>${lote.Proveedor ? lote.Proveedor.nombreCompania : '<em>No especificado</em>'}</td>
        <td>
            <div style="font-size: 0.85rem;">
                <span style="color: var(--color-secundario);">♂ ${lote.cantidadMachos || 0}</span> / 
                <span style="color: #e91e63;">♀ ${lote.cantidadHembras || 0}</span>
            </div>
        </td>
        <td><strong>${lote.cantidad}</strong></td>
        <td>${lote.pesoInicial ? lote.pesoInicial.toFixed(3) : '0.000'} kg</td>
        <td>${new Date(lote.fechaIngreso).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</td>
        <td><span class="badge-${lote.estado}">${lote.estado}</span></td>
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

  const form = document.getElementById('loteForm');
  if (form) form.reset();

  setVal('loteDbId', '');
  setVal('proveedorId', '');

  const title = document.getElementById('formTitle');
  if (title) title.textContent = 'Agregar Nuevo Lote';

  // Resetear displays de cálculo
  const dispTotal = document.getElementById('displayTotalCantidad');
  if (dispTotal) dispTotal.textContent = '0';
  const dispPeso = document.getElementById('displayPesoPromedio');
  if (dispPeso) dispPeso.textContent = '0.000 kg';
}

// --- CÁLCULOS AUTOMÁTICOS (V 3.3) ---
function calcularTotales() {
  // Usamos getVal para que no falle si falta un input
  const machos = getVal('cantidadMachos', 'number');
  const pesoMachos = getVal('pesoPromedioMachos', 'number');
  const hembras = getVal('cantidadHembras', 'number');
  const pesoHembras = getVal('pesoPromedioHembras', 'number');

  const totalAves = machos + hembras;
  let pesoPromedioTotal = 0;

  if (totalAves > 0) {
    // Cálculo de promedio ponderado
    const pesoTotalMasa = (machos * pesoMachos) + (hembras * pesoHembras);
    pesoPromedioTotal = pesoTotalMasa / totalAves;
  }

  // Actualizar UI solo si existen los elementos
  const dispTotal = document.getElementById('displayTotalCantidad');
  if (dispTotal) dispTotal.textContent = totalAves;

  const dispPeso = document.getElementById('displayPesoPromedio');
  if (dispPeso) dispPeso.textContent = `${pesoPromedioTotal.toFixed(3)} kg`;

  return { totalAves, pesoPromedioTotal };
}

// --- CRUD ---

async function guardarLote(e) {
  e.preventDefault();

  const { totalAves, pesoPromedioTotal } = calcularTotales();
  if (totalAves <= 0) { alert("Debes ingresar aves."); return; }

  const loteDbId = getVal('loteDbId');
  const esEdicion = !!loteDbId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const provId = getVal('proveedorId');
  // NUEVO: Leer costo
  const costoIni = getVal('costoInicial', 'number');

  const lote = {
    loteId: getVal('loteId'),
    proveedorId: provId ? parseInt(provId) : null,
    costoInicial: costoIni, // <-- Enviamos el costo

    cantidadMachos: getVal('cantidadMachos', 'number'),
    pesoPromedioMachos: getVal('pesoPromedioMachos', 'number'),
    cantidadHembras: getVal('cantidadHembras', 'number'),
    pesoPromedioHembras: getVal('pesoPromedioHembras', 'number'),

    // Campos calculados
    cantidad: totalAves,
    pesoInicial: pesoPromedioTotal,

    fechaIngreso: getVal('fechaIngreso'),
    estado: getVal('estado'),
    granjaId: granjaId
  };

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

    const title = document.getElementById('formTitle');
    if (title) title.textContent = 'Editar Lote';

    setVal('loteDbId', lote.id);
    setVal('loteId', lote.loteId);
    setVal('fechaIngreso', lote.fechaIngreso.split('T')[0]);
    setVal('estado', lote.estado);

    // Poblar datos de sexado
    setVal('cantidadMachos', lote.cantidadMachos || 0);
    setVal('pesoPromedioMachos', lote.pesoPromedioMachos || 0);
    setVal('cantidadHembras', lote.cantidadHembras || 0);
    setVal('pesoPromedioHembras', lote.pesoPromedioHembras || 0);

    // Poblar proveedor
    if (lote.proveedorId && lote.Proveedor) {
      setVal('proveedorSearch', lote.Proveedor.nombreCompania);
      setVal('proveedorId', lote.proveedorId);
    } else {
      setVal('proveedorSearch', '');
      setVal('proveedorId', '');
    }

    calcularTotales();
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

  if (!searchInput || !resultsContainer || !dropdown) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    if (hiddenInput) hiddenInput.value = '';

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
          if (hiddenInput) hiddenInput.value = p.id;
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
        nombreCompania: getVal('quick_nombreCompania'),
        ruc: getVal('quick_ruc'),
        telefono: getVal('quick_telefono')
      };
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${window.API_URL}/proveedores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(nuevoProv)
        });
        if (res.ok) {
          const creado = await res.json();
          modal.classList.remove('is-open');
          form.reset();

          await cargarProveedores();

          const searchInput = document.getElementById('proveedorSearch');
          const hiddenInput = document.getElementById('proveedorId');
          if (searchInput) searchInput.value = creado.nombreCompania;
          if (hiddenInput) hiddenInput.value = creado.id;
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
          setVal('loteDbId', '');
          const title = document.getElementById('formTitle');
          if (title) title.textContent = 'Agregar Nuevo Lote';
          abrirFormulario();
        }
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarLote;

    setupProveedorSearch();
    setupQuickAddModal();

    document.querySelectorAll('.input-calculo').forEach(input => {
      input.addEventListener('input', calcularTotales);
    });

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotes();
  cargarProveedores();
});