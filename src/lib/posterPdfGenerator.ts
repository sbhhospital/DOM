import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { sbhLogoBase64 } from '../assets/logoBase64';

export const TARGET_CHECKIN_URL = 'https://sbhdom.vercel.app/boardroom-checkin';

/**
 * Generates an official, publication-ready A4 Boardroom Attendance QR Poster PDF.
 * Uses jsPDF directly so it never encounters CSS 'oklch' parsing issues.
 */
export async function generateBoardroomPosterPdf(dateStr?: string): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;

  // 1. Top Decorative Brand Bar (Hospital Orange & Emerald Green)
  doc.setFillColor(234, 88, 12); // #ea580c Hospital Orange
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(22, 163, 74); // #16a34a Emerald Green
  doc.rect(0, 5, pageWidth, 2.5, 'F');

  // Outer Border Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, 12, pageWidth - margin * 2, pageHeight - 24, 4, 4, 'S');

  // 2. Official Logo & Header
  let y = 17;
  try {
    doc.addImage(sbhLogoBase64, 'PNG', pageWidth / 2 - 25, y, 50, 14);
    y += 16;
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('SBH GROUP OF HOSPITALS, RAIPUR', pageWidth / 2, y + 4, { align: 'center' });
    y += 8;
  }

  // Hospital Operations & Management Command Pill
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.3);
  const pillW = 76;
  doc.roundedRect(pageWidth / 2 - pillW / 2, y, pillW, 5.5, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 163, 74);
  doc.text('HOSPITAL OPERATIONS & MANAGEMENT COMMAND', pageWidth / 2, y + 3.8, { align: 'center' });

  // Main Titles
  y += 9.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DAILY OPERATIONS STANDUP (DOM)', pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setFontSize(9);
  doc.setTextColor(234, 88, 12);
  doc.text('OFFICIAL BOARDROOM ATTENDANCE CHECK-IN TERMINAL', pageWidth / 2, y, { align: 'center' });

  // 3. Session Badges Row (Venue, Cadence, Scan Window)
  y += 7;
  const badgeW = (pageWidth - margin * 2 - 12) / 3;
  const badges = [
    { title: 'VENUE', val: 'Conference Room, 5th Floor', color: [234, 88, 12] },
    { title: 'CADENCE', val: 'Daily Sharp 10:00 AM IST', color: [22, 163, 74] },
    { title: 'SCAN WINDOW', val: '09:45 AM – 10:00 AM IST', color: [37, 99, 235] },
  ];

  badges.forEach((b, i) => {
    const bx = margin + 3 + i * (badgeW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, badgeW, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.title, bx + badgeW / 2, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(b.val, bx + badgeW / 2, y + 10, { align: 'center' });
  });

  // 4. Central Emerald QR Code Box (Perfect Dead Center)
  y += 19;
  const qrBoxW = 92;
  const qrBoxH = 88;
  const qrBoxX = (pageWidth - qrBoxW) / 2;

  // Background gradient-style box with Emerald border
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(22, 163, 74); // #16a34a Emerald
  doc.setLineWidth(1.2);
  doc.roundedRect(qrBoxX, y, qrBoxW, qrBoxH, 4, 4, 'FD');

  // Generate high-res base64 QR code locally
  const qrDataUrl = await QRCode.toDataURL(TARGET_CHECKIN_URL, {
    width: 600,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  const qrImgSize = 74;
  const qrImgX = (pageWidth - qrImgSize) / 2;
  const qrImgY = y + 7;

  // Inner white pad for QR
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(qrImgX - 3, qrImgY - 3, qrImgSize + 6, qrImgSize + 6, 2.5, 2.5, 'FD');

  // Draw QR code image
  doc.addImage(qrDataUrl, 'PNG', qrImgX, qrImgY, qrImgSize, qrImgSize);

  // 5. Instruction text below QR Code
  y += qrBoxH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('SCAN WITH SMARTPHONE CAMERA TO CONFIRM ATTENDANCE', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Point mobile camera or scanner at the code to access the official SBH Attendance Terminal.', pageWidth / 2, y, { align: 'center' });

  y += 3.5;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth / 2 - 45, y, 90, 5.5, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 163, 74);
  doc.text(`Target: ${TARGET_CHECKIN_URL}`, pageWidth / 2, y + 3.8, { align: 'center' });

  // 6. 3-Step Protocol
  y += 9.5;
  const stepW = (pageWidth - margin * 2 - 12) / 3;
  const steps = [
    { num: '1', title: 'Scan In Boardroom', desc: 'Scan upon entering 5th Floor Hall.', color: [234, 88, 12] },
    { num: '2', title: 'Verify Identity', desc: 'Select your name and enter PIN.', color: [22, 163, 74] },
    { num: '3', title: 'Single Audit Lock', desc: 'Attendance counted once per day.', color: [37, 99, 235] },
  ];

  steps.forEach((s, idx) => {
    const sx = margin + 3 + idx * (stepW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, y, stepW, 16, 2, 2, 'FD');

    // Number circle
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    doc.circle(sx + 5.5, y + 5.5, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(s.num, sx + 5.5, y + 6.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(s.title, sx + 11, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(s.desc, sx + 4, y + 12);
  });

  // 7. SOP Section
  y += 21;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin + 4, y, pageWidth - margin - 4, y);

  y += 4;
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
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  sops.forEach((sop) => {
    doc.text('•  ' + sop, margin + 4, y);
    y += 3.5;
  });

  // 8. Bottom Signature Line
  y += 2;
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
  doc.text('Authorized by Director Sir & Hospital Management', pageWidth - margin - 4, y, { align: 'right' });

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

  // Top Tricolor bar
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(0, 0, width, 30);
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 30, width, 15);

  // Outer border box
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 70, width - 120, height - 140);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SBH GROUP OF HOSPITALS, RAIPUR', width / 2, 140);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 22px sans-serif';
  ctx.fillText('Hospital Operations & Management Command', width / 2, 175);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('DAILY OPERATIONS STANDUP (DOM)', width / 2, 235);

  ctx.fillStyle = '#ea580c';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('OFFICIAL BOARDROOM ATTENDANCE CHECK-IN TERMINAL', width / 2, 275);

  // 3 Badges
  const badgeY = 320;
  const badgeW = 340;
  const badgeH = 80;
  const badgeGap = 20;
  const startX = (width - (badgeW * 3 + badgeGap * 2)) / 2;

  const bData = [
    { title: 'VENUE', val: 'Conference Room, 5th Floor', color: '#ea580c' },
    { title: 'CADENCE', val: 'Daily Sharp 10:00 AM IST', color: '#16a34a' },
    { title: 'SCAN WINDOW', val: '09:45 AM – 10:00 AM IST', color: '#2563eb' },
  ];

  bData.forEach((b, i) => {
    const bx = startX + i * (badgeW + badgeGap);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(bx, badgeY, badgeW, badgeH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, badgeY, badgeW, badgeH);

    ctx.fillStyle = b.color;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(b.title, bx + badgeW / 2, badgeY + 30);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(b.val, bx + badgeW / 2, badgeY + 62);
  });

  // QR Code Frame
  const qrBoxSize = 580;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 440;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 40);
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 8;
  ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 40);

  // Generate QR
  const qrDataUrl = await QRCode.toDataURL(TARGET_CHECKIN_URL, {
    width: 600,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  const qrImg = new Image();
  await new Promise((resolve) => {
    qrImg.onload = resolve;
    qrImg.src = qrDataUrl;
  });

  const qrSize = 460;
  const qrX = (width - qrSize) / 2;
  const qrY = qrBoxY + 40;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Instructions
  const textY = qrBoxY + qrBoxSize + 55;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('SCAN WITH SMARTPHONE CAMERA TO CONFIRM ATTENDANCE', width / 2, textY);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 20px sans-serif';
  ctx.fillText('Point your mobile phone camera or scanner at the code to access the official SBH Attendance Terminal.', width / 2, textY + 35);

  ctx.fillStyle = '#16a34a';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`Target: ${TARGET_CHECKIN_URL}`, width / 2, textY + 75);

  // SOP Box
  const sopY = textY + 130;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, sopY);
  ctx.lineTo(width - 80, sopY);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STANDING OPERATING PROCEDURE (SOP) & COMPLIANCE TERMS:', 80, sopY + 35);

  const sops = [
    '• Punctuality Standard: Leaders attending physically must scan before 10:00 AM sharp. Late scans audited as Late Arrival.',
    '• Single Daily Count Guarantee: Presence is recorded once per day. Rejoining preserves initial check-in timestamp.',
    '• Automated Director Report: The DOM Register is finalized at 10:30 AM IST and transmitted directly to the Hospital Director.',
    '• Boardroom Exclusivity: This QR terminal is valid strictly for physical presence inside the 5th Floor Boardroom.',
  ];

  ctx.fillStyle = '#475569';
  ctx.font = '500 18px sans-serif';
  sops.forEach((s, idx) => {
    ctx.fillText(s, 80, sopY + 75 + idx * 30);
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
  ctx.fillText('Authorized by Director Sir & Hospital Management', width - 80, footY + 30);

  // Download Image
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `SBH-DOM-Boardroom-QR-Poster-A4-${dateStr || 'Official'}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
