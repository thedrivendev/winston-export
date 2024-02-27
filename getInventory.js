const { wcGet } = require('./integrations/woocommerce');
const XLSX = require('xlsx');

const getInventoryData = async () => {
  let inventoryData = [];
  const { data: products } = await wcGet(`products?per_page=100&status=publish&page=1&category=210,33`);
  console.log(products.length);
  // console.log(products);
  // console.log(products.map(product => product.name));
  // process.exit();

  for (const product of products.filter(product => !product.name.includes('Sale') && !product.name.includes('Seconds'))) {
    const { data: productVariations } = await wcGet(`products/${product.id}/variations?per_page=100`);
    console.log(productVariations[0]);
    for (const productVariation of productVariations) {
      const { sku, stock_quantity: quantity } = productVariation;
      const title = product.name + ' ' + productVariation?.attributes.map(attribute => attribute?.option).join(' ');
      inventoryData = [...inventoryData, { sku, title, quantity }];
    }
    console.log(inventoryData);
  }
  process.exit();
};

(async () => {
  const inventoryData = await getInventoryData();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
})();
