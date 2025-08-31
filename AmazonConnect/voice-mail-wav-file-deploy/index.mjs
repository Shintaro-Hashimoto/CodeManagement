import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { KinesisVideoClient, GetDataEndpointCommand } from "@aws-sdk/client-kinesis-video";
import { KinesisVideoMediaClient, GetMediaCommand } from "@aws-sdk/client-kinesis-video-media";
import { Decoder } from 'ebml';
import { setTimeout } from 'timers/promises';

const region = 'ap-northeast-1';
const outputBucketName = 'voice-mail-wav-file';

// AWS SDK v3クライアントの初期化
const s3Client = new S3Client({ region });
const kinesisVideoClient = new KinesisVideoClient({ region });

/**
 * ReadableStreamをBufferに変換するヘルパー関数
 */
const streamToBuffer = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
});

/**
 * Kinesis Video Streamsからメディアを取得し、生のオーディオバッファを返す
 */
async function getMedia(streamName, fragmentNumber) {
    // 1. データ取得用のエンドポイントを取得
    const endpointResponse = await kinesisVideoClient.send(new GetDataEndpointCommand({
        APIName: "GET_MEDIA",
        StreamName: streamName
    }));
    const dataEndpoint = endpointResponse.DataEndpoint;

    // 2. 取得したエンドポイントを使ってメディアクライアントを初期化
    const kinesisVideoMediaClient = new KinesisVideoMediaClient({ region, endpoint: dataEndpoint });

    // 3. メディアストリームを取得
    const mediaResponse = await kinesisVideoMediaClient.send(new GetMediaCommand({
        StreamName: streamName,
        StartSelector: {
            StartSelectorType: "FRAGMENT_NUMBER",
            AfterFragmentNumber: fragmentNumber,
        }
    }));

    const mediaPayload = await streamToBuffer(mediaResponse.Payload);
    
    // 4. EBMLデコーダーを使ってオーディオチャンクを抽出
    return new Promise((resolve, reject) => {
        const decoder = new Decoder();
        const audioChunks = [];

        decoder.on('data', chunk => {
            if (chunk[0] === 'tag' && chunk[1].name === 'SimpleBlock') {
                // 先頭4バイトのメタデータを除いたオーディオデータを取得
                audioChunks.push(chunk[1].data.subarray(4));
            }
        });
        decoder.on('finish', () => {
            resolve(Buffer.concat(audioChunks));
        });
        decoder.on('error', reject);

        decoder.write(mediaPayload);
        decoder.end();
    });
}

/**
 * オーディオバッファからWAVファイルヘッダを付与してWAVデータを作成
 */
function createWav(samples, sampleRate) {
    const dataLength = samples.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);      // PCMヘッダ
    view.setUint16(20, 1, true);       // リニアPCM
    view.setUint16(22, 1, true);       // モノラル
    view.setUint32(24, sampleRate, true); // サンプリングレート
    view.setUint32(28, sampleRate * 2, true); // データ速度 (Byte/sec)
    view.setUint16(32, 2, true);       // ブロックサイズ
    view.setUint16(34, 16, true);      // サンプルあたりのビット数
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // オーディオデータをコピー
    new Uint8Array(buffer, 44).set(new Uint8Array(samples));

    return Buffer.from(buffer);
}


export const handler = async (event) => {
    console.log("Event Received:", JSON.stringify(event, null, 2));
    
    // レースコンディションを避けるための待機（必要に応じて調整または削除）
    await setTimeout(30000); 

    for (const record of event.Records) {
        const sourceBucket = record.s3.bucket.name;
        const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        try {
            // 1. S3からストリーム情報を取得
            const getObjectResponse = await s3Client.send(new GetObjectCommand({
                Bucket: sourceBucket,
                Key: sourceKey
            }));
            const streamInfoStr = await streamToBuffer(getObjectResponse.Body);
            const streamInfo = JSON.parse(streamInfoStr);

            const streamName = streamInfo.streamARN.split('/')[1];
            const fragmentNumber = streamInfo.startFragmentNumber;

            // 2. Kinesis Video Streamsからオーディオデータを取得
            const rawAudioBuffer = await getMedia(streamName, fragmentNumber);

            // 3. WAVファイルを作成
            const wavBuffer = createWav(rawAudioBuffer, 8000);

            // 4. S3に保存するためのタグを準備
            const tags = new URLSearchParams({
                customerEndpoint: streamInfo.customerEndpoint,
                systemEndpoint: streamInfo.systemEndpoint,
                startTimestamp: streamInfo.startTimestamp,
            }).toString();

            // 5. WAVファイルをS3に保存
            const outputKey = `${sourceKey}.wav`;
            await s3Client.send(new PutObjectCommand({
                Bucket: outputBucketName,
                Key: outputKey,
                Body: wavBuffer,
                Tagging: tags,
                ContentType: 'audio/wav',
            }));

            console.log(`Successfully converted and saved to s3://${outputBucketName}/${outputKey}`);

        } catch (error) {
            console.error(`Failed to process record ${sourceKey}:`, error);
            // 1つのレコードでエラーが発生しても、他のレコードの処理を続ける
        }
    }
    return { statusCode: 200, body: 'Processing complete.' };
};
