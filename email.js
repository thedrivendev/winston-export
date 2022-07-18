const AWS = require('aws-sdk');
const { S3Client } = require('@aws-sdk/client-s3');
const getS3Object = require('./getS3Object');
const mimemessage = require('mimemessage');

const s3Client = new S3Client({ region: 'us-east-1' });
const SES = new AWS.SES();

module.exports = async event => {
  // Get file from S3
  const fileData = await getS3Object({
    s3Client,
    Bucket: 'farbankexport',
    Key: 'data.xlsx',
  });

  const fileBody = fileData.toString('base64');

  // Prepare email
  const mailContent = mimemessage.factory({
    contentType: 'multipart/mixed',
    body: [],
  });

  mailContent.header('From', 'thomas@getakamai.com');
  mailContent.header(
    'To',
    `${process.env.sage}, ${process.env.rio}, ${process.env.redington}, thomas@getakamai.com`
  );
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
      '</html>' +
      '' +
      '',
  });
  const plainEntity = mimemessage.factory({
    body: `Please see the attached file for current Farbank Inventory levels.
    `,
  });
  alternateEntity.body.push(plainEntity);
  alternateEntity.body.push(htmlEntity);

  mailContent.body.push(alternateEntity);

  // Set attachment
  const attachmentEntity = mimemessage.factory({
    contentType: 'text/plain',
    contentTransferEncoding: 'base64',
    body: fileBody,
  });
  attachmentEntity.header(
    'Content-Disposition',
    'attachment; filename="data.xlsx"'
  );
  mailContent.body.push(attachmentEntity);

  const mailData = mailContent.toString();

  const response = await SES.sendRawEmail({
    RawMessage: { Data: mailData },
  }).promise();
  console.log(response);

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
