const axios = require('axios');

// Configurare
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const USER_AGENTS = {
  normal: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  facebookbot: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  twitterbot: 'Twitterbot/1.0'
};

async function testCustomUrl(customPath) {
  const testUrl = global.BASE_URL || BASE_URL;
  console.log(`\n🧪 Testez URL-ul: ${testUrl}${customPath}`);
  console.log('='.repeat(60));
  
  for (const [botName, userAgent] of Object.entries(USER_AGENTS)) {
    try {
      console.log(`\n📱 ${botName.toUpperCase()}:`);
      
      const response = await axios.get(`${testUrl}${customPath}`, {
        headers: {
          'User-Agent': userAgent
        },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });

      if (response.status === 302) {
        console.log(`   ↗️  Redirecționat către: ${response.headers.location}`);
        
        if (response.headers.location && response.headers.location.includes('rendertron.idea-design.ro')) {
          console.log(`   ✅ Redirecționare către Rendertron!`);
        } else {
          console.log(`   ➡️  Redirecționare către frontend React`);
        }
      } else {
        console.log(`   ✅ Răspuns direct (${response.status})`);
      }

    } catch (error) {
      if (error.response && error.response.status === 302) {
        console.log(`   ↗️  Redirecționat către: ${error.response.headers.location}`);
        
        if (error.response.headers.location && error.response.headers.location.includes('rendertron.idea-design.ro')) {
          console.log(`   ✅ Redirecționare către Rendertron!`);
        } else {
          console.log(`   ➡️  Redirecționare către frontend React`);
        }
      } else {
        console.log(`   ❌ Eroare: ${error.message}`);
      }
    }
  }
}

// Funcție principală
async function main() {
  const customPath = process.argv[2];
  const customPort = process.argv[3];
  
  if (!customPath) {
    console.log('❌ Te rog să specifici un path pentru testare!');
    console.log('\n📖 Exemple de utilizare:');
    console.log('   node scripts/test-custom-url.js /produs/vopsea-decorativa');
    console.log('   node scripts/test-custom-url.js /categorie/vopsele 3000');
    console.log('   node scripts/test-custom-url.js /despre-noi 3000');
    console.log('   node scripts/test-custom-url.js /contact');
    console.log('\n💡 Dacă backend-ul rulează pe alt port decât 3000, specifică-l ca al doilea parametru.');
    process.exit(1);
  }
  
  // Actualizează BASE_URL dacă este specificat un port custom
  if (customPort) {
    global.BASE_URL = `http://localhost:${customPort}`;
    console.log(`🔧 Folosesc portul custom: ${customPort}`);
  }
  
  console.log('🚀 Testare URL custom pentru Rendertron');
  console.log(`🌐 Backend URL: ${customPort ? `http://localhost:${customPort}` : BASE_URL}`);
  await testCustomUrl(customPath);
  console.log('\n✅ Testare completă!');
}

// Rulează scriptul dacă este apelat direct
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCustomUrl }; 