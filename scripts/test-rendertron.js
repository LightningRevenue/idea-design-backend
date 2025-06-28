const axios = require('axios');

// Configurare pentru testare
const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';
const TEST_PATHS = [
  '/',
  '/produse',
  '/categorii',
  '/despre-noi',
  '/contact',
  '/profile-decorative-premium',
  '/profile-decorative-premium/plinta-decorativa-653109',
  '/vopsele-decorative',
  '/vopsele-decorative/vopsea-premium-123'
];

// User agents pentru testare
const TEST_USER_AGENTS = {
  normal: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  facebookbot: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  twitterbot: 'Twitterbot/1.0'
};

async function testUserAgent(path, userAgent, userAgentName) {
  try {
    console.log(`\n🧪 Testez ${userAgentName} pentru ${path}`);
    
    const response = await axios.get(`${BASE_URL}${path}`, {
      headers: {
        'User-Agent': userAgent
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      }
    });

    if (response.status === 302) {
      console.log(`✅ ${userAgentName}: Redirecționat către ${response.headers.location}`);
      
      // Verifică dacă redirecționarea este către Rendertron
      if (response.headers.location && response.headers.location.includes('rendertron.idea-design.ro')) {
        console.log(`✅ Redirecționare corectă către Rendertron!`);
      } else {
        console.log(`❌ Redirecționare incorectă: ${response.headers.location}`);
      }
    } else {
      console.log(`✅ ${userAgentName}: Răspuns normal (${response.status})`);
    }

  } catch (error) {
    if (error.response && error.response.status === 302) {
      console.log(`✅ ${userAgentName}: Redirecționat către ${error.response.headers.location}`);
      
      // Verifică dacă redirecționarea este către Rendertron
      if (error.response.headers.location && error.response.headers.location.includes('rendertron.idea-design.ro')) {
        console.log(`✅ Redirecționare corectă către Rendertron!`);
      } else {
        console.log(`❌ Redirecționare incorectă: ${error.response.headers.location}`);
      }
    } else {
      console.log(`❌ ${userAgentName}: Eroare ${error.message}`);
    }
  }
}

async function testRendertronMiddleware() {
  console.log('🚀 Începe testarea middleware-ului Rendertron...');
  console.log(`📍 URL de bază: ${BASE_URL}`);
  
  for (const path of TEST_PATHS) {
    console.log(`\n📄 Testez ruta: ${path}`);
    console.log('='.repeat(50));
    
    // Testează utilizator normal
    await testUserAgent(path, TEST_USER_AGENTS.normal, 'Utilizator normal');
    
    // Testează crawlerii
    await testUserAgent(path, TEST_USER_AGENTS.googlebot, 'Googlebot');
    await testUserAgent(path, TEST_USER_AGENTS.facebookbot, 'Facebook Bot');
    await testUserAgent(path, TEST_USER_AGENTS.twitterbot, 'Twitter Bot');
    
    // Pauză între teste
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Testarea completă!');
}

// Testează și rutele API (nu ar trebui să fie redirecționate)
async function testAPIRoutes() {
  console.log('\n🔧 Testez rutele API...');
  
  const apiRoutes = ['/api/products', '/api/categories', '/api/brands'];
  
  for (const route of apiRoutes) {
    try {
      const response = await axios.get(`${BASE_URL}${route}`, {
        headers: {
          'User-Agent': TEST_USER_AGENTS.googlebot
        },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept toate răspunsurile
        }
      });
      
      console.log(`✅ ${route}: Status ${response.status} (nu a fost redirecționat)`);
    } catch (error) {
      if (error.response && error.response.status === 302) {
        console.log(`❌ ${route}: A fost redirecționat incorect către ${error.response.headers.location}`);
      } else {
        console.log(`✅ ${route}: ${error.message} (comportament normal pentru API)`);
      }
    }
  }
}

// Rulează testele
async function runAllTests() {
  try {
    await testRendertronMiddleware();
    await testAPIRoutes();
  } catch (error) {
    console.error('❌ Eroare în timpul testării:', error.message);
  }
}

// Verifică dacă scriptul este rulat direct
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testRendertronMiddleware,
  testAPIRoutes,
  runAllTests
}; 