import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = 'ap-northeast-1';
const bucketName = 'voice-mail-stream-information';

const s3Client = new S3Client({ region });

/**
 * Creates a formatted key name based on the current date and time.
 * e.g., YYYY_MM_DD_HH_MI_SS
 */
function createKeyName() {
    const date = new Date();
    const pad = (n) => ('0' + n).slice(-2);
    
    const year = date.getFullYear();
    const mon = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const min = pad(date.getMinutes());
    const sec = pad(date.getSeconds());

    return `${year}_${mon}_${day}_${hour}_${min}_${sec}`;
}

export const handler = async (event) => {
    console.log("Event Received:", JSON.stringify(event, null, 2));

    let streamInformation = {};
    const contactData = event.Details.ContactData;

    streamInformation.contactId = contactData.ContactId;
    streamInformation.customerEndpoint = contactData.CustomerEndpoint.Address;
    streamInformation.systemEndpoint = contactData.SystemEndpoint.Address;

    const audio = contactData.MediaStreams.Customer.Audio;
    streamInformation.startFragmentNumber = audio.StartFragmentNumber;
    streamInformation.startTimestamp = audio.StartTimestamp;
    streamInformation.stopFragmentNumber = audio.StopFragmentNumber;
    streamInformation.stopTimestamp = audio.StopTimestamp;
    streamInformation.streamARN = audio.StreamARN;

    const key = createKeyName();
    const body = JSON.stringify(streamInformation, null, 2);

    const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: 'application/json'
    });

    try {
        await s3Client.send(putCommand);
        console.log(`Successfully saved stream info to s3://${bucketName}/${key}`);
        return {};
    } catch (error) {
        console.error("Error saving to S3:", error);
        // エラーが発生してもConnectフローを停止させない
        return {};
    }
};