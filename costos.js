// --- NUEVAS FUNCIONES PARA MANEJAR EL MODAL ---
const modal = document.getElementById('formModal');
const form = document.getElementById('costoForm');
const formTitle = document.getElementById('formTitle');
const costoIdInput = document.getElementById('costoId');

function openModal() {
  modal.classList.add('is-open');
}

function closeModal() {
  modal.classList.remove('is-open');
  form.reset(); // Limpia el formulario
  costoIdInput.value = ''; // Limpia el ID oculto
  formTitle.textContent = 'Registrar Costo'; // Restaura el título
}

// --- LÓGICA EXISTENTE (MODIFICADA) ---

// (cargarLotesForSelect sigue igual)
async function cargarLotesForSelect() {
  // ... (tu código no cambia) ...
}

// (cargarCostos sigue igual)
async function cargarCostos() {
  // ... (tu código no cambia) ...
}

async function guardarCosto(e) {
  e.preventDefault();

  const costoId = costoIdInput.value; // Revisa si hay un ID
  const esEdicion = !!costoId;

  const costo = {
    loteId: parseInt(document.getElementById('loteSelect').value),
    categoria: document.getElementById('categoria').value,
    descripcion: document.getElementById('descripcion').value,
    monto: parseFloat(document.getElementById('monto').value),
    fecha: document.getElementById('fecha').value
  };

  const url = esEdicion
    ? `${window.API_URL}/costos/${costoId}`
    : `${window.API_URL}/costos`;

  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(costo)
    });

    if (res.ok) {
      closeModal(); // ¡Éxito! Cierra el modal
      await cargarCostos(); // Recarga la tabla
      console.log('Costo guardado y tabla recargada');
    } else {
      const errorText = await res.text();
      console.error('Error al guardar costo:', errorText);
      alert('Error al guardar costo: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

// ¡MODIFICADA! Ahora abre el modal
async function editarCosto(id) {
  try {
    const res = await fetch(`${window.API_URL}/costos/${id}`, { //
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const costo = await res.json();

    // Rellena el formulario
    formTitle.textContent = 'Editar Costo';
    costoIdInput.value = costo.id; // Guarda el ID en el campo oculto
    document.getElementById('loteSelect').value = costo.loteId;
    document.getElementById('categoria').value = costo.categoria;
    document.getElementById('descripcion').value = costo.descripcion;
    document.getElementById('monto').value = costo.monto;
    document.getElementById('fecha').value = costo.fecha.split('T')[0];

    openModal(); // ¡Abre el modal!

  } catch (error) {
    console.error('Error al cargar datos para editar:', error);
  }
}

// (eliminarCosto sigue igual)
async function eliminarCosto(id) {
  // ... (tu código no cambia) ...
}

// --- MODIFICADO: Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');

  if (currentUser && currentUser.role !== 'viewer') {
    openModalBtn.style.display = 'block'; // Muestra el botón de "Registrar"

    // Asigna los eventos del modal
    openModalBtn.addEventListener('click', () => {
      // Abre el modal para CREAR
      formTitle.textContent = 'Registrar Costo';
      costoIdInput.value = ''; // Asegura que no haya ID
      form.reset();
      openModal();
    });

    closeModalBtn.addEventListener('click', closeModal);

    // Cierra el modal si se hace clic en el fondo oscuro
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    form.onsubmit = guardarCosto; // Vincula el evento submit

  } else {
    openModalBtn.style.display = 'none'; // Oculta el botón
  }

  cargarLotesForSelect();
  cargarCostos();
});