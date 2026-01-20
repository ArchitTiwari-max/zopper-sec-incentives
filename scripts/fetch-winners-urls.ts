import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = 'vishal-zopper';
const S3_FOLDER = 'media/Pitchsultan_winners';
const CLOUDFRONT_DOMAIN = 'd2f4sgw13r1zfn.cloudfront.net';

async function fetchAllUrls() {
  try {
    console.log(`📁 Fetching all files from S3: ${S3_FOLDER}\n`);

    const results: { filename: string; url: string }[] = [];
    let continuationToken: string | undefined;
    let fileCount = 0;

    // Paginate through all objects
    do {
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: `${S3_FOLDER}/`,
          ContinuationToken: continuationToken
        })
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Key !== `${S3_FOLDER}/`) {
            const filename = obj.Key.split('/').pop() || '';
            const url = `https://${CLOUDFRONT_DOMAIN}/${obj.Key}`;
            results.push({ filename, url });
            fileCount++;
            console.log(`✅ ${filename}`);
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    // Save to JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `exports/winners-urls-${timestamp}.json`;
    
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    console.log(`\n📄 Results saved to: ${outputFile}`);
    console.log(`\n📊 SUMMARY`);
    console.log(`${'='.repeat(50)}`);
    console.log(`✅ Total files: ${fileCount}`);
    console.log(`${'='.repeat(50)}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

fetchAllUrls()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
