'use strict';

require('dotenv').config();
const axios = require('axios');
const https = require('https');
const woocommerce = axios.create({
  baseURL: 'https://winstonrods.com/wp-json/wc/v3',
  auth: {
    username: process.env.CONSUMER_KEY,
    password: process.env.CONSUMER_SECRET,
  },
  timeout: 120000,
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const sleep = async () =>
  // console.log('sleep ... started');
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 1000);
    // console.log('sleep ... completed');
  });

const wcGet = async endpoint => {
  const response = await woocommerce.get(endpoint).catch(error => {
    console.log(error);
    process.exit();
  });
  // await sleep();
  return response;
};

const wcPost = async (endpoint, data) => {
  const response = await woocommerce.post(endpoint, data).catch(error => {
    console.log(error);
    process.exit();
  });
  return response;
};

const wcPut = async (endpoint, data) => {
  const response = await woocommerce.put(endpoint, data).catch(error => {
    console.log(error);
    process.exit();
  });
  return response;
};

const wcDelete = async endpoint => {
  const response = await woocommerce.delete(endpoint).catch(error => {
    console.log(error);
    process.exit();
  });
  return response;
};

module.exports = { wcGet, wcPut, wcPost, wcDelete };
