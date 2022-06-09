const chromium = require('chrome-aws-lambda');
const fs = require('fs').promises;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' });

module.exports.export = async event => {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  const [page] = await browser.pages();
  await page.setViewport({ width: 1280, height: 800 });

  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    // downloadPath: './downloads',
    downloadPath: '/tmp/',
  });

  // Authenticate
  await page.goto('https://orders.farbank.com');
  await page.type('#Input_UserName', process.env.username);
  await page.type('#Input_Password', process.env.password);
  await page.click('button.btn-success');
  await page.waitForTimeout(500);
  // await page.waitForNetworkIdle();

  const downloadUrl = 'https://orders.farbank.com/InventoryExport';

  await page
    .goto(downloadUrl, { waitUntil: 'networkidle0' })
    .catch(error => console.log(error));

  await page.waitForTimeout(500);
  browser.close();

  // const files = await fs.readdir('downloads/');
  const files = await fs.readdir('/tmp/');
  const file = files.find(file => file.includes('Inventory_'));
  const fileData = await fs.readFile(`/tmp/${file}`);

  const timestamp = new Date(Date.now()).toISOString().replace(/:/g, '-');

  try {
    const results = await s3Client.send(
      new PutObjectCommand({
        Bucket: 'farbankexport', // The name of the bucket. For example, 'sample_bucket_101'.
        Key: `inventory.xlsx`, // The name of the object. For example, 'sample_upload.txt'.
        Body: fileData, // The content of the object. For example, 'Hello world!".
        ACL: 'public-read',
      })
    );
    console.log(`Write file to S3: ${results['$metadata'].httpStatusCode}`);
  } catch (err) {
    console.log('Error', err);
  }

  // await fs.rm(`/tmp/${file}`);
  // console.log(`File ${file} removed.`);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Farbank EOS Inventory Export Completed',
        input: event,
      },
      null,
      2
    ),
  };
};
