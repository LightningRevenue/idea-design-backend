require('dotenv').config();

console.log('🔍 Testare variabile de mediu S3...\n');

console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Setat' : '❌ Nu este setat');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Setat' : '❌ Nu este setat');
console.log('AWS_REGION:', process.env.AWS_REGION || '❌ Nu este setat (default: eu-west-1)');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || '❌ Nu este setat');
console.log('CLOUDFRONT_DOMAIN:', process.env.CLOUDFRONT_DOMAIN || '❌ Nu este setat (opțional)');

console.log('\n📋 Valori actuale:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);

if (!process.env.S3_BUCKET_NAME) {
  console.log('\n❌ PROBLEMĂ: S3_BUCKET_NAME nu este setat!');
  console.log('Aceasta este cauza erorii "No value provided for input HTTP label: Bucket"');
} else {
  console.log('\n✅ Toate variabilele S3 necesare sunt setate');
} 