// ecosystem.config.js

module.exports = {
  apps : [{
    name: "idea-design-backend", // Numele aplicației tale în PM2
    script: "server.js",        // <-- VERIFICĂ: Fișierul tău principal Express (poate fi și 'app.js' sau 'index.js')
    instances: 1,               // Numărul de instanțe ale aplicației (1 pentru început, mai multe pentru scalare)
    autorestart: true,
    watch: false,               // Setează la 'true' doar pentru dezvoltare, 'false' în producție
    max_memory_restart: '1G',   // Repornește dacă depășește 1GB RAM (poți ajusta)
    env: {
      NODE_ENV: "development",
      PORT: 3000 // Portul de dezvoltare
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000, // <-- ASIGURĂ-TE CĂ ACESTA ESTE PORTUL PE CARE ASCULTĂ EXPRESS INTERN!
      MONGODB_URI: process.env.MONGODB_URI, // <-- Variabila pentru stringul de conexiune MongoDB
      JWT_SECRET: process.env.JWT_SECRET    // <-- Variabila pentru secretul JWT
      // Adaugă aici orice alte variabile de mediu necesare în producție,
      // folosind formatul: NUME_VARIABILA: process.env.NUME_VARIABILA
    }
  }]
};