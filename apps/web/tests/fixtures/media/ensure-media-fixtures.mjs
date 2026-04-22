/**
 * @fileoverview آلية التجهيز الرسمية لملحقات اختبار التصوير السينمائي.
 *
 * تتأكد من وجود ملفي العينة المستخدَمَين في اختبارات النهاية إلى النهاية:
 *   - sample-shot.png    — صورة لقطة لتحليل اللقطة الحي
 *   - sample-footage.mp4 — مقطع فيديو قصير لمسار محلل المشاهد
 *
 * إذا كان أي ملف مفقودًا أو فارغًا تُعاد توليده محليًا بشكل حتمي
 * (من بيانات داخل المستودع نفسه) بحيث لا تعتمد الاختبارات على شبكة
 * أو على ffmpeg أو على أي أداة نظام خارج pnpm.
 *
 * تُستدعى هذه الآلية من Playwright global setup، ومن CLI مباشرة:
 *   node tests/fixtures/media/ensure-media-fixtures.mjs
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PNG_PATH = path.join(__dirname, "sample-shot.png");
const MP4_PATH = path.join(__dirname, "sample-footage.mp4");

/**
 * يبني صورة PNG صالحة 64x36 بتدرج لوني حتمي بدون أي اعتماد على sharp
 * أو أي مكتبة خارجية. التضمين هنا اعتماد على الترميز الخام لـ PNG
 * (signature + IHDR + IDAT بترميز deflate ثابت + IEND) لإنتاج ملف
 * صالح يُقبل من المتصفحات وخوادم الاستخراج البصرية.
 */
async function buildSamplePng() {
  // استخدام مكتبة zlib المدمجة في Node لبناء IDAT سليم
  const zlib = await import("node:zlib");
  const width = 64;
  const height = 36;

  // raw scanlines: filter byte 0 + RGB triplets (تدرج رمادي حتمي)
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < width; x += 1) {
      const off = rowStart + 1 + x * 3;
      const value = Math.round(((x + y) * 255) / (width + height - 2));
      raw[off] = value;
      raw[off + 1] = value;
      raw[off + 2] = value;
    }
  }

  const deflated = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n += 1) {
      c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const byte of buf) {
      crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) | 0;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflated),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * يبني مقطع MP4 صالحًا حتميًا 16x16 بإطارَين باستخدام H.264 baseline
 * منخفض الحجم. لا يعتمد على ffmpeg ولا على شبكة. الترميز هنا base64
 * لنمط معروف لمقطع تجريبي تم بناؤه مسبقًا داخل ملحقات الاختبار.
 *
 * هذه الكتلة هي MP4 صغير جدًا ومحدد بدقة لاختبارات الواجهة فقط
 * (يكفي لاجتياز رفع ملف ذو نوع MIME صحيح حتى مرحلة استخراج إطار مرجعي).
 */
const SAMPLE_MP4_BASE64 =
  // ftyp(isom) + moov+mdat صغيرة - مقطع H264 16x16 ~1.6KB
  "AAAAGGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAACK21kYXQAAAAYZ2QACq" +
  "zZQ4eIAAAAARtbb3YAAAEAY3R0c0AAAAEAAAABAAAAAAAACgQAAAEAbW9vdgAAAGxtdmh" +
  "kAAAAAAAAAAAAAAAAAAAD6AAAAAEAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAA" +
  "AAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAQAAAAAJAAAAAAAAAAAAAAAACAAA" +
  "BqHRyYWsAAABcdGtoZAAAAAcAAAAAAAAAAAAAAAEAAAAAAAAD6AAAAAAAAAAAAAAAAAAAA" +
  "AABAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAQAAAAAAQAAAAEAAAAAAAJG" +
  "VkdHMAAAAcZWxzdAAAAAAAAAABAAAD6AAAAAAAAQAAAAAA12RsaWEAAAAgZmRociAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAA" +
  "AJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAB42dlc3RibAAAAJVzdHNkA" +
  "AAAAAAAAAEAAACFYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAQABAAEgAAEgAAAAA" +
  "AAAAAAAAAAAAAAAAAEv//AAAAL2F2Y0MBQgAK/+EAGGdkAAqs2UOHiAAAA+gAAAB0AHEH" +
  "DRiOABAFAATPxbqkAAAAFHN0dHMAAAAAAAAAAQAAAAEAAAAEAAAAFHN0c3oAAAAAAAAAGAA" +
  "AAAEAAAAUc3RzcwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAA" +
  "AAUc3RjbwAAAAAAAAABAAAAEA==";

function buildSampleMp4() {
  return Buffer.from(SAMPLE_MP4_BASE64, "base64");
}

async function ensureFile(filePath, builder) {
  let exists = false;
  try {
    const stat = await fs.stat(filePath);
    exists = stat.isFile() && stat.size > 0;
  } catch {
    exists = false;
  }
  if (exists) {
    return { filePath, status: "exists" };
  }
  const data = await builder();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  return { filePath, status: "generated", bytes: data.length };
}

export async function ensureMediaFixtures() {
  const png = await ensureFile(PNG_PATH, buildSamplePng);
  const mp4 = await ensureFile(MP4_PATH, buildSampleMp4);
  return { png, mp4 };
}

if (process.argv[1] && process.argv[1] === __filename) {
  ensureMediaFixtures()
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[ensure-media-fixtures] failed:", error);
      process.exit(1);
    });
}
