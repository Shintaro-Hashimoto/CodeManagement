const AWS = require("aws-sdk");
const { setTimeout } = require('timers/promises');
const region = 'ap-northeast-1';
const bucketName = 'voice-mail-wav-file';

exports.handler = async (event) => {
    console.log(JSON.stringify(event));

    const s3 = new S3(AWS, region);
    await setTimeout(30000);

    for (let record of event.Records) {
        const getKey = record.s3.object.key;
    
        var fileName = getKey;

        // S3から録音データに関する情報を取得
        const data = await s3.get(record.s3.bucket.name, getKey);
        const info = JSON.parse(data.Body);
        const streamName = info.streamARN.split('stream/')[1].split('/')[0];
        const fragmentNumber =  info.startFragmentNumber;

        // Kinesis Video Streamsから当該RAWデータの取得
        const raw = await getMedia(streamName, fragmentNumber);

        // RAWデータからWAVファイルを作成
        const wav = Converter.createWav(raw, 8000);

        // WAVファイルをS3に保存する
        let tagging = ''; // 付加情報をタグに追加する
        tagging += "customerEndpoint=" + info.customerEndpoint + '&';
        tagging += "systemEndpoint=" + info.systemEndpoint + '&';
        tagging += "startTimestamp=" + info.startTimestamp;
        await s3.put(bucketName, fileName + '.wav', Buffer.from(wav.buffer), tagging)

    }
    return {};
};

class S3 {
    constructor(AWS, region){
        this._s3 = new AWS.S3({region:region});
    }
    async get(bucketName, key){
        const params = {
            Bucket: bucketName,
            Key: key
        };
        return await this._s3.getObject(params).promise();
    }

    async put(bucketName, key, body, tagging) {
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: body,
            Tagging: tagging
        };
        return  await this._s3.putObject(params).promise();
    }

}

const ebml = require('ebml');

async function getMedia(streamName, fragmentNumber) {
    // Endpointの取得
    const kinesisvideo = new AWS.KinesisVideo({region: region});
    var params = {
        APIName: "GET_MEDIA",
        StreamName: streamName
    };
    const end = await kinesisvideo.getDataEndpoint(params).promise();

    // RAWデータの取得
    const kinesisvideomedia = new AWS.KinesisVideoMedia({endpoint: end.DataEndpoint, region:region});
    var params = {
        StartSelector: { 
            StartSelectorType: "FRAGMENT_NUMBER",
            AfterFragmentNumber:fragmentNumber,
        },
        StreamName: streamName
    };
    const data = await kinesisvideomedia.getMedia(params).promise();
    const decoder = new ebml.Decoder();
    let chunks = [];
    decoder.on('data', chunk => {
        if(chunk[1].name == 'SimpleBlock'){
            chunks.push(chunk[1].data);
        }
    });
    decoder.write(data["Payload"]);

    // chunksの結合
    const margin = 4; // 各chunkの先頭4バイトを破棄する
    var sumLength = 0;
    chunks.forEach( chunk => {
        sumLength += chunk.byteLength - margin;
    })
    var sample = new Uint8Array(sumLength);
    var pos = 0;
    chunks.forEach(chunk => {
        let tmp = new Uint8Array(chunk.byteLength - margin);
        for(var e = 0; e < chunk.byteLength -  margin; e++){
            tmp[e] = chunk[e + margin];
        }
        sample.set(tmp, pos);
        pos += chunk.byteLength - margin;

    })
    return sample.buffer;
}

class Converter {
    // WAVファイルの生成
    static createWav(samples, sampleRate) {
        const len = samples.byteLength;
        const view = new DataView(new ArrayBuffer(44 + len));
        this._writeString(view, 0, 'RIFF');
        view.setUint32(4, 32 + len, true);
        this._writeString(view, 8, 'WAVE');
        this._writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // リニアPCM
        view.setUint16(22, 1, true); // モノラル
        view.setUint32(24, sampleRate, true); 
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        this._writeString(view, 36, 'data');
        view.setUint32(40, len, true);
        let offset = 44;
        const srcView = new DataView(samples);
        for (var i = 0; i < len; i+=4, offset+=4) {
            view.setInt32(offset, srcView.getUint32(i));
        }
        return view;
    }

    static _writeString(view, offset, string) {
        for (var i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}