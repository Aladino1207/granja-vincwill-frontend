let listaProveedores = [];

// --- Helpers ---
const getVal = (id, type = 'string') => {
  const el = document.getElementById(id);
  if (!el) return type === 'number' ? 0 : '';
  return type === 'number' ? (parseFloat(el.value) || 0) : el.value;
};
const setVal = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.value = val;
};

// --- CARGAR LOTES ---
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
      tbody.innerHTML = '<tr><td colspan="9">No hay lotes registrados.</td></tr>';
      return;
    }

    lotes.forEach(lote => {
      const tr = document.createElement('tr');

      // CORRECCIÓN VISUAL: Leemos el objeto Galpon incluido por el backend
      const nombreGalpon = lote.Galpon ? lote.Galpon.nombre : '<span style="color:red">Sin Asignar</span>';
      const nombreProveedor = lote.Proveedor ? lote.Proveedor.nombreCompania : '-';

      tr.innerHTML = `
        <td><strong>${lote.loteId}</strong></td>
        <td>${nombreGalpon}</td> <!-- AQUI SE MUESTRA EL NOMBRE -->
        <td>${nombreProveedor}</td>
        <td><small>♂${lote.cantidadMachos} / ♀${lote.cantidadHembras}</small></td>
        <td><strong>${lote.cantidad}</strong></td>
        <td>${lote.pesoInicial.toFixed(3)} kg</td>
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

// --- CARGAR GALPONES (CON VALIDACIÓN DE ESTADO) ---
async function cargarGalponesSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/galpones?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const galpones = await res.json();
    const select = document.getElementById('galponSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Seleccione Galpón --</option>';

    galpones.forEach(g => {
      const option = document.createElement('option');
      option.value = g.id;

      // TRUCO: Guardamos la capacidad en un atributo de datos (dataset)
      option.dataset.capacidad = g.capacidad;

      if (g.estado === 'ocupado') {
        option.textContent = `${g.nombre} (OCUPADO)`;
        option.disabled = true;
        option.style.color = '#e74c3c';
      } else if (g.estado === 'mantenimiento') {
        const fecha = new Date(g.fechaDisponible).toLocaleDateString();
        option.textContent = `${g.nombre} (Limpieza hasta: ${fecha})`;
        option.disabled = true;
        option.style.color = '#f39c12';
      } else {
        // Mostramos la capacidad al usuario también
        option.textContent = `${g.nombre} (Capacidad: ${g.capacidad})`;
        option.style.color = '#27ae60';
      }

      select.appendChild(option);
    });
  } catch (e) { console.error("Error cargando galpones", e); }
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

// --- Formularios ---
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
  setVal('loteDbId', '');
  setVal('proveedorId', '');

  // IMPORTANTE: Recargar los galpones al cerrar para refrescar estados
  cargarGalponesSelect();

  const title = document.getElementById('formTitle');
  if (title) title.textContent = 'Agregar Nuevo Lote';

  const dispTotal = document.getElementById('displayTotalCantidad');
  if (dispTotal) dispTotal.textContent = '0';
  const dispPeso = document.getElementById('displayPesoPromedio');
  if (dispPeso) dispPeso.textContent = '0.000 kg';
}

// --- Cálculos Automáticos ---
function calcularTotales() {
  const machos = getVal('cantidadMachos', 'number');
  const pesoMachos = getVal('pesoPromedioMachos', 'number');
  const hembras = getVal('cantidadHembras', 'number');
  const pesoHembras = getVal('pesoPromedioHembras', 'number');

  const totalAves = machos + hembras;
  let pesoPromedioTotal = 0;

  if (totalAves > 0) {
    const pesoTotalMasa = (machos * pesoMachos) + (hembras * pesoHembras);
    pesoPromedioTotal = pesoTotalMasa / totalAves;
  }

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

  // --- VALIDACIÓN DE CAPACIDAD (NUEVO) ---
  const galponSelect = document.getElementById('galponSelect');
  const selectedOption = galponSelect.options[galponSelect.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    alert("Debes seleccionar un Galpón."); return;
  }

  // Leemos la capacidad que guardamos en el dataset
  const capacidadMaxima = parseInt(selectedOption.dataset.capacidad);

  if (totalAves > capacidadMaxima) {
    alert(`⚠️ ¡ALERTA DE SOBREPOBLACIÓN!\n\nEstás intentando ingresar ${totalAves} aves en un galpón con capacidad para ${capacidadMaxima}.\n\nPor favor, ajusta la cantidad o selecciona un galpón más grande.`);
    return; // DETENEMOS EL GUARDADO
  }
  // -------------------------------------

  const loteDbId = getVal('loteDbId');
  const esEdicion = !!loteDbId;
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const provId = getVal('proveedorId');

  const lote = {
    loteId: getVal('loteId'),
    proveedorId: provId ? parseInt(provId) : null,
    galponId: parseInt(galponSelect.value),

    cantidadMachos: getVal('cantidadMachos', 'number'),
    pesoPromedioMachos: getVal('pesoPromedioMachos', 'number'),
    cantidadHembras: getVal('cantidadHembras', 'number'),
    pesoPromedioHembras: getVal('pesoPromedioHembras', 'number'),

    cantidad: totalAves,
    pesoInicial: pesoPromedioTotal,
    costoInicial: getVal('costoInicial', 'number'),

    fechaIngreso: getVal('fechaIngreso'),
    estado: getVal('estado'),
    granjaId: granjaId
  };

  if (!esEdicion) lote.cantidadInicial = totalAves;

  const url = esEdicion ? `${window.API_URL}/lotes/${loteDbId}` : `${window.API_URL}/lotes`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(lote)
    });

    if (res.ok) {
      cerrarFormulario();
      await cargarLotes();
      // Recargar galpones para que el usado aparezca ocupado/actualizado
      await cargarGalponesSelect();
    } else {
      const errorData = await res.json();
      if (errorData.error && errorData.error.includes('ocupado')) {
        alert('⚠️ ' + errorData.error);
      } else {
        alert('Error: ' + (errorData.error || 'Desconocido'));
      }
    }
  } catch (error) { alert('Error de conexión'); console.error(error); }
}

async function editarLote(id) {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes/${id}?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('No se pudo cargar');
    const lote = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Lote';
    setVal('loteDbId', lote.id);
    setVal('loteId', lote.loteId);
    setVal('fechaIngreso', lote.fechaIngreso.split('T')[0]);
    setVal('estado', lote.estado);
    setVal('costoInicial', lote.costoInicial || 0);

    // Manejo especial del select de Galpón en edición
    const galponSelect = document.getElementById('galponSelect');
    for (let i = 0; i < galponSelect.options.length; i++) {
      // Si es el galpón actual del lote, lo habilitamos visualmente para que se vea seleccionado
      if (galponSelect.options[i].value == lote.galponId) {
        galponSelect.options[i].disabled = false;
        if (galponSelect.options[i].text.includes('(OCUPADO)')) {
          galponSelect.options[i].text = galponSelect.options[i].text.replace('(OCUPADO)', '(Actual)');
        }
        break;
      }
    }
    setVal('galponSelect', lote.galponId);

    setVal('cantidadMachos', lote.cantidadMachos || 0);
    setVal('pesoPromedioMachos', lote.pesoPromedioMachos || 0);
    setVal('cantidadHembras', lote.cantidadHembras || 0);
    setVal('pesoPromedioHembras', lote.pesoPromedioHembras || 0);

    if (lote.proveedorId && lote.Proveedor) {
      setVal('proveedorSearch', lote.Proveedor.nombreCompania);
      setVal('proveedorId', lote.proveedorId);
    } else {
      setVal('proveedorSearch', ''); setVal('proveedorId', '');
    }

    calcularTotales();
    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) { console.error(error); alert('Error al cargar datos.'); }
}

async function eliminarLote(id) {
  if (confirm('¿Eliminar lote? Esto borrará todo su historial.')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/lotes/${id}?granjaId=${granjaId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      cargarLotes();
      cargarGalponesSelect(); // Liberar galpón visualmente
    } catch (error) { alert('Error al eliminar'); }
  }
}

// --- BUSCADOR PROVEEDOR (Misma lógica) ---
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
        item.onclick = () => {
          searchInput.value = p.nombreCompania;
          hiddenInput.value = p.id;
          dropdown.classList.remove('is-open');
        };
        resultsContainer.appendChild(item);
      });
      dropdown.classList.add('is-open');
    } else dropdown.classList.remove('is-open');
  });
  document.addEventListener('click', (e) => { if (!dropdown.contains(e.target)) dropdown.classList.remove('is-open'); });
}

function setupQuickAddModal() { /* ... (Misma lógica de siempre) ... */
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
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(nuevoProv)
        });
        if (res.ok) {
          const creado = await res.json();
          modal.classList.remove('is-open');
          form.reset();
          await cargarProveedores();
          if (document.getElementById('proveedorSearch')) {
            document.getElementById('proveedorSearch').value = creado.nombreCompania;
            document.getElementById('proveedorId').value = creado.id;
          }
        } else alert('Error al crear proveedor');
      } catch (e) { console.error(e); }
    };
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));
  if (granja) document.querySelector('header h1').textContent = `Lotes (${granja.nombre})`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('loteForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = formContainer.classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else {
          form.reset();
          setVal('loteDbId', '');
          document.getElementById('formTitle').textContent = 'Agregar Nuevo Lote';
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

  } else toggleBtn.style.display = 'none';

  // V 4.1: Cargar galpones primero
  cargarGalponesSelect().then(() => {
    cargarLotes();
  });
  cargarProveedores();
});