export type Language = 'ar' | 'en';

export interface Translations {
  appName: string;
  masthead: string;
  tagline: string;
  subtagline: string;
  navCompare: string;
  navMethodology: string;
  navHealth: string;
  navThemeDark: string;
  navThemeLight: string;
  tabText: string;
  tabUrl: string;
  tabImage: string;
  tabVideo: string;
  inputPlaceholder: string;
  clearText: string;
  clipboardBtn: string;
  uploadImageBtn: string;
  uploadVideoBtn: string;
  urlBtn: string;
  verifyBtn: string;
  verifyingBtn: string;
  examplesTitle: string;
  example1Title: string;
  example1Text: string;
  example2Title: string;
  example2Text: string;
  example3Title: string;
  example3Text: string;
  pipelineTitle: string;
  stageBadge: string;
  stages: Array<{ name: string; desc: string }>;
  verdictTitle: string;
  confidenceLabel: string;
  confidenceNote: string;
  sourcesCountLabel: string;
  verificationTimeLabel: string;
  recycledAlertTitle: string;
  recycledAlertDesc: string;
  shareBtn: string;
  copyReportBtn: string;
  copiedBtn: string;
  claimsSectionTitle: string;
  claimNum: string;
  claimLang: string;
  linkedEvidence: string;
  pendingCheck: string;
  evidenceSectionTitle: string;
  evidenceSortedNote: string;
  openSourceLink: string;
  reliabilityLabel: string;
  noEvidenceFound: string;
  forensicsTitle: string;
  ocrTitle: string;
  ocrConfidence: string;
  ocrEmpty: string;
  exifTitle: string;
  exifCamera: string;
  exifDate: string;
  exifSoftware: string;
  exifGPS: string;
  exifEmpty: string;
  manipulationTitle: string;
  videoTimelineTitle: string;
  videoDuration: string;
  videoTranscript: string;
  contradictionTitle: string;
  privacyFooter: string;
  rightsFooter: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    appName: 'مرصد تدقيق الحقائق',
    masthead: 'FactCheck AI | المرصد التحريري لتدقيق الأخبار والتحقق من الوقائع',
    tagline: 'تحقق من صحة الأخبار والادعاءات بدقة مهنية ومصادر حقيقية',
    subtagline: 'منصة استقصائية مستقلة لفحص الأخبار، والتصريحات، والروابط، والصور، والفيديوهات عبر تتبع المصادر الرسمية والأرشيفات الدولية دون أي اختلاق للمعلومات.',
    navCompare: 'مقارنة مصدرين',
    navMethodology: 'منهجية الفحص',
    navHealth: 'سجل المزودات',
    navThemeDark: 'الوضع الليلي',
    navThemeLight: 'الوضع النهاري',
    tabText: 'نص / تصريح',
    tabUrl: 'رابط مقال',
    tabImage: 'صورة / لقطة شاشة',
    tabVideo: 'فيديو',
    inputPlaceholder: 'ألصق نص الخبر، أو التصريح، أو رابط المقال، أو ارفع صورة/فيديو للفحص الجنائي...',
    clearText: 'مسح',
    clipboardBtn: 'فحص الحافظة',
    uploadImageBtn: 'رفع صورة',
    uploadVideoBtn: 'رفع فيديو',
    urlBtn: 'رابط خبر',
    verifyBtn: 'فحص والتحقق الآن',
    verifyingBtn: 'جاري التحقق واسترجاع الأدلة...',
    examplesTitle: 'حالات شائعة للاختبار السريع:',
    example1Title: 'شائعة سياسية عاجلة:',
    example1Text: 'اغتيال خامنئي ومقتله في طهران',
    example2Title: 'بيان صحي دولي:',
    example2Text: 'منظمة الصحة العالمية تعلن انتهاء جائحة كورونا رسميًا',
    example3Title: 'ادعاء علمي مبالغ فيه:',
    example3Text: 'علماء يكتشفون علاجًا نهائيًا للسرطان بنسبة 100%',
    pipelineTitle: 'بروتوكول الفحص والتحقق التحريري',
    stageBadge: 'المرحلة',
    stages: [
      { name: 'قراءة وتحليل المحتوى', desc: 'تحديد نوع الإدخال، فحص الروابط والصور واستخراج النصوص' },
      { name: 'تفكيك الادعاءات', desc: 'عزل الادعاءات المفصلية وتصنيفها موضوعياً' },
      { name: 'استرجاع الأرشيفات والتقارير', desc: 'استعلام وكالات الأنباء، والموسوعات، ومستودعات الأخبار الدولية' },
      { name: 'مطابقة وتقييم الموثوقية', desc: 'تصنيف المصادر حسب مستويات الموثوقية الخمسة المعتمدة' },
      { name: 'الفحص التقني للوسائط', desc: 'تحليل البيانات الوصفية للكاميرا (EXIF) والنصوص والصور' },
      { name: 'كشف التناقض والسياق القديم', desc: 'التأكد من تاريخ النشر الأصلي ومقارنة مواقف المصادر' },
      { name: 'صياغة تقرير الحكم النهائي', desc: 'إصدار الحكم التحريري الموثق بالأدلة المباشرة' },
    ],
    verdictTitle: 'الحكم التحريري النهائي',
    confidenceLabel: 'درجة الموثوقية المستندة للأدلة:',
    confidenceNote: 'النسبة تعبر عن اتساق الأدلة الموثقة المسترجعة من وكالات الأنباء والمصادر الأولية.',
    sourcesCountLabel: 'مصادر موثقة ومستقلة',
    verificationTimeLabel: 'زمن الفحص:',
    recycledAlertTitle: 'رصد تداول سياق قديم (First Seen Context):',
    recycledAlertDesc: 'المحتوى أو الحدث حقيقي جزئياً لكنه يعود إلى تاريخ سابق وتمت إعادة نشره كأنه حدث جديد.',
    shareBtn: 'مشاركة التقرير',
    copyReportBtn: 'نسخ تقرير الفحص',
    copiedBtn: 'تم النسخ!',
    claimsSectionTitle: 'الادعاءات المفحوصة والتصنيف المهني',
    claimNum: 'ادعاء',
    claimLang: 'اللغة',
    linkedEvidence: 'أدلة موثقة',
    pendingCheck: 'تم الربط بالمصادر',
    evidenceSectionTitle: 'الأدلة والمصادر المسترجعة',
    evidenceSortedNote: 'مرتبة بحسب معايير الموثوقية الصحفية وقرب المصدر من الحدث',
    openSourceLink: 'قراءة المصدر الأصلي',
    reliabilityLabel: 'مؤشر الموثوقية:',
    noEvidenceFound: 'لم يتم العثور على تقارير أو وثائق كافية لتأكيد هذا الادعاء أو نفيه بشكل قاطع.',
    forensicsTitle: 'تقرير الفحص التقني للصور (Forensics)',
    ocrTitle: 'النص المستخرج من الصورة (OCR):',
    ocrConfidence: 'دقة المطابقة',
    ocrEmpty: 'لم يتم رصد نصوص واضحة داخل الصورة.',
    exifTitle: 'بيانات الكاميرا والالتقاط (EXIF Metadata):',
    exifCamera: 'الكاميرا:',
    exifDate: 'تاريخ الالتقاط:',
    exifSoftware: 'البرمجية:',
    exifGPS: 'الإحداثيات:',
    exifEmpty: 'تم تجريد البيانات الوصفية (Metadata Stripped) عبر منصة النشر.',
    manipulationTitle: 'مؤشر احتمالية التعديل أو التوليد الرقمي:',
    videoTimelineTitle: 'المخطط الزمني للفيديو (Timeline Analysis)',
    videoDuration: 'مدة الفيديو:',
    videoTranscript: 'التفريغ النصي المسموع:',
    contradictionTitle: 'تنبيه تحريري: تعارض واختلاف بين تغطيات المصادر المسترجعة',
    privacyFooter: 'إشعار الخصوصية: لا يتم الاحتفاظ بأي ملفات أو وسائط مرفوعة، وتُحذف كافة البيانات المؤقتة تلقائياً.',
    rightsFooter: 'مرصد تدقيق الحقائق © 2026 — منصة مهنية مستقلة لاسترجاع الأدلة وتدقيق الأخبار',
  },
  en: {
    appName: 'FactCheck Desk',
    masthead: 'FactCheck AI | Investigative News & Fact Verification Desk',
    tagline: 'Verify news and claims with journalistic rigor and verifiable evidence',
    subtagline: 'An independent investigative desk verifying claims, news reports, links, photos, and videos against primary government records, international archives, and wire services with zero hallucinated sources.',
    navCompare: 'Compare Sources',
    navMethodology: 'Methodology',
    navHealth: 'Source Registry',
    navThemeDark: 'Dark Mode',
    navThemeLight: 'Light Mode',
    tabText: 'Text / Claim',
    tabUrl: 'Article Link',
    tabImage: 'Photo / Screenshot',
    tabVideo: 'Video Clip',
    inputPlaceholder: 'Paste news text, statement, article URL, or drop an image/video for forensic verification...',
    clearText: 'Clear',
    clipboardBtn: 'Check Clipboard',
    uploadImageBtn: 'Upload Image',
    uploadVideoBtn: 'Upload Video',
    urlBtn: 'Article URL',
    verifyBtn: 'Verify Claim Now',
    verifyingBtn: 'Retrieving Evidence & Cross-Checking...',
    examplesTitle: 'Try common news claims:',
    example1Title: 'Breaking Political Claim:',
    example1Text: 'Assassination of Khamenei in Tehran',
    example2Title: 'Global Health Statement:',
    example2Text: 'World Health Organization declares end of COVID-19 pandemic',
    example3Title: 'Exaggerated Medical Claim:',
    example3Text: 'Scientists discover 100% cure for cancer',
    pipelineTitle: 'Editorial Verification Protocol',
    stageBadge: 'Stage',
    stages: [
      { name: 'Content Ingestion & Extraction', desc: 'Classifying input, SSRF checks, OCR, and text extraction' },
      { name: 'Claim Deconstruction', desc: 'Isolating factual assertions and assigning domain taxonomy' },
      { name: 'Multi-Source Retrieval', desc: 'Querying global wires, encyclopedias, GDELT, and official databases' },
      { name: 'Source Credibility Scoring', desc: 'Evaluating outlets across 5 rigorous credibility tiers' },
      { name: 'Forensic Media Inspection', desc: 'Analyzing EXIF camera metadata, OCR text, and compression signals' },
      { name: 'Recycled Context & Contradictions', desc: 'Checking original publication dates and conflicting reports' },
      { name: 'Editorial Verdict Issuance', desc: 'Generating evidence-backed verdict with real citation links' },
    ],
    verdictTitle: 'Editorial Verdict',
    confidenceLabel: 'Evidence Confidence Score:',
    confidenceNote: 'Score reflects consistency and tier weight of retrieved primary sources and wire reports.',
    sourcesCountLabel: 'Verified Independent Sources',
    verificationTimeLabel: 'Check time:',
    recycledAlertTitle: 'Recycled Context Detected (First Seen):',
    recycledAlertDesc: 'The media or event is partially real but dates back to an earlier year and has been re-captioned as current news.',
    shareBtn: 'Share Card',
    copyReportBtn: 'Copy Report',
    copiedBtn: 'Copied!',
    claimsSectionTitle: 'Analyzed Claims & Categorization',
    claimNum: 'Claim',
    claimLang: 'Language',
    linkedEvidence: 'Linked Sources',
    pendingCheck: 'Corroborated',
    evidenceSectionTitle: 'Retrieved Evidence & Citations',
    evidenceSortedNote: 'Ranked by journalistic credibility tiers and proximity to the event',
    openSourceLink: 'View Original Source',
    reliabilityLabel: 'Reliability Index:',
    noEvidenceFound: 'Insufficient independent documentation found to decisively verify or refute this claim.',
    forensicsTitle: 'Image Forensics Report',
    ocrTitle: 'Extracted Image Text (OCR):',
    ocrConfidence: 'Confidence',
    ocrEmpty: 'No legible text detected inside the image.',
    exifTitle: 'Camera & Capture Metadata (EXIF):',
    exifCamera: 'Camera:',
    exifDate: 'Capture Date:',
    exifSoftware: 'Software:',
    exifGPS: 'Coordinates:',
    exifEmpty: 'Metadata stripped by social media platform or publisher.',
    manipulationTitle: 'Digital Manipulation / AI Likelihood Index:',
    videoTimelineTitle: 'Video Timeline Analysis',
    videoDuration: 'Video Duration:',
    videoTranscript: 'Audio Transcript:',
    contradictionTitle: 'Editorial Alert: Discrepancy detected between retrieved source reports',
    privacyFooter: 'Privacy Notice: Uploaded media files are processed ephemerally and immediately purged after inspection.',
    rightsFooter: 'FactCheck Desk © 2026 — Professional investigative fact-checking and evidence retrieval system',
  },
};
