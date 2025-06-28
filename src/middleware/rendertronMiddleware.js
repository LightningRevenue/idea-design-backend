const rendertronConfig = require('../config/rendertronConfig');

// Funcție pentru detectarea crawlerilor
const isCrawler = (userAgent) => {
  if (!userAgent) return false;
  
  const agent = userAgent.toLowerCase();
  return rendertronConfig.crawlerUserAgents.some(crawler => agent.includes(crawler));
};

// Middleware pentru redirecționarea crawlerilor către Rendertron
const rendertronMiddleware = (req, res, next) => {
  // Verifică dacă Rendertron este activat
  if (!rendertronConfig.enabled) {
    return next();
  }
  
  const userAgent = req.get('User-Agent');
  
  // Verifică dacă calea este exclusă
  const isExcluded = rendertronConfig.excludedPaths.some(path => 
    req.path.startsWith(path)
  );
  
  if (isExcluded) {
    return next();
  }
  
  // Verifică dacă este crawler
  if (isCrawler(userAgent)) {
    // Construiește URL-ul pentru site-ul real (nu localhost)
    const realSiteUrl = `https://www.idea-design.ro${req.originalUrl}`;
    
    // URL-ul Rendertron cu pagina encodată
    const rendertronUrl = `${rendertronConfig.serviceUrl}/render/${encodeURIComponent(realSiteUrl)}`;
    
    console.log(`Crawler detectat: ${userAgent}`);
    console.log(`URL real site: ${realSiteUrl}`);
    console.log(`Redirecționare către: ${rendertronUrl}`);
    
    // Redirecționează către Rendertron
    return res.redirect(302, rendertronUrl);
  }
  
  // Pentru utilizatorii normali, continuă normal
  next();
};

module.exports = {
  rendertronMiddleware,
  isCrawler
}; 