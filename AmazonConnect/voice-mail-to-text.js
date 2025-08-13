const AWS = require('aws-sdk');
const transcribeservice = new AWS.TranscribeService({apiVersion: '2017-10-26'});
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB();

exports.handler = async (event, context) => {
 if(event.Records && event.Records[0] && event.Records[0].s3.bucket){
     const base_bucket = event.Records[0].s3.bucket.name;
     const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
     const FilePath = "https://s3-ap-northeast-1.amazonaws.com/" + base_bucket + '/' + key;
     const FileType = key.split(".")[1];
     const jobName = context.awsRequestId;
     
     const tagging = await s3.getObjectTagging({Bucket: base_bucket, Key: key }).promise();
     const phoneNumber = tagging.TagSet.find((v => { return v.Key == "customerEndpoint"}))["Value"];
     let res = await savePhoneNumber(jobName,phoneNumber);
    
     console.log('FilePath : ' + FilePath);
     console.log(res);

     const params = {
        LanguageCode: "ja-JP",                 
        Media: {                        
          MediaFileUri: FilePath
        },
        TranscriptionJobName: jobName,
        MediaFormat: FileType,
        OutputBucketName: 'voice-mail-to-text'
      };
    try{
        const response = await transcribeservice.startTranscriptionJob(params).promise();
        console.log(response);
        return response;
    }catch(error){
        console.log(error);
    }
  }
};

const region = 'ap-northeast-1';
const tableName = 'connect-voice-mail';

// 電話番号の保存
async function savePhoneNumber(jobName, phoneNumber) {
    let item = {
        JobID:{S:jobName},
        PhoneNumber:{S:phoneNumber}
    }
    let prm = {
        "TableName":tableName,
        "Item":item
    };
    return new Promise((resolve, reject) => {
        let params = prm;
        dynamo.putItem(params,function(err, data) {
            if (err) {
                reject(err, err);
            } else {
                resolve("updated");
            }
        });
    });
}