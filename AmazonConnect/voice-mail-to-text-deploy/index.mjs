import { S3Client, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const region = 'ap-northeast-1';
const tableName = 'connect-voice-mail';
const outputBucketName = 'voice-mail-to-text';

// AWS SDK v3 クライアントを初期化
const s3Client = new S3Client({ region });
const transcribeClient = new TranscribeClient({ region });

// DynamoDB DocumentClientを初期化（データ操作が容易になる）
const dbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dbClient);

export const handler = async (event, context) => {
    console.log("Event Received:", JSON.stringify(event, null, 2));

    const record = event.Records[0];
    const sourceBucket = record.s3.bucket.name;
    const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    // S3 URIとファイル形式を構築
    const mediaFileUri = `s3://${sourceBucket}/${sourceKey}`;
    const mediaFormat = sourceKey.split('.').pop();
    const jobName = context.awsRequestId; // 各実行に一意なジョブ名

    try {
        // 1. S3オブジェクトのタグから電話番号などの情報を取得
        const taggingCmd = new GetObjectTaggingCommand({ Bucket: sourceBucket, Key: sourceKey });
        const taggingResponse = await s3Client.send(taggingCmd);
        const tags = Object.fromEntries(taggingResponse.TagSet.map(tag => [tag.Key, tag.Value]));

        const phoneNumber = tags.customerEndpoint;
        const startTimestamp = tags.startTimestamp;

        if (!phoneNumber || !startTimestamp) {
            throw new Error("Required tags 'customerEndpoint' or 'startTimestamp' not found.");
        }

        // 2. DynamoDBにジョブ情報を保存
        const item = {
            JobID: jobName,
            PhoneNumber: phoneNumber,
            Timestamp: startTimestamp
        };
        const dbPutCmd = new PutCommand({ TableName: tableName, Item: item });
        await docClient.send(dbPutCmd);
        console.log(`Successfully saved job info to DynamoDB for JobID: ${jobName}`);

        // 3. Amazon Transcribeで文字起こしジョブを開始
        const transcribeParams = {
            LanguageCode: "ja-JP",
            Media: {
                MediaFileUri: mediaFileUri
            },
            TranscriptionJobName: jobName,
            MediaFormat: mediaFormat,
            OutputBucketName: outputBucketName
        };
        const transcribeCmd = new StartTranscriptionJobCommand(transcribeParams);
        const transcribeResponse = await transcribeClient.send(transcribeCmd);
        console.log("Successfully started transcription job:", transcribeResponse.TranscriptionJob.TranscriptionJobName);

        return { statusCode: 200, body: 'Transcription job started.' };

    } catch (error) {
        console.error("An error occurred:", error);
        throw error; // エラーを再スローしてLambdaの実行を失敗させる
    }
};