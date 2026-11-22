import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MeetingSchedule, AttendanceRecord, AppSettings, Leader, Department } from '../types/database';
import { sbhLogoBase64 } from '../assets/logoBase64';
import { defaultLeaderAvatarBase64 } from '../assets/defaultLeaderAvatarBase64';
import { formatLateDuration, formatToIndianDate } from './meetingUtils';

// Subtle Official Hospital Logo Watermark on Every Page
function addHospitalLogoWatermark(doc: jsPDF) {
  try {
    const totalPages = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const wmWidth = 110;
    const wmHeight = 32;
    const wmX = (pageWidth - wmWidth) / 2;
    const wmY = (pageHeight - wmHeight) / 2;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      try {
        (doc as any).saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.07 }));
        doc.addImage(sbhLogoBase64, 'PNG', wmX, wmY, wmWidth, wmHeight);
        (doc as any).restoreGraphicsState();
      } catch (innerErr) {
        // Fallback if GState opacity isn't supported in environment
      }
    }
  } catch (err) {
    console.warn('PDF watermark note:', err);
  }
}

export function generateDirectorPdf(
  meeting: MeetingSchedule,
  records: AttendanceRecord[],
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;

  // 1. Top Decorative Brand Bar (Hospital Orange & Green Theme)
  doc.setFillColor(234, 88, 12); // #ea580c (Hospital Orange)
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(22, 163, 74); // #16a34a (Emerald Green)
  doc.rect(0, 5, pageWidth, 2, 'F');

  // 2. Official Hospital Logo & Header
  try {
    doc.addImage(sbhLogoBase64, 'PNG', margin, 9, 38, 10);
  } catch (e) {
    // fallback
  }

  const textStartX = margin + 41;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('SBH GROUP OF HOSPITALS, RAIPUR', textStartX, 12.5);

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Hospital Operations & Management Command', textStartX, 17.0);

  // Right-aligned report badge (compact font to guarantee zero overlap with hospital title)
  const cadenceCode = meeting.cadence || (meeting.frequency === 'MONTHLY' ? 'MOM' : meeting.frequency === 'WEEKLY' ? 'WOM' : 'DOM');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(234, 88, 12);
  doc.text(`${cadenceCode} LEADERSHIP REPORT`, pageWidth - margin, 12.5, { align: 'right' });
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} IST`, pageWidth - margin, 17.0, { align: 'right' });

  // Divider line
  let currentY = 22;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 3. Meeting Title & Frequency Banner
  currentY += 7;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(meeting.title.toUpperCase(), margin + 4, currentY + 6);

  const formattedDate = new Date(meeting.meeting_date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${formatToIndianDate(meeting.meeting_date)} (${formattedDate})   |   Scheduled Time: ${meeting.scheduled_time}   |   Cadence: ${cadenceCode} (${meeting.frequency})`, margin + 4, currentY + 12);
  doc.text(`Venue: ${settings.conference_room_name}   |   Portal URL: https://sbhdom.vercel.app`, margin + 4, currentY + 17);

  currentY += 26;

  // 4. Executive Summary KPI Metric Cards
  const totalLeaders = records.length;
  const isSundayMeeting = new Date(meeting.meeting_date).getDay() === 0;
  const isExplicitlyEnabled = (meeting.cadence === 'DOM' || meeting.cadence === 'WOM' || meeting.cadence === 'MOM') && !meeting.is_holiday_or_shifted;
  const isMeetingOff = !isExplicitlyEnabled && (isSundayMeeting || meeting.cadence === 'HOLIDAY' || Boolean(meeting.is_holiday_or_shifted));

  const approvedPresent = records.filter(
    (r) =>
      r.status !== 'EXCUSED' &&
      (r.admin_verified_attendance || r.verification_status === 'VERIFIED') &&
      r.status !== 'ABSENT' &&
      r.verification_status !== 'REJECTED'
  ).length;
  const pendingApproval = isMeetingOff ? 0 : records.filter(
    (r) =>
      r.status !== 'EXCUSED' &&
      !r.admin_verified_attendance &&
      r.verification_status !== 'VERIFIED' &&
      r.verification_status !== 'REJECTED' &&
      (r.status === 'PRESENT' || r.status === 'INFORMED_LATE' || r.selected_mode === 'PHYSICAL' || r.selected_mode === 'VIRTUAL')
  ).length;
  const approvedLeave = records.filter((r) => r.status === 'LEAVE' || r.status === 'INFORMED_ABSENT').length;
  const absentCount = isMeetingOff ? 0 : records.filter(
    (r) =>
      r.status !== 'EXCUSED' &&
      !r.admin_verified_attendance &&
      r.verification_status !== 'VERIFIED' &&
      r.status !== 'PRESENT' &&
      (r.status === 'ABSENT' || r.verification_status === 'REJECTED' || (r.status === 'PENDING' && r.selected_mode === 'NONE'))
  ).length;

  const cardWidth = (pageWidth - margin * 2 - 12) / 4; // 4 KPI cards
  const cardHeight = 18;

  const kpis = [
    { title: 'REGISTERED LEADERS', val: `${totalLeaders}`, sub: 'Department Heads', bg: [241, 245, 249], text: [15, 23, 42] },
    { title: 'ADMIN APPROVED', val: `${approvedPresent}`, sub: 'Verified & Confirmed', bg: [236, 253, 245], text: [22, 163, 74] },
    { title: 'APPROVAL PENDING', val: `${pendingApproval}`, sub: 'Awaiting Admin Sign-off', bg: [254, 243, 199], text: [217, 119, 6] },
    { title: 'ABSENT / UNREPORTED', val: `${absentCount}`, sub: 'Action Required', bg: [255, 241, 242], text: [225, 29, 72] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 4);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, cardX + 3, currentY + 4.5);

    doc.setFontSize(11);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, cardX + 3, currentY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, cardX + 3, currentY + 15);
  });

  currentY += cardHeight + 4;

  // Segmented Visual Graph / Bar (Executive Compliance Overview)
  const totalBarWidth = pageWidth - margin * 2;
  const safeTotal = totalLeaders > 0 ? totalLeaders : 1;
  const attendedWidth = (approvedPresent / safeTotal) * totalBarWidth;
  const pendingWidth = (pendingApproval / safeTotal) * totalBarWidth;
  const leaveWidth = (approvedLeave / safeTotal) * totalBarWidth;
  const absentWidth = (absentCount / safeTotal) * totalBarWidth;

  // Background track
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, totalBarWidth, 3.5, 1, 1, 'F');

  // Segments
  let barCurrentX = margin;
  if (attendedWidth > 0) {
    doc.setFillColor(22, 163, 74); // Green: Attended
    doc.rect(barCurrentX, currentY, attendedWidth, 3.5, 'F');
    barCurrentX += attendedWidth;
  }
  if (pendingWidth > 0) {
    doc.setFillColor(245, 158, 11); // Amber: Informed Late / Pending
    doc.rect(barCurrentX, currentY, pendingWidth, 3.5, 'F');
    barCurrentX += pendingWidth;
  }
  if (leaveWidth > 0) {
    doc.setFillColor(147, 51, 234); // Purple: Approved Leave
    doc.rect(barCurrentX, currentY, leaveWidth, 3.5, 'F');
    barCurrentX += leaveWidth;
  }
  if (absentWidth > 0) {
    doc.setFillColor(225, 29, 72); // Red: Absent / No Info
    doc.rect(barCurrentX, currentY, absentWidth, 3.5, 'F');
  }

  // Graph Legend text
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(`Attended: ${approvedPresent}`, margin, currentY + 7);
  doc.setTextColor(217, 119, 6);
  doc.text(`Informed / Pending: ${pendingApproval}`, margin + 35, currentY + 7);
  doc.setTextColor(147, 51, 234);
  doc.text(`Approved Leave: ${approvedLeave}`, margin + 78, currentY + 7);
  doc.setTextColor(225, 29, 72);
  doc.text(`Absent (No Inform): ${absentCount}`, margin + 120, currentY + 7);

  currentY += 11;

  // 5. Section Header: Official Attendance Roster
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. OFFICIAL DEPARTMENT ATTENDANCE & VERIFICATION AUDIT', margin, currentY);

  currentY += 2;

  // Table Data Mapping
  const tableRows = records.map((rec, index) => {
    const leaderName = rec.leader?.full_name || 'Department Leader';
    const deptName = rec.leader?.department?.name || 'Hospital Operations';
    const expected = rec.leader?.expected_mode || 'PHYSICAL';

    let actualMode = '—';
    if (rec.evidence_source === 'ADMIN_MANUAL') actualMode = 'In-Person (Admin)';
    else if (rec.selected_mode === 'PHYSICAL') actualMode = 'In-Person (Room)';
    else if (rec.selected_mode === 'VIRTUAL') actualMode = 'Virtual (Online)';

    let joinTime = '—';
    if (rec.check_in_at) {
      try {
        const d = new Date(rec.check_in_at);
        joinTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      } catch {
        joinTime = rec.check_in_at;
      }
    }

    const hasJoined =
      rec.status === 'PRESENT' ||
      rec.status === 'INFORMED_LATE' ||
      rec.selected_mode === 'PHYSICAL' ||
      rec.selected_mode === 'VIRTUAL';
    const isLate = (rec.late_minutes && rec.late_minutes > 0) || rec.status === 'INFORMED_LATE';

    let statusDisplay = 'Absent (Unreported)';
    let auditDisplay = 'UNEXCUSED';

    if (isMeetingOff && rec.status !== 'PRESENT') {
      statusDisplay = rec.verification_note || (isSundayMeeting ? 'Sunday Weekly Off' : 'Holiday / No DOM');
      auditDisplay = 'EXCUSED';
    } else if (rec.verification_status === 'REJECTED' || rec.verification_note?.includes('Disapproved') || rec.verification_note?.includes('No Inform')) {
      statusDisplay = 'Absent (No Inform)';
      auditDisplay = 'UNEXCUSED / REJECTED';
    } else if (rec.status === 'LEAVE' || (rec.status === 'INFORMED_ABSENT' && rec.informed_confirmed)) {
      statusDisplay = `Approved Leave (${rec.informed_to_person || 'Admin'})`;
      auditDisplay = 'EXCUSED';
    } else if (rec.status === 'INFORMED_ABSENT') {
      statusDisplay = `Informed (${rec.informed_to_person || 'HOD'})`;
      auditDisplay = rec.informed_confirmed ? 'APPROVED' : 'PENDING';
    } else if (hasJoined) {
      const lateStr = isLate ? ` (${formatLateDuration(rec.late_minutes)})` : '';
      if (rec.admin_verified_attendance) {
        const isAdminMarked = rec.evidence_source === 'ADMIN_MANUAL' || rec.verification_note?.includes('Marked Present by Admin');
        if (isLate) {
          statusDisplay = isAdminMarked
            ? `Present (Admin Late: ${formatLateDuration(rec.late_minutes)})`
            : `Present (Late: ${formatLateDuration(rec.late_minutes)})`;
          auditDisplay = isAdminMarked ? 'ADMIN MANUAL' : 'APPROVED';
        } else {
          statusDisplay = isAdminMarked ? 'Present (Admin Marked)' : 'Present';
          auditDisplay = isAdminMarked ? 'ADMIN MANUAL' : 'APPROVED';
        }
      } else {
        // ADMIN APPROVAL IS PENDING
        if (isLate) {
          statusDisplay = `Late${lateStr}`;
          auditDisplay = 'PENDING';
        } else {
          statusDisplay = 'Present (Unverified)';
          auditDisplay = 'PENDING';
        }
      }
    } else {
      statusDisplay = 'Absent (Unreported)';
      auditDisplay = 'UNEXCUSED';
    }

    return [
      `${index + 1}`,
      leaderName,
      deptName,
      expected,
      actualMode,
      joinTime,
      statusDisplay,
      auditDisplay,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - margin * 2, // Exactly 182mm on A4 portrait
    head: [
      ['#', 'Leader Name', 'Department', 'Expected', 'Actual Mode', 'Join Time', 'Status', 'Audit Status'],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.0,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [234, 88, 12], // #ea580c Hospital Orange
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 6 },
      1: { fontStyle: 'bold', halign: 'left', cellWidth: 35, cellPadding: { top: 2, bottom: 2, left: 6, right: 1.5 } },
      2: { halign: 'left', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 21, fontSize: 6.5 }, // Fits "PHYSICAL" on one line without any wrap
      4: { halign: 'center', cellWidth: 21 },
      5: { halign: 'center', cellWidth: 17 },
      6: { halign: 'center', cellWidth: 35 },
      7: { halign: 'center', cellWidth: 23 },
    },
    didDrawCell: (data) => {
      // Embed official circular leader profile logo in Leader Name column (centered vertically in every row)
      if (data.section === 'body' && data.column.index === 1) {
        try {
          const iconSize = 3.6;
          const iconX = data.cell.x + 1.2;
          const iconY = data.cell.y + (data.cell.height - iconSize) / 2;
          doc.addImage(defaultLeaderAvatarBase64, 'JPEG', iconX, iconY, iconSize, iconSize);
        } catch {}
      }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const val = String(tableRows[data.row.index]?.[6] || '');
        const audit = String(tableRows[data.row.index]?.[7] || '');

        // Row background tinting according to user rules
        if (val.includes('Present') || audit === 'APPROVED' || audit === 'ADMIN MANUAL') {
          data.cell.styles.fillColor = [240, 253, 244]; // Soft emerald tint
        } else if (val.includes('Informed Late') || (val.includes('Late') && !val.includes('No Inform'))) {
          data.cell.styles.fillColor = [254, 249, 195]; // Soft amber tint
        } else if (val.includes('No Inform') || val.includes('Late (No Inform)')) {
          data.cell.styles.fillColor = [255, 241, 242]; // Soft rose tint
        } else if (val.includes('Absent') || audit.includes('UNEXCUSED')) {
          data.cell.styles.fillColor = [254, 226, 226]; // Soft red alert tint
        } else if (val.includes('Leave') || audit === 'EXCUSED') {
          data.cell.styles.fillColor = [245, 243, 255]; // Soft purple tint
        } else if (val.includes('Weekly Off') || val.includes('Holiday')) {
          data.cell.styles.fillColor = [248, 250, 252]; // Soft slate
        }

        // Leader Name text coloring
        if (data.column.index === 1) {
          if (val.includes('Absent') || audit.includes('UNEXCUSED')) {
            data.cell.styles.textColor = [185, 28, 28]; // Red name for absent without info
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Present') || audit === 'APPROVED' || audit === 'ADMIN MANUAL') {
            data.cell.styles.textColor = [4, 120, 87]; // Green name for present
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Status & Audit Status text coloring
        if (data.column.index === 6 || data.column.index === 7) {
          if (val.includes('Present') || audit === 'APPROVED' || audit === 'ADMIN MANUAL') {
            data.cell.styles.textColor = [22, 163, 74]; // Emerald Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Informed Late')) {
            data.cell.styles.textColor = [180, 83, 9]; // Amber Orange
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('No Inform')) {
            data.cell.styles.textColor = [190, 18, 60]; // Rose Red
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Absent') || audit.includes('UNEXCUSED')) {
            data.cell.styles.textColor = [185, 28, 28]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Leave') || audit === 'EXCUSED') {
            data.cell.styles.textColor = [124, 58, 237]; // Purple
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  // Callout: Absenteeism / Follow-Up List
  let afterTableY = (doc as any).lastAutoTable?.finalY || 200;
  if (afterTableY > 230) {
    doc.addPage();
    afterTableY = 20;
  }

  const absentees = isMeetingOff ? [] : records.filter(
    (r) =>
      r.status !== 'EXCUSED' &&
      !r.admin_verified_attendance &&
      r.verification_status !== 'VERIFIED' &&
      r.status !== 'PRESENT' &&
      r.status !== 'LEAVE' &&
      r.status !== 'INFORMED_ABSENT' &&
      (r.status === 'ABSENT' || r.verification_status === 'REJECTED' || (r.status === 'PENDING' && r.selected_mode === 'NONE'))
  );

  afterTableY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(isMeetingOff ? 71 : 225, isMeetingOff ? 85 : 29, isMeetingOff ? 105 : 72);
  doc.text(`2. ACTION REQUIRED: UNREPORTED ABSENT LEADERS (${absentees.length})`, margin, afterTableY);

  afterTableY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  if (isMeetingOff) {
    doc.setTextColor(30, 41, 59);
    doc.text('[OFFICIAL WEEKLY OFF / HOLIDAY] Standup is paused on off days. Zero absentees recorded.', margin, afterTableY);
    afterTableY += 6;
  } else if (absentees.length === 0) {
    doc.setTextColor(22, 163, 74);
    doc.text('[100% COMPLIANCE] All registered department heads participated and verified.', margin, afterTableY);
    afterTableY += 6;
  } else {
    const absenteeList = absentees
      .map((r) => `${r.leader?.full_name} (${r.leader?.department?.name || 'Dept'})`)
      .join(', ');
    const splitText = doc.splitTextToSize(absenteeList, pageWidth - margin * 2);
    doc.text(splitText, margin, afterTableY);
    afterTableY += splitText.length * 4 + 4;
  }

  // 6. Executive Signatures Block
  let sigY = Math.max(afterTableY + 8, 255);
  if (sigY > 265) {
    doc.addPage();
    sigY = 30;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, sigY - 4, pageWidth - margin, sigY - 4);

  const sigColWidth = (pageWidth - margin * 2) / 3;

  // Column 1: DOM Administrator
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Prepared by:', margin, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DOM Operations Administrator', margin, sigY + 4);
  doc.text('SBH Group of Hospital, Raipur', margin, sigY + 8);

  // Column 2: Medical Superintendent
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Verified by:', margin + sigColWidth, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Medical Superintendent / COO', margin + sigColWidth, sigY + 4);
  doc.text('Clinical Administration', margin + sigColWidth, sigY + 8);

  // Column 3: Director Sir
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Submitted to:', margin + sigColWidth * 2, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(234, 88, 12);
  doc.text(settings.director_name || 'Director Sir', margin + sigColWidth * 2, sigY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Hospital Board of Directors', margin + sigColWidth * 2, sigY + 8);

  // Bottom Security Watermark
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Confidential Hospital Operational Intelligence Document — For Internal Clinical & Administrative Governance Only',
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  // Apply Subtle Hospital Watermark Across All Pages
  addHospitalLogoWatermark(doc);

  return doc;
}

// -------------------------------------------------------------
// MONTHLY LEADERSHIP AUDIT & ABSENTEEISM PDF
// -------------------------------------------------------------
export function generateMonthlyAuditPdf(
  monthYearStr: string, // e.g. "October 2026"
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Brand Bars
  doc.setFillColor(147, 51, 234); // #9333ea Purple for Monthly MOM
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(234, 88, 12); // Orange accent
  doc.rect(0, 5, pageWidth, 2, 'F');

  // Official Hospital Logo & Header
  try {
    doc.addImage(sbhLogoBase64, 'PNG', margin, 9, 38, 10);
  } catch (e) {
    // fallback
  }

  const textStartX = margin + 41;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SBH GROUP OF HOSPITALS, RAIPUR', textStartX, 13);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Monthly MOM & Comprehensive Attendance Absenteeism Audit', textStartX, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(147, 51, 234);
  doc.text('MONTHLY LEADERSHIP AUDIT', pageWidth - margin, 13, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Audit Period: ${monthYearStr}`, pageWidth - margin, 18, { align: 'right' });

  let currentY = 22;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // Aggregate monthly stats for each leader
  const leaderStats = leaders.map((lead) => {
    const leadRecords = records.filter((r) => r.leader_id === lead.id);
    const totalScheduled = leadRecords.length;
    const attended = leadRecords.filter(
      (r) => r.status === 'PRESENT' || (r.selected_mode === 'PHYSICAL' && r.admin_verified_attendance)
    ).length;
    const leave = leadRecords.filter((r) => r.status === 'LEAVE').length;
    const missed = leadRecords.filter(
      (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
    ).length;
    const effective = totalScheduled - leave;
    const rate = effective > 0 ? Math.round((attended / effective) * 100) : totalScheduled > 0 ? 100 : 0;

    return {
      lead,
      totalScheduled,
      attended,
      leave,
      missed,
      rate,
    };
  });

  const totalMeetings = Math.max(...leaderStats.map((s) => s.totalScheduled), 0);
  const totalAttendedAll = leaderStats.reduce((sum, s) => sum + s.attended, 0);
  const totalMissedAll = leaderStats.reduce((sum, s) => sum + s.missed, 0);
  const avgCompliance =
    leaderStats.length > 0
      ? Math.round(leaderStats.reduce((sum, s) => sum + s.rate, 0) / leaderStats.length)
      : 0;

  // 4 Metric cards
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const kpis = [
    { title: 'MONTHLY SESSIONS', val: `${totalMeetings}`, sub: 'DOM + WOM + MOM', bg: [243, 232, 255], text: [126, 34, 206] },
    { title: 'AVG COMPLIANCE', val: `${avgCompliance}%`, sub: 'Hospital Benchmark', bg: [236, 253, 245], text: [22, 163, 74] },
    { title: 'TOTAL ABSENCES', val: `${totalMissedAll}`, sub: 'Across All Departments', bg: [255, 241, 242], text: [225, 29, 72] },
    { title: 'LEADERS AUDITED', val: `${leaders.length}`, sub: '24 Departments', bg: [254, 249, 195], text: [161, 98, 7] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 4);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(cardX, currentY, cardWidth, 18, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, 18, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, cardX + 3, currentY + 4.5);

    doc.setFontSize(11);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, cardX + 3, currentY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, cardX + 3, currentY + 15);
  });

  currentY += 24;

  // Star Performers Table (Best Attendance)
  const topPerformers = leaderStats.filter((s) => s.rate >= 90).sort((a, b) => b.rate - a.rate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 163, 74);
  doc.text(`1. TOP COMPLIANT LEADERS (>= 90% ATTENDANCE) — ${topPerformers.length}`, margin, currentY);

  currentY += 2;
  const topRows = topPerformers.map((item, idx) => [
    `${idx + 1}`,
    item.lead.full_name,
    item.lead.department?.name || 'Department',
    `${item.totalScheduled}`,
    `${item.attended}`,
    `${item.missed}`,
    `${item.leave}`,
    `${item.rate}%`,
    item.rate === 100 ? 'EXEMPLARY (100%)' : 'OUTSTANDING',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Leader Name', 'Department', 'Scheduled', 'Attended', 'Missed', 'Leave', 'Rate %', 'Rating']],
    body: topRows.length > 0 ? topRows : [['—', 'No leaders in this range', '—', '—', '—', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 40 },
      2: { cellWidth: 36 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 26 },
    },
  });

  // Absentees Table (Needs Attention)
  let afterTableY = (doc as any).lastAutoTable?.finalY || 140;
  if (afterTableY > 210) {
    doc.addPage();
    afterTableY = 20;
  }

  afterTableY += 8;
  const absentees = leaderStats.filter((s) => s.missed > 0).sort((a, b) => b.missed - a.missed);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72);
  doc.text(`2. CHRONIC ABSENTEEISM & MISSED MEETINGS AUDIT — ${absentees.length}`, margin, afterTableY);

  afterTableY += 2;
  const absRows = absentees.map((item, idx) => [
    `${idx + 1}`,
    item.lead.full_name,
    item.lead.department?.name || 'Department',
    `${item.totalScheduled}`,
    `${item.attended}`,
    `${item.missed}`,
    `${item.leave}`,
    `${item.rate}%`,
    item.missed >= 5 ? 'CRITICAL ATTENTION' : 'NOTICE ISSUED',
  ]);

  autoTable(doc, {
    startY: afterTableY,
    head: [['#', 'Leader Name', 'Department', 'Scheduled', 'Attended', 'Missed Days', 'Leave', 'Rate %', 'Action Status']],
    body: absRows.length > 0 ? absRows : [['—', 'Nil — No absences recorded for this month!', '—', '—', '—', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 40 },
      2: { cellWidth: 36 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 18 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 24 },
    },
  });

  // Apply Subtle Hospital Watermark Across All Pages
  addHospitalLogoWatermark(doc);

  return doc;
}

// -------------------------------------------------------------
// ANNUAL HOSPITAL ATTENDANCE AUDIT PDF (YEAR WISE)
// -------------------------------------------------------------
export function generateYearlyAuditPdf(
  year: number,
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Brand Bars
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(37, 99, 235); // Blue for Annual Audit
  doc.rect(0, 5, pageWidth, 2, 'F');

  // Official Hospital Logo & Header
  try {
    doc.addImage(sbhLogoBase64, 'PNG', margin, 9, 38, 10);
  } catch (e) {
    // fallback
  }

  const textStartX = margin + 41;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SBH GROUP OF HOSPITALS, RAIPUR', textStartX, 13);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Annual Hospital Attendance Audit & Departmental Compliance (${year})`, textStartX, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(37, 99, 235);
  doc.text(`ANNUAL AUDIT ${year}`, pageWidth - margin, 13, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cadence: DOM • WOM • MOM`, pageWidth - margin, 18, { align: 'right' });

  let currentY = 22;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // Month-by-Month Annual Breakdown
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthRows = monthNames.map((monthName, mIdx) => {
    const padMonth = String(mIdx + 1).padStart(2, '0');
    const monthPrefix = `${year}-${padMonth}`;
    const mRecs = records.filter((r) => r.meeting_date?.startsWith(monthPrefix));
    const domCount = mRecs.filter((r) => r.meeting_frequency === 'DAILY' || r.cadence === 'DOM').length;
    const womCount = mRecs.filter((r) => r.meeting_frequency === 'WEEKLY' || r.cadence === 'WOM').length;
    const momCount = mRecs.filter((r) => r.meeting_frequency === 'MONTHLY' || r.cadence === 'MOM').length;
    const present = mRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;
    const absent = mRecs.filter((r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')).length;
    const total = mRecs.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return [
      monthName,
      `${domCount}`,
      `${womCount}`,
      `${momCount}`,
      `${total}`,
      `${present}`,
      `${absent}`,
      total > 0 ? `${rate}%` : 'N/A',
      rate >= 85 ? 'HEALTHY' : total > 0 ? 'NEEDS ATTENTION' : 'SCHEDULED',
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. MONTH-BY-MONTH AUDIT BREAKDOWN (${year})`, margin, currentY);

  currentY += 2;
  autoTable(doc, {
    startY: currentY,
    head: [['Month', 'DOM', 'WOM', 'MOM', 'Total Logs', 'Attended', 'Missed', 'Rate %', 'Compliance Health']],
    body: monthRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      8: { halign: 'center', cellWidth: 32 },
    },
  });

  // Apply Subtle Hospital Watermark Across All Pages
  addHospitalLogoWatermark(doc);

  return doc;
}

// Helper Export functions
export function downloadDirectorPdf(
  meeting: MeetingSchedule,
  records: AttendanceRecord[],
  settings: AppSettings
) {
  const doc = generateDirectorPdf(meeting, records, settings);
  const cadenceCode = meeting.cadence || (meeting.frequency === 'MONTHLY' ? 'MOM' : meeting.frequency === 'WEEKLY' ? 'WOM' : 'DOM');
  const filename = `SBH_${cadenceCode}_Report_${meeting.meeting_date}.pdf`;
  doc.save(filename);
}

export function getDirectorPdfBase64(
  meeting: MeetingSchedule,
  records: AttendanceRecord[],
  settings: AppSettings
): { base64: string; filename: string } {
  const doc = generateDirectorPdf(meeting, records, settings);
  const cadenceCode = meeting.cadence || (meeting.frequency === 'MONTHLY' ? 'MOM' : meeting.frequency === 'WEEKLY' ? 'WOM' : 'DOM');
  const filename = `SBH_${cadenceCode}_Report_${meeting.meeting_date}.pdf`;
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return { base64, filename };
}

export function openDirectorPdfInNewTab(
  meeting: MeetingSchedule,
  records: AttendanceRecord[],
  settings: AppSettings
) {
  const doc = generateDirectorPdf(meeting, records, settings);
  const pdfBlobUrl = doc.output('bloburl');
  window.open(pdfBlobUrl as unknown as string, '_blank');
}

export function downloadMonthlyAuditPdf(
  monthYearStr: string,
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
) {
  const doc = generateMonthlyAuditPdf(monthYearStr, leaders, records, settings);
  doc.save(`SBH_MOM_Monthly_Audit_${monthYearStr.replace(/\s+/g, '_')}.pdf`);
}

export function downloadYearlyAuditPdf(
  year: number,
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
) {
  const doc = generateYearlyAuditPdf(year, leaders, records, settings);
  doc.save(`SBH_Annual_Attendance_Audit_${year}.pdf`);
}
