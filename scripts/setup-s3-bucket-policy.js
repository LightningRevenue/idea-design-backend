const { S3Client, PutBucketPolicyCommand, PutPublicAccessBlockCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Politica pentru acces public la imagini
const bucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
    }
  ]
};

const setupBucketPolicy = async () => {
  try {
    console.log('🔧 Configurarea politicii bucket-ului S3...');
    
    // Dezactivează blocarea accesului public
    console.log('📖 Dezactivez blocarea accesului public...');
    const publicAccessBlockCommand = new PutPublicAccessBlockCommand({
      Bucket: BUCKET_NAME,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    });
    
    await s3Client.send(publicAccessBlockCommand);
    console.log('✅ Blocarea accesului public dezactivată');
    
    // Setează politica bucket-ului
    console.log('📝 Setez politica bucket-ului...');
    const policyCommand = new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy),
    });
    
    await s3Client.send(policyCommand);
    console.log('✅ Politica bucket-ului configurată cu succes');
    
    console.log('\n🎉 Configurarea S3 finalizată!');
    console.log(`📁 Bucket: ${BUCKET_NAME}`);
    console.log('🌐 Imaginile vor fi accesibile public');
    console.log('\n💡 Acum poți rula migrarea: npm run migrate-to-s3');
    
  } catch (error) {
    console.error('❌ Eroare la configurarea bucket-ului:', error.message);
    
    if (error.name === 'NoSuchBucket') {
      console.log('\n💡 Sugestii:');
      console.log('1. Verifică că bucket-ul există în AWS Console');
      console.log('2. Verifică că numele bucket-ului este corect în .env');
      console.log('3. Verifică că regiunea este corectă');
    } else if (error.name === 'AccessDenied') {
      console.log('\n💡 Sugestii:');
      console.log('1. Verifică că utilizatorul IAM are permisiuni pentru S3');
      console.log('2. Verifică că Access Key și Secret Key sunt corecte');
      console.log('3. Adaugă politica AmazonS3FullAccess utilizatorului IAM');
    }
  }
};

// Verifică configurația înainte de a rula
if (!BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ Configurația S3 este incompletă. Verifică variabilele de mediu:');
  console.error('- S3_BUCKET_NAME');
  console.error('- AWS_ACCESS_KEY_ID');
  console.error('- AWS_SECRET_ACCESS_KEY');
  console.error('- AWS_REGION (opțional, default: eu-west-1)');
  process.exit(1);
}

if (require.main === module) {
  setupBucketPolicy();
}

module.exports = { setupBucketPolicy }; 