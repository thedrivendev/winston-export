const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const mimemessage = require('mimemessage');

const s3Client = new S3Client({ region: 'us-east-1' });
const sesClient = new SESv2Client({ region: 'us-east-1' });

const getS3Object = ({ s3Client, Bucket, Key }) =>
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

      // Once the stream has no more data, join the chunks into a string and return the string
      response.Body.once('end', () =>
        // resolve(responseDataChunks.toString('base64'))
        resolve(Buffer.from(responseDataChunks))
      );
    } catch (err) {
      // Handle the error or throw
      return reject(err);
    }
  });

module.exports = async event => {
  // (async event => {
  // // Get file from S3
  // const file = await s3Client.send(
  //   new GetObjectCommand({
  //     Bucket: 'farbankexport',
  //     Key: 'inventory.xlsx',
  //   })
  // );

  // // Get file from S3
  // const fileData = await getS3Object({
  //   s3Client,
  //   Bucket: 'farbankexport',
  //   Key: 'inventory.xlsx',
  // });
  // // console.log('fileData');
  // // console.log(Object.keys(file));
  // // console.log(fileData);
  // console.log(typeof fileData);

  // const fileBody = fileData.toString('base64').replace(/([^\0]{76})/g, '$1\n');
  // console.log('typeof fileBody');
  // console.log(typeof fileBody);

  // Prepare email
  const mailContent = mimemessage.factory({
    contentType: 'multipart/mixed',
    body: [],
  });

  mailContent.header('From', 'thomas@getakamai.com');
  mailContent.header('To', process.env.recipient);
  mailContent.header('Subject', 'Farbank Inventory Export');

  const alternateEntity = mimemessage.factory({
    contentType: 'multipart/alternative',
    body: [],
  });

  const htmlEntity = mimemessage.factory({
    contentType: 'text/html;charset=utf-8',
    body:
      '<html>' +
      ' <head></head>' +
      ' <body>' +
      '   <h1>Farbank Inventory Export</h1>' +
      '   <p>Please see the attached file for current Farbank Inventory levels.</p>' +
      ' </body>' +
      '</html>',
  });
  const plainEntity = mimemessage.factory({
    body: 'Please see the attached file for current Farbank Inventory levels.',
  });
  alternateEntity.body.push(htmlEntity);
  alternateEntity.body.push(plainEntity);

  mailContent.body.push(alternateEntity);

  const mailData = mailContent.toString();
  console.log(mailData);
  // return;
  // const attachmentEntity = mimemessage.factory({
  //   contentType: 'text/plain',
  //   contentTransferEncoding: 'base64',
  //   body: fileBody,
  // });
  // attachmentEntity.header(
  //   'Content-Disposition',
  //   'attachment; filename="inventory.xlsx"'
  // );
  // mailContent.body.push(attachmentEntity);

  // Send email
  const sendEmailResponse = await sesClient
    .send(
      new SendEmailCommand({
        Content: {
          Raw: {
            Data: Buffer.from(Data).toString('base64'),
          },
        },
      })
    )
    .catch(error => console.log(error));

  console.log(sendEmailResponse.$metadata);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Farbank Inventory Export Emailed',
      },
      null,
      2
    ),
  };
};
// })();
