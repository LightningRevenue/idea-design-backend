const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pentru protejarea rutelor private
const protect = async (req, res, next) => {
  let token;

  console.log('Auth Headers:', req.headers.authorization);

  // Verificăm dacă avem token în header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Luăm token-ul din header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token primit:', token ? token.substring(0, 15) + '...' : 'null');

      // Verificăm token-ul
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decodat:', decoded);

      // Căutăm utilizatorul în baza de date (fără a include parola)
      req.user = await User.findById(decoded.id).select('-password');
      console.log('Utilizator găsit:', req.user ? `${req.user._id} (isAdmin: ${req.user.isAdmin})` : 'null');

      if (!req.user) {
        console.log('Utilizatorul nu a fost găsit în baza de date');
        return res.status(401).json({ success: false, message: 'Utilizatorul nu a fost găsit' });
      }

      next();
    } catch (error) {
      console.error('Eroare în middleware auth:', error);
      return res.status(401).json({ success: false, message: 'Neautorizat, token invalid', error: error.message });
    }
  } else {
    console.log('Nu s-a furnizat niciun token');
    return res.status(401).json({ success: false, message: 'Neautorizat, token lipsă' });
  }
};

// Middleware pentru verificarea dacă utilizatorul este admin
const admin = (req, res, next) => {
  console.log('Verificare admin pentru utilizatorul:', req.user ? req.user._id : 'null');
  console.log('isAdmin flag:', req.user ? req.user.isAdmin : 'null');
  
  if (req.user && req.user.isAdmin === true) {
    console.log('Utilizator admin confirmat, acces permis');
    next();
  } else {
    console.log('Acces refuzat - utilizatorul nu este admin');
    return res.status(403).json({ success: false, message: 'Acces refuzat, permisiune de admin necesară' });
  }
};

module.exports = { protect, admin }; 