// Asegúrate de que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
  // Función para guardar venta
  window.guardarVenta = function () {
    console.log('Intentando guardar venta...');
    try {
      // Obtener valores del formulario
      const cantidadVendida = document.getElementById('cantidadVendida')?.value;
      const precioUnitario = document.getElementById('precioUnitario')?.value;
      const fechaVenta = document.getElementById('fechaVenta')?.value;
      const loteId = document.getElementById('loteId')?.value;

      // Verificar que no sean null
      if (!cantidadVendida || !precioUnitario || !fechaVenta || !loteId) {
        throw new Error('Uno o más campos del formulario están vacíos o no encontrados');
      }

      // Convertir valores a los tipos adecuados
      const ventaData = {
        cantidadVendida: parseInt(cantidadVendida),
        precioUnitario: parseFloat(precioUnitario),
        fechaVenta: fechaVenta,
        loteId: loteId
      };

      // Enviar solicitud al backend
      fetch('https://granja-vincwill-backend.onrender.com/ventas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Asegúrate de tener un token si usas autenticación
        },
        body: JSON.stringify(ventaData)
      })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        console.log('Venta guardada:', data);
        cargarVentas(); // Recargar la tabla si tienes esta función
      })
      .catch(error => console.error('Error al guardar venta:', error));
    } catch (error) {
      console.error('Error al guardar venta:', error);
    }
  };

  // Asocia el evento al formulario (opcional, si usas un botón)
  const form = document.querySelector('#ventaForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarVenta();
    });
  }
});

// Función para cargar ventas (si ya la tienes)
async function cargarVentas() {
  try {
    const response = await fetch('https://granja-vincwill-backend.onrender.com/ventas', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const ventas = await response.json();
    const tbody = document.getElementById('ventas-body');
    tbody.innerHTML = '';
    ventas.forEach(venta => {
      tbody.innerHTML += `
        <tr>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.precioUnitario}</td>
          <td>${venta.fechaVenta}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error al cargar ventas:', error);
  }
}