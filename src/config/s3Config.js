const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// Asigură-te că dotenv este configurat
require('dotenv').config();

// Debug: Verifică variabilele de mediu
console.log('🔍 S3 Config Debug:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('CLOUDFRONT_DOMAIN:', process.env.CLOUDFRONT_DOMAIN);

// Configurația S3
const s3Config = {
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const s3Client = new S3Client(s3Config);

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN; // Optional pentru CDN

// Verifică dacă configurația S3 este completă
if (!BUCKET_NAME) {
  console.error('❌ EROARE: S3_BUCKET_NAME nu este setat în variabilele de mediu!');
  console.error('Vă rugăm să adăugați S3_BUCKET_NAME în fișierul .env');
}

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ EROARE: Credențialele AWS nu sunt setate în variabilele de mediu!');
  console.error('Vă rugăm să adăugați AWS_ACCESS_KEY_ID și AWS_SECRET_ACCESS_KEY în fișierul .env');
}

// Funcție pentru upload în S3
const uploadToS3 = async (fileBuffer, fileName, contentType, folder = '') => {
  try {
    // Verifică din nou dacă BUCKET_NAME este setat
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME nu este setat. Verificați fișierul .env');
    }

    const key = folder ? `${folder}/${fileName}` : fileName;
    
    console.log(`🚀 Încărcare în S3: ${key} în bucket-ul ${BUCKET_NAME}`);
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // Removed ACL since bucket doesn't allow ACLs
        // Public access should be configured at bucket level
      },
    });

    const result = await upload.done();
    
    // Returnează URL-ul public (fără CDN)
    const publicUrl = `https://${BUCKET_NAME}.s3.${s3Config.region}.amazonaws.com/${key}`;
    
    console.log(`✅ Upload reușit: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl,
      key: key,
      location: result.Location
    };
  } catch (error) {
    console.error('❌ Eroare la upload în S3:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Funcție pentru ștergerea din S3
const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('Eroare la ștergerea din S3:', error);
    return { success: false, error: error.message };
  }
};

// Funcție pentru verificarea existenței unui fișier în S3
const checkFileExistsInS3 = async (key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

// Funcție pentru generarea URL-ului public
const getPublicUrl = (key) => {
  return `https://${BUCKET_NAME}.s3.${s3Config.region}.amazonaws.com/${key}`;
};

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  checkFileExistsInS3,
  getPublicUrl,
  BUCKET_NAME,
  CLOUDFRONT_DOMAIN
}; 