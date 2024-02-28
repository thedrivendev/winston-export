const { wcGet } = require('./integrations/woocommerce');
const XLSX = require('xlsx');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' });

const getInventoryData = async () => {
  let inventoryData = [];
  const { data: products } = await wcGet(`products?per_page=100&status=publish&page=1&category=210,33`);

  const filteredProducts = products.filter(product => !product.name.includes('Sale') && !product.name.includes('Seconds'));

  let counter = 0;
  const total = filteredProducts.length;
  for (const product of filteredProducts) {
    console.log(`Processing ${++counter}/${total}: ${product.name}`);
    const { data: productVariations } = await wcGet(`products/${product.id}/variations?per_page=100`);

    for (const productVariation of productVariations) {
      const { sku, stock_quantity: quantity } = productVariation;
      const title = product.name + ' ' + productVariation?.attributes.map(attribute => attribute?.option).join(' ');
      inventoryData = [...inventoryData, { sku, title, quantity }];
    }
  }
  console.log(inventoryData);
  return inventoryData;
};

module.exports = async event => {
  const inventoryData = await getInventoryData();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  const fileData = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  try {
    const results = await s3Client.send(
      new PutObjectCommand({
        Bucket: 'winstonexport', // The name of the bucket. For example, 'sample_bucket_101'.
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
        message: 'Winston Inventory Export Completed',
        input: event,
      },
      null,
      2
    ),
  };
};
