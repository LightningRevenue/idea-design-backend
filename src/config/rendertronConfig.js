// Configurație pentru serviciul Rendertron
const rendertronConfig = {
  // URL-ul serviciului Rendertron
  serviceUrl: process.env.RENDERTRON_URL || 'https://rendertron.idea-design.ro',
  
  // Timeout pentru cereri către Rendertron (în milisecunde)
  timeout: process.env.RENDERTRON_TIMEOUT || 10000,
  
  // Activează/dezactivează Rendertron
  enabled: process.env.RENDERTRON_ENABLED !== 'false',
  
  // Cache pentru rezultatele Rendertron (în secunde)
  cacheTimeout: process.env.RENDERTRON_CACHE_TIMEOUT || 3600, // 1 oră
  
  // User agents care sunt considerate crawleri
  crawlerUserAgents: [
    'googlebot',
    'bingbot',
    'yandexbot',
    'baiduspider',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest/0.',
    'developers.google.com/+/web/snippet',
    'slackbot',
    'vkshare',
    'w3c_validator',
    'redditbot',
    'applebot',
    'whatsapp',
    'flipboard',
    'tumblr',
    'bitlybot',
    'skypeuripreview',
    'nuzzel',
    'discordbot',
    'google page speed',
    'qwantify',
    'pinterestbot',
    'bitrix link preview',
    'xing-contenttabreceiver',
    'chrome-lighthouse',
    'telegrambot'
  ],
  
  // Rute care să fie excluse de la Rendertron
  excludedPaths: [
    '/api/',
    '/uploads/',
    '/admin/',
    '/_next/',
    '/static/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ],
  
  // Parametri query care să fie păstrați în URL-ul către Rendertron
  preserveQueryParams: true,
  
  // Headers care să fie forwarded către Rendertron
  forwardHeaders: [
    'Accept-Language',
    'User-Agent'
  ]
};

module.exports = rendertronConfig; 