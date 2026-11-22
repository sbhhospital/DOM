import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { sbhLogoBase64 } from '../assets/logoBase64';

export const TARGET_CHECKIN_URL = 'https://sbhdom.vercel.app/boardroom-checkin';

/**
 * Generates an executive-grade, publication-ready A4 Boardroom Attendance QR Poster PDF.
 * Styled with an ultra-clean, prestigious hospital aesthetic (Navy & Emerald accents).
 * Engineered with safe margins and zero overlapping text so it prints flawlessly on any printer.
 */
export async function generateBoardroomPosterPdf(dateStr?: string): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210; // Standard A4 width (mm)
  const pageHeight = 297; // Standard A4 height (mm)
  const margin = 12;

  // Background: Pure Clean White
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 1. Top Prestige Accent Bar (Deep Navy + Hospital Emerald)
  doc.setFillColor(15, 23, 42); // #0f172a Deep Slate Navy
  doc.rect(0, 0, pageWidth, 4.5, 'F');
  doc.setFillColor(5, 150, 105); // #059669 Hospital Emerald
  doc.rect(0, 4.5, pageWidth, 2.5, 'F');

  // 2. Double Outer Border Frame (Safe Print Margin: 12mm sides, leaves 26mm bottom)
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.7);
  doc.roundedRect(margin, 11, pageWidth - margin * 2, pageHeight - 25, 4, 4, 'S');

  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 1.5, 12.5, pageWidth - margin * 2 - 3, pageHeight - 28, 3, 3, 'S');

  // 3. Official SBH Group of Hospitals Logo & Identity
  let y = 16.5;
  try {
    doc.addImage(sbhLogoBase64, 'PNG', pageWidth / 2 - 25, y, 50, 14);
    y += 16;
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('SBH GROUP OF HOSPITALS, RAIPUR', pageWidth / 2, y + 6, { align: 'center' });
    y += 10;
  }

  // Hospital Operations Command Pill (Non-overlapping, spacious)
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.3);
  const pillW = 82;
  doc.roundedRect(pageWidth / 2 - pillW / 2, y, pillW, 5.5, 2.75, 2.75, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(5, 150, 105); // emerald-700
  doc.text('HOSPITAL OPERATIONS & MANAGEMENT COMMAND', pageWidth / 2, y + 3.8, { align: 'center' });

  // Main Titles
  y += 9.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('DAILY OPERATIONS STANDUP (DOM)', pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setFontSize(8.5);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text('OFFICIAL IN-PERSON BOARDROOM ATTENDANCE TERMINAL', pageWidth / 2, y, { align: 'center' });

  // 4. Session Badges Row (Venue, Cadence, Scan Window)
  y += 6.5;
  const badgeW = (pageWidth - margin * 2 - 12) / 3;
  const badgeH = 13;
  const badges = [
    { title: 'PHYSICAL VENUE', val: 'Conference Room, 5th Floor', color: [217, 119, 6] },
    { title: 'DAILY CADENCE', val: 'Daily Sharp 10:00 AM IST', color: [5, 150, 105] },
    { title: 'SCAN WINDOW', val: '09:45 AM – 10:00 AM IST', color: [79, 70, 229] },
  ];

  badges.forEach((b, i) => {
    const bx = margin + 3 + i * (badgeW + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, badgeW, badgeH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.title, bx + badgeW / 2, y + 4.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(b.val, bx + badgeW / 2, y + 9.5, { align: 'center' });
  });

  // 5. Central High-Tech QR Code Frame
  y += badgeH + 6;
  const qrBoxW = 90;
  const qrBoxH = 88;
  const qrBoxX = (pageWidth - qrBoxW) / 2;

  // Background frame
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(5, 150, 105); // emerald-600
  doc.setLineWidth(1.0);
  doc.roundedRect(qrBoxX, y, qrBoxW, qrBoxH, 4, 4, 'FD');

  // Targeting Corner Brackets (Tech L-brackets in Emerald)
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(1.4);
  const bkLen = 6;
  // Top-Left
  doc.line(qrBoxX + 3, y + 3, qrBoxX + 3 + bkLen, y + 3);
  doc.line(qrBoxX + 3, y + 3, qrBoxX + 3, y + 3 + bkLen);
  // Top-Right
  doc.line(qrBoxX + qrBoxW - 3, y + 3, qrBoxX + qrBoxW - 3 - bkLen, y + 3);
  doc.line(qrBoxX + qrBoxW - 3, y + 3, qrBoxX + qrBoxW - 3, y + 3 + bkLen);
  // Bottom-Left
  doc.line(qrBoxX + 3, y + qrBoxH - 3, qrBoxX + 3 + bkLen, y + qrBoxH - 3);
  doc.line(qrBoxX + 3, y + qrBoxH - 3, qrBoxX + 3, y + qrBoxH - 3 - bkLen);
  // Bottom-Right
  doc.line(qrBoxX + qrBoxW - 3, y + qrBoxH - 3, qrBoxX + qrBoxW - 3 - bkLen, y + qrBoxH - 3);
  doc.line(qrBoxX + qrBoxW - 3, y + qrBoxH - 3, qrBoxX + qrBoxW - 3, y + qrBoxH - 3 - bkLen);

  // Generate ultra-crisp high-density QR code
  const qrDataUrl = await QRCode.toDataURL(TARGET_CHECKIN_URL, {
    width: 800,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  const qrImgSize = 72;
  const qrImgX = (pageWidth - qrImgSize) / 2;
  const qrImgY = y + 8;

  // Inner white pad for QR
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(qrImgX - 2.5, qrImgY - 2.5, qrImgSize + 5, qrImgSize + 5, 2.5, 2.5, 'FD');

  // Draw QR code image
  doc.addImage(qrDataUrl, 'PNG', qrImgX, qrImgY, qrImgSize, qrImgSize);

  // 6. Instruction Text Below QR Code
  y += qrBoxH + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('SCAN WITH SMARTPHONE CAMERA TO CONFIRM ATTENDANCE', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Open your phone camera or scanner app to access the official SBH Attendance Portal.', pageWidth / 2, y, { align: 'center' });

  y += 3.5;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth / 2 - 46, y, 92, 5.5, 1.8, 1.8, 'FD');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Target: ${TARGET_CHECKIN_URL}`, pageWidth / 2, y + 3.8, { align: 'center' });

  // 7. 3-Step Protocol
  y += 9.5;
  const stepW = (pageWidth - margin * 2 - 12) / 3;
  const stepH = 15;
  const steps = [
    { num: '1', title: 'Scan In Boardroom', desc: 'Scan upon entering 5th Floor Hall.', color: [217, 119, 6] },
    { num: '2', title: 'Verify Identity', desc: 'Select your name & confirm PIN.', color: [5, 150, 105] },
    { num: '3', title: 'Single Audit Lock', desc: 'Attendance locked for Director audit.', color: [79, 70, 229] },
  ];

  steps.forEach((s, idx) => {
    const sx = margin + 3 + idx * (stepW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, y, stepW, stepH, 2, 2, 'FD');

    // Number circle
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    doc.circle(sx + 5.5, y + 5.5, 2.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(s.num, sx + 5.5, y + 6.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(s.title, sx + 11, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(100, 116, 139);
    doc.text(s.desc, sx + 4, y + 11.5);
  });

  // 8. SOP & Compliance Section
  y += stepH + 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin + 4, y, pageWidth - margin - 4, y);

  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STANDING OPERATING PROCEDURE (SOP) & COMPLIANCE TERMS:', margin + 4, y);

  const sops = [
    'Punctuality Standard: Leaders attending physically must scan before 10:00 AM sharp. Late scans audited as Late Arrival.',
    'Single Daily Count Guarantee: Presence is recorded once per day. Rejoining preserves initial check-in timestamp.',
    'Automated Director Report: The DOM Register is finalized at 10:30 AM IST and transmitted directly to the Hospital Director.',
    'Boardroom Exclusivity: This QR terminal is valid strictly for physical presence inside the 5th Floor Boardroom.',
  ];

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(71, 85, 105);
  sops.forEach((sop) => {
    doc.text('•  ' + sop, margin + 4, y);
    y += 3.4;
  });

  // 9. Official Hospital Signature & Authorization Line
  y += 2.5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, y, pageWidth - margin - 4, y);

  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('SBH GROUP OF HOSPITALS • Raipur Central Operations', margin + 4, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized by Director Sir & Hospital Operations Command', pageWidth - margin - 4, y, { align: 'right' });

  return doc;
}

/**
 * Downloads the Boardroom Poster as an official, high-resolution A4 PDF.
 */
export async function downloadBoardroomPosterPdf(dateStr?: string): Promise<void> {
  const doc = await generateBoardroomPosterPdf(dateStr);
  doc.save(`SBH-DOM-Boardroom-QR-Poster-A4-${dateStr || 'Official'}.pdf`);
}

/**
 * Downloads the Boardroom Poster as an ultra-crisp PNG image.
 * Uses an offscreen HTML5 canvas to guarantee zero 'oklch' CSS errors.
 */
export async function downloadBoardroomPosterPng(dateStr?: string): Promise<void> {
  const width = 1240; // 150 DPI A4
  const height = 1754;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Top Prestige Bar (Deep Navy & Emerald)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 26);
  ctx.fillStyle = '#059669';
  ctx.fillRect(0, 26, width, 14);

  // Outer border box with safe margins
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 65, width - 120, height - 130);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SBH GROUP OF HOSPITALS, RAIPUR', width / 2, 135);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('HOSPITAL OPERATIONS & MANAGEMENT COMMAND', width / 2, 170);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('DAILY OPERATIONS STANDUP (DOM)', width / 2, 225);

  ctx.fillStyle = '#d97706';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('OFFICIAL IN-PERSON BOARDROOM ATTENDANCE TERMINAL', width / 2, 265);

  // 3 Badges
  const badgeY = 310;
  const badgeW = 340;
  const badgeH = 75;
  const badgeGap = 20;
  const startX = (width - (badgeW * 3 + badgeGap * 2)) / 2;

  const bData = [
    { title: 'PHYSICAL VENUE', val: 'Conference Room, 5th Floor', color: '#d97706' },
    { title: 'DAILY CADENCE', val: 'Daily Sharp 10:00 AM IST', color: '#059669' },
    { title: 'SCAN WINDOW', val: '09:45 AM – 10:00 AM IST', color: '#4f46e5' },
  ];

  bData.forEach((b, i) => {
    const bx = startX + i * (badgeW + badgeGap);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(bx, badgeY, badgeW, badgeH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, badgeY, badgeW, badgeH);

    ctx.fillStyle = b.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(b.title, bx + badgeW / 2, badgeY + 28);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(b.val, bx + badgeW / 2, badgeY + 58);
  });

  // QR Code Frame
  const qrBoxSize = 560;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 425;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 30);
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 6;
  ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 30);

  // Generate QR
  const qrDataUrl = await QRCode.toDataURL(TARGET_CHECKIN_URL, {
    width: 800,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  const qrImg = new Image();
  await new Promise((resolve) => {
    qrImg.onload = resolve;
    qrImg.src = qrDataUrl;
  });

  const qrSize = 460;
  const qrX = (width - qrSize) / 2;
  const qrY = qrBoxY + 30;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Instructions
  const textY = qrBoxY + qrBoxSize + 60;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('SCAN WITH SMARTPHONE CAMERA TO CONFIRM ATTENDANCE', width / 2, textY);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 19px sans-serif';
  ctx.fillText('Open your mobile camera or scanner app to access the official SBH Attendance Portal.', width / 2, textY + 32);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`Target: ${TARGET_CHECKIN_URL}`, width / 2, textY + 70);

  // 3-Step Protocol
  const stepY = textY + 115;
  const stepW = 340;
  const stepH = 85;
  const stepStartX = (width - (stepW * 3 + badgeGap * 2)) / 2;

  const stepsData = [
    { num: '1', title: 'Scan In Boardroom', desc: 'Scan upon entering 5th Floor Hall.', color: '#d97706' },
    { num: '2', title: 'Verify Identity', desc: 'Confirm your leader profile & PIN.', color: '#059669' },
    { num: '3', title: 'Single Audit Lock', desc: 'Attendance locked for Director audit.', color: '#4f46e5' },
  ];

  stepsData.forEach((s, idx) => {
    const sx = stepStartX + idx * (stepW + badgeGap);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(sx, stepY, stepW, stepH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, stepY, stepW, stepH);

    ctx.fillStyle = s.color;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${s.num}. ${s.title}`, sx + 18, stepY + 34);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px sans-serif';
    ctx.fillText(s.desc, sx + 18, stepY + 64);
  });

  // SOP Box
  const sopY = stepY + 120;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, sopY);
  ctx.lineTo(width - 80, sopY);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STANDING OPERATING PROCEDURE (SOP) & COMPLIANCE TERMS:', 80, sopY + 32);

  const sops = [
    '• Punctuality Standard: Leaders attending physically must scan before 10:00 AM sharp. Late scans audited as Late Arrival.',
    '• Single Daily Count Guarantee: Presence is recorded once per day. Rejoining preserves initial check-in timestamp.',
    '• Automated Director Report: The DOM Register is finalized at 10:30 AM IST and transmitted directly to the Hospital Director.',
    '• Boardroom Exclusivity: This QR terminal is valid strictly for physical presence inside the 5th Floor Boardroom.',
  ];

  ctx.fillStyle = '#475569';
  ctx.font = '500 17px sans-serif';
  sops.forEach((s, idx) => {
    ctx.fillText(s, 80, sopY + 68 + idx * 28);
  });

  // Footer
  const footY = height - 90;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(80, footY);
  ctx.lineTo(width - 80, footY);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SBH GROUP OF HOSPITALS • Raipur Central Operations', 80, footY + 30);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '500 18px sans-serif';
  ctx.fillText('Authorized by Director Sir & Hospital Operations Command', width - 80, footY + 30);

  // Download Image
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `SBH-DOM-Boardroom-QR-Poster-A4-${dateStr || 'Official'}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
