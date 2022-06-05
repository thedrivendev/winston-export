const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' });

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    // ignoreHTTPSErrors: true,
  });

  const [page] = await browser.pages();
  await page.setViewport({ width: 1280, height: 800 });

  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: './downloads',
  });

  // Authenticate
  await page.goto('https://orders.farbank.com');
  await page.type('#Input_UserName', 'tony@tcoflyfishing.com');
  await page.type('#Input_Password', 'tcoflyfish126');
  await page.click('button.btn-success');
  await page.waitForNetworkIdle();

  const downloadUrl = 'https://orders.farbank.com/InventoryExport';

  await page
    .goto(downloadUrl, { waitUntil: 'networkidle0' })
    .catch(error => console.log(error));

  await page.waitForTimeout(2500);
  browser.close();

  const files = await fs.readdir('downloads/');
  const file = files.find(file => file.includes('Inventory_'));
  const fileData = await fs.readFile(`./downloads/${file}`);

  const timestamp = new Date(Date.now()).toISOString().replaceAll(':', '-');

  try {
    const results = await s3Client.send(
      new PutObjectCommand({
        Bucket: 'farbankeos', // The name of the bucket. For example, 'sample_bucket_101'.
        Key: `inventory-${timestamp}.xlsx`, // The name of the object. For example, 'sample_upload.txt'.
        Body: fileData, // The content of the object. For example, 'Hello world!".
        ACL: 'public-read',
      })
    );
    console.log(`Write file to S3: ${results['$metadata'].httpStatusCode}`);
  } catch (err) {
    console.log('Error', err);
  }

  await fs.rm(`./downloads/${file}`);
  console.log(`File ${file} removed.`);
})();
