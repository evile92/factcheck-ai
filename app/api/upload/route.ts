import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم تقديم أي ملف للرفع.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الملف يتجاوز الحد المسموح به (الحد الأقصى 50 ميجابايت).' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `نوع الملف (${file.type}) غير مدعوم. الصيغ المدعومة: صور (JPG, PNG, WebP) وفيديو (MP4, WebM).` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const isVideo = file.type.startsWith('video/');

    return NextResponse.json({
      success: true,
      filename: file.name,
      fileType: isVideo ? 'video' : 'image',
      mimeType: file.type,
      sizeBytes: file.size,
      base64: `data:${file.type};base64,${base64}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `فشل معالجة الملف: ${err.message}` }, { status: 500 });
  }
}
