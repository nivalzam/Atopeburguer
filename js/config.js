/*
 * A Tope Burguer — datos del negocio y TODOS los enlaces externos.
 * Deja "" (o [] / {}) lo que aún no exista: la página lo oculta o lo marca
 * como "pronto". Nunca pongas aquí reseñas, platos ni precios inventados.
 */
window.ATOPE = {
  // Zona horaria del local (el semáforo de "abierto/cerrado" la usa).
  timezone: "America/Los_Angeles",

  links: {
    doordash: "",      // https://www.doordash.com/store/...
    ubereats: "",      // https://www.ubereats.com/store/...
    maps: "",          // Enlace "Cómo llegar". Vacío = se arma con `address`.
    mapEmbed: "",      // URL "Insertar mapa" de Google Maps. Vacío = se arma con `address`.
    googleReview: "",  // Enlace para dejar reseña en Google.
    instagram: "",
    facebook: "",
    tiktok: ""
  },

  address: "",         // "123 Main St, Los Angeles, CA 90001"
  phone: "",           // "+1 (555) 123-4567"

  /*
   * Horario por día: 0 = domingo … 6 = sábado. Omite el día (o pon null) si cierra.
   * Si cierra después de medianoche, la hora de cierre es menor: ["17:00", "01:00"].
   * Ejemplo:
   *   hours: { 1: ["16:00", "23:00"], 5: ["16:00", "01:00"], 6: ["14:00", "01:00"] }
   * Vacío = "Horario por confirmar".
   */
  hours: {},

  // Formulario de contacto: `endpoint` (p. ej. Formspree) tiene prioridad;
  // si no hay, se usa `email` con mailto:. Si ambos están vacíos, avisa que no está conectado.
  form: {
    endpoint: "",
    email: ""
  },

  // Menú destacado (máx. 6). Ejemplo:
  // { name: "La Tope", desc: { es: "Doble carne, queso…", en: "Double patty, cheese…" }, price: "$9.99" }
  menu: [],

  // SOLO reseñas reales, con su fuente. Ejemplo:
  // { text: "…", author: "María G.", source: "Google", url: "https://…" }
  reviews: []
};
