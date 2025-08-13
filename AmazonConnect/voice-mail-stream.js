const AWS = require("aws-sdk");
const region = 'ap-northeast-1';
const bucketName = 'voice-mail-stream-information';

exports.handler = async (event) => {
    console.log(JSON.stringify(event));
    
    // リクエストから必要データを取得する
    let streamInformation = {};
    
    const contactData = event.Details.ContactData;
    streamInformation.contactId = contactData.ContactId; // コンタクトID
    streamInformation.customerEndpoint = contactData.CustomerEndpoint.Address; // 発信者番号
    streamInformation.systemEndpoint = contactData.SystemEndpoint.Address; // 着信番号

    const audio = contactData.MediaStreams.Customer.Audio;
    streamInformation.startFragmentNumber = audio.StartFragmentNumber; // 録音データの開始フラグメント番号
    streamInformation.startTimestamp = audio.StartTimestamp; // 録音データの開始時間
    streamInformation.stopFragmentNumber = audio.StopFragmentNumber;// 録音データの終了フラグメント番号
    streamInformation.stopTimestamp = audio.StopTimestamp;// 録音データの終了時間
    streamInformation.streamARN = audio.StreamARN; // ストリームのARN
    
    // S3に日付文字列をキーといして保存する
    const s3 = new AWS.S3({region:region});

    const key = createKeyName();
    const body = JSON.stringify(streamInformation);
    const params = {
        Bucket: bucketName,
        Key: key,
        Body: body
    };
    await s3.putObject(params).promise();
    return {};
};


function createKeyName() {

    const date = new Date();    
    const year = date.getFullYear();
    const mon = (date.getMonth() + 1);
    const day = date.getDate();
    const hour = date.getHours();
    const min = date.getMinutes();
    const sec = date.getSeconds();

    const space = (n) => {
        return ('0' + (n)).slice(-2)
    }
    
    let result = year + '_';
    result += space(mon) + '_';
    result += space(day) + '_';
    result += space(hour) + '_';
    result += space(min) + '_';
    result += space(sec);
    return result;
}