const { GetObjectCommand } = require('@aws-sdk/client-s3');

module.exports = ({ s3Client, Bucket, Key }) =>
  new Promise(async (resolve, reject) => {
    const getObjectCommand = new GetObjectCommand({ Bucket, Key });

    try {
      const response = await s3Client.send(getObjectCommand);

      // Store all of data chunks returned from the response data stream
      // into an array then use Array#join() to use the returned contents as a String
      let responseDataChunks = [];

      // Handle an error while streaming the response body
      response.Body.once('error', err => reject(err));

      // Attach a 'data' listener to add the chunks of data to our array
      // Each chunk is a Buffer instance
      response.Body.on('data', chunk => responseDataChunks.push(chunk));

      // Once the stream has no more data, join the chunks into a single buffer and return buffer
      response.Body.once('end', () =>
        resolve(Buffer.concat(responseDataChunks))
      );
    } catch (err) {
      // Handle the error or throw
      return reject(err);
    }
  });
