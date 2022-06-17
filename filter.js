const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' });
const getS3Object = require('./getS3Object');
const XLSX = require('xlsx');

module.exports = async event => {
  // Get inventory & pricelist data from S3
  const [inventoryFile, pricelistFile] = await Promise.all([
    getS3Object({
      s3Client,
      Bucket: 'farbankexport',
      Key: 'inventory.xlsx',
    }),
    getS3Object({
      s3Client,
      Bucket: 'farbankexport',
      Key: 'pricelist.json',
    }),
  ]);

  const inventoryWB = XLSX.read(inventoryFile.toString('base64'), {
    type: 'base64',
  });
  const inventory = XLSX.utils.sheet_to_json(
    inventoryWB.Sheets[inventoryWB.SheetNames[0]]
  );
  const pricelist = JSON.parse(pricelistFile);

  // Filter inventory to items with MSRP & margin > 15
  const filteredInventory = inventory
    .map(invLine => {
      const priceLine = pricelist.find(
        priceLine => priceLine.SKU === invLine.SKU
      );
      // return undefined for items without MSRP
      if (!priceLine || !priceLine['2022 MSRP ']) {
        return;
      }
      // Merge pricelist data with inventory data
      return {
        ...invLine,
        '2022 MSRP ': priceLine['2022 MSRP '],
        '22 PLATINNUM': priceLine['22 PLATINNUM'],
      };
    })
    .filter(Boolean)
    // filter out items missing MSRP
    // fitler to items with margin >= 15
    .filter(invLine => {
      if (!invLine['SKU']) {
        return false;
      }
      const priceLine = pricelist.find(
        priceLine => priceLine.SKU === invLine.SKU
      );
      if (!priceLine || !priceLine['2022 MSRP ']) {
        return false;
      }
      const margin = priceLine['2022 MSRP '] - priceLine['22 PLATINNUM'];
      return margin >= 15;
    })
    .filter(Boolean);
  console.log(filteredInventory[filteredInventory.length - 1]);

  inventoryWB.Sheets[inventoryWB.SheetNames[0]] =
    XLSX.utils.json_to_sheet(filteredInventory);

  // XLSX.writeFile(inventoryWB, 'data.xlsx');
  // return;

  const filteredInventoryFile = XLSX.write(inventoryWB, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  // const writeRequest = await uploadS3Object({
  //   s3Client,
  //   Bucket: 'farbankexport',
  //   Key: 'data.xlsx',
  //   Body: filteredInventoryFile,
  // });
  const writeRequest = await s3Client.send(
    new PutObjectCommand({
      Bucket: 'farbankexport',
      Key: 'data.xlsx',
      Body: filteredInventoryFile,
    })
  );

  if (writeRequest['$metadata'].httpStatusCode === 200) {
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: 'Farbank Inventory Export Filter & Export Completed',
        },
        null,
        2
      ),
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          message: 'Farbank Inventory Export Filter & Export Failed',
          error: writeRequest,
        },
        null,
        2
      ),
    };
  }
};
