import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MeetingSchedule, AttendanceRecord, AppSettings, Leader, Department } from '../types/database';
import { sbhLogoBase64 } from '../assets/logoBase64';
import { defaultLeaderAvatarBase64 } from '../assets/defaultLeaderAvatarBase64';
import { formatLateDuration, formatToIndianDate, calculateMeetingDuration } from './meetingUtils';

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
  const durationInfo = calculateMeetingDuration(meeting.scheduled_time || '10:00 AM', meeting.closed_at || new Date());
  currentY += 7;
  const bannerH = 26;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, bannerH, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, bannerH, 3, 3, 'S');

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
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${formatToIndianDate(meeting.meeting_date)} (${formattedDate})   |   Start: ${durationInfo.startTimeFormatted}   |   Concluded: ${durationInfo.endTimeFormatted}`, margin + 4, currentY + 11.5);
  doc.text(`Cadence: ${cadenceCode} (${meeting.frequency})   |   Total Meeting Duration: ${durationInfo.durationFormatted}   |   Venue: ${settings.conference_room_name}`, margin + 4, currentY + 16.5);
  doc.text(`Official Portal: https://sbhdom.vercel.app   |   Verified by Operations Command   |   Director Sign-off`, margin + 4, currentY + 21.5);

  currentY += bannerH + 4;

  // 4. Executive Summary KPI Metric Cards
  const isDirector = (l?: any) =>
    l?.role === 'DIRECTOR' || l?.full_name?.toLowerCase().includes('director') || l?.id === '905b6cf2-0e49-40b1-aa7c-828fe88a55ad';

  const directorAttended = records.find((r) => isDirector(r.leader) && (r.check_in_at || r.status === 'PRESENT'));
  const totalLeaders = records.filter((r) => !isDirector(r.leader)).length;
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

  if (directorAttended) {
    const dirMode = directorAttended.selected_mode === 'PHYSICAL' ? 'In-Person (Conference Room, 5th Floor)' : 'Virtually via Google Meet';
    const dirTime = directorAttended.check_in_at
      ? new Date(directorAttended.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : (directorAttended as any).join_time || '10:00 AM';

    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 6.5, 1.5, 1.5, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 6.5, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9);
    doc.text(`EXECUTIVE LEADERSHIP ATTENDANCE: Director Sir  —  Joined ${dirMode} at ${dirTime} IST`, margin + 3, currentY + 4.5);
    currentY += 8.5;
  }

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
    if (rec.selected_mode === 'VIRTUAL') {
      actualMode = rec.evidence_source === 'ADMIN_MANUAL' ? 'Virtual (Admin)' : 'Virtual (Meet)';
    } else if (rec.selected_mode === 'PHYSICAL') {
      actualMode = rec.evidence_source === 'ADMIN_MANUAL' ? 'In-Person (Admin)' : 'In-Person (Room)';
    } else if (rec.evidence_source === 'ADMIN_MANUAL') {
      actualMode = 'Admin Manual';
    }

    let joinTime = '—';
    if (rec.check_in_at) {
      try {
        const d = new Date(rec.check_in_at);
        joinTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      } catch {
        joinTime = rec.check_in_at;
      }
    } else if ((rec as any).join_time) {
      joinTime = (rec as any).join_time;
    }

    // Parse meeting scheduled start (default 10:00 AM = 600 mins)
    let scheduledStartMinutes = 600;
    try {
      const sMatch = (meeting.scheduled_time || '10:00 AM').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (sMatch) {
        let sh = parseInt(sMatch[1], 10);
        const sm = parseInt(sMatch[2], 10);
        const sMer = sMatch[3] ? sMatch[3].toUpperCase() : 'AM';
        if (sMer === 'PM' && sh < 12) sh += 12;
        if (sMer === 'AM' && sh === 12) sh = 0;
        scheduledStartMinutes = sh * 60 + sm;
      }
    } catch {}

    // Evaluate if leader's arrival time was late (> 5 mins past scheduled start)
    let lateMinsCalculated = rec.late_minutes || 0;
    if (joinTime && joinTime !== '—') {
      const jMatch = joinTime.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
      if (jMatch) {
        let jh = parseInt(jMatch[1], 10);
        const jm = parseInt(jMatch[2], 10);
        const jMer = jMatch[3] ? jMatch[3].toUpperCase() : null;
        if (jMer === 'PM' && jh < 12) jh += 12;
        if (jMer === 'AM' && jh === 12) jh = 0;
        const totalMins = jh * 60 + jm;
        
        let diff = totalMins - scheduledStartMinutes;
        if (totalMins < 540) {
          // Check-in occurred after midnight / early morning hours (e.g. 12:04 AM)
          diff = (1440 - scheduledStartMinutes) + totalMins;
        }

        if (diff > 5) {
          if (lateMinsCalculated <= 0) {
            lateMinsCalculated = diff;
          }
        }
      }
    }

    const hasJoined =
      rec.status === 'PRESENT' ||
      rec.admin_verified_attendance ||
      Boolean(rec.check_in_at) ||
      Boolean((rec as any).join_time);

    const isLateArrival =
      lateMinsCalculated > 0 ||
      (rec.late_minutes && rec.late_minutes > 0) ||
      rec.status === 'INFORMED_LATE' ||
      Boolean(rec.verification_note?.includes('Late'));

    let statusDisplay = 'Absent (No Inform)';
    let auditDisplay = 'UNEXCUSED';

    if (isMeetingOff && !hasJoined) {
      statusDisplay = rec.verification_note || (isSundayMeeting ? 'Sunday Weekly Off' : 'Holiday / No DOM');
      auditDisplay = 'EXCUSED';
    } else if (rec.status === 'LEAVE' || (rec.status === 'INFORMED_ABSENT' && rec.informed_confirmed)) {
      const channel = rec.informed_to_person?.toLowerCase().includes('whatsapp') ? 'WhatsApp Group' : (rec.informed_to_person || 'Admin');
      statusDisplay = `Approved Leave (${channel})`;
      auditDisplay = 'EXCUSED';
    } else if (rec.status === 'INFORMED_ABSENT' && !rec.informed_confirmed) {
      const channel = rec.informed_to_person?.toLowerCase().includes('whatsapp') ? 'WhatsApp Group' : (rec.informed_to_person || 'Awaiting Admin');
      statusDisplay = `Informed Leave (${channel})`;
      auditDisplay = 'PENDING APPROVAL';
    } else if (hasJoined) {
      const isAdminMarked = rec.evidence_source === 'ADMIN_MANUAL' || rec.verification_note?.includes('Marked Present by Admin');
      const isVirtual = rec.selected_mode === 'VIRTUAL';
      if (isLateArrival) {
        const lateLabel =
          lateMinsCalculated > 60
            ? `+${Math.floor(lateMinsCalculated / 60)}h ${lateMinsCalculated % 60}m Late`
            : lateMinsCalculated > 0
              ? `+${lateMinsCalculated}m Late`
              : 'Late';

        if (rec.status === 'INFORMED_LATE' || rec.verification_note?.includes('Informed')) {
          statusDisplay = isVirtual ? `Present (Virtual Informed Late: ${lateLabel})` : `Present (Informed Late: ${lateLabel})`;
        } else if (isAdminMarked) {
          statusDisplay = isVirtual ? `Present (Virtual Admin: ${lateLabel})` : `Present (Admin Late: ${lateLabel})`;
        } else {
          statusDisplay = isVirtual ? `Present (Virtual Late: ${lateLabel})` : `Present (Late: ${lateLabel})`;
        }
        auditDisplay = isAdminMarked ? 'ADMIN MANUAL' : 'APPROVED';
      } else {
        statusDisplay = isVirtual
          ? (isAdminMarked ? 'Present (Virtual Admin)' : 'Present (Virtual On-Time)')
          : (isAdminMarked ? 'Present (Admin Marked)' : 'Present (On-Time)');
        auditDisplay = isAdminMarked ? 'ADMIN MANUAL' : 'APPROVED';
      }
    } else if (rec.late_expired || (rec.status === 'INFORMED_LATE' && !hasJoined)) {
      statusDisplay = `Absent (Promised +${rec.committed_late_minutes || rec.late_minutes || 10}m, Failed to Join)`;
      auditDisplay = 'UNEXCUSED';
    } else if (rec.verification_status === 'REJECTED' || rec.verification_note?.includes('Disapproved') || rec.verification_note?.includes('No Inform')) {
      statusDisplay = 'Absent (No Inform)';
      auditDisplay = 'UNEXCUSED / REJECTED';
    } else {
      statusDisplay = 'Absent (No Inform)';
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
      1: { fontStyle: 'bold', halign: 'left', cellWidth: 35, cellPadding: { top: 2, bottom: 2, left: 5.4, right: 1.5 } },
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
          const iconSize = 3.2;
          const iconX = data.cell.x + 1.2;
          const iconY = data.cell.y + Math.max(0.8, (data.cell.height - iconSize) / 2);
          doc.addImage(defaultLeaderAvatarBase64, 'JPEG', iconX, iconY, iconSize, iconSize);
        } catch {}
      }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const val = String(tableRows[data.row.index]?.[6] || '');
        const audit = String(tableRows[data.row.index]?.[7] || '');

        // 1. Row background tinting according to user rules
        if (val.includes('Absent') || audit.includes('UNEXCUSED') || audit.includes('REJECTED') || val.includes('No Inform')) {
          data.cell.styles.fillColor = [254, 226, 226]; // Soft red alert tint (#fee2e2)
        } else if (val.includes('Leave') || audit === 'EXCUSED') {
          data.cell.styles.fillColor = [245, 243, 255]; // Soft purple tint (#faf5ff)
        } else if (val.includes('Late') || val.includes('Informed Late')) {
          data.cell.styles.fillColor = [254, 243, 199]; // Soft amber / orange tint (#fef3c7)
        } else if (val.includes('Present') || audit === 'APPROVED' || audit === 'ADMIN MANUAL') {
          data.cell.styles.fillColor = [240, 253, 244]; // Soft emerald green tint (#f0fdf4)
        } else if (val.includes('Weekly Off') || val.includes('Holiday')) {
          data.cell.styles.fillColor = [248, 250, 252]; // Soft slate
        }

        // 2. Leader Name text coloring (column 1)
        if (data.column.index === 1) {
          data.cell.styles.fontStyle = 'bold';
          if (val.includes('Absent') || audit.includes('UNEXCUSED') || audit.includes('REJECTED') || val.includes('No Inform')) {
            data.cell.styles.textColor = [185, 28, 28]; // Red name for absent
          } else if (val.includes('Leave') || audit === 'EXCUSED') {
            data.cell.styles.textColor = [124, 58, 237]; // Purple name for leave
          } else if (val.includes('Late') || val.includes('Informed Late')) {
            data.cell.styles.textColor = [180, 83, 9]; // Amber Orange for late
          } else if (val.includes('Present') || audit === 'APPROVED' || audit === 'ADMIN MANUAL') {
            data.cell.styles.textColor = [4, 120, 87]; // Emerald green for on-time present
          } else {
            data.cell.styles.textColor = [100, 116, 139]; // Slate
          }
        }

        // 3. Status & Audit Status text coloring (columns 6 and 7)
        if (data.column.index === 6 || data.column.index === 7) {
          data.cell.styles.fontStyle = 'bold';
          if (val.includes('Absent') || audit.includes('UNEXCUSED') || audit.includes('REJECTED') || val.includes('No Inform')) {
            data.cell.styles.textColor = [185, 28, 28]; // Red
          } else if (val.includes('Leave') || audit === 'EXCUSED') {
            data.cell.styles.textColor = [124, 58, 237]; // Purple
          } else if (val.includes('Late') || val.includes('Informed Late')) {
            data.cell.styles.textColor = [180, 83, 9]; // Amber Orange
          } else if (val.includes('Present') || audit === 'APPROVED' || audit === 'ADMIN MANUAL') {
            data.cell.styles.textColor = [22, 163, 74]; // Emerald Green
          } else {
            data.cell.styles.textColor = [100, 116, 139]; // Slate
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
      !isDirector(r.leader) &&
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
// WEEKLY LEADERSHIP AUDIT & COMPLIANCE PDF
// -------------------------------------------------------------
export function generateWeeklyAuditPdf(
  weekRangeStr: string, // e.g. "23 Nov 2026 – 28 Nov 2026"
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Header Brand Bars
  doc.setFillColor(13, 148, 136); // Teal for Weekly
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(234, 88, 12);
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
  doc.text('Weekly Leadership Attendance & Operational Cadence Audit', textStartX, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(13, 148, 136);
  doc.text('WEEKLY AUDIT REPORT', pageWidth - margin, 13, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${weekRangeStr}`, pageWidth - margin, 18, { align: 'right' });

  let currentY = 22;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // Aggregate stats for each leader
  const leaderStats = leaders.map((lead) => {
    const leadRecords = records.filter((r) => r.leader_id === lead.id);
    const totalScheduled = leadRecords.length;
    const attended = leadRecords.filter(
      (r) => r.status === 'PRESENT' || (r.selected_mode === 'PHYSICAL' && r.admin_verified_attendance)
    ).length;
    const late = leadRecords.filter(
      (r) => (r.late_minutes && r.late_minutes > 0) || r.status === 'INFORMED_LATE'
    ).length;
    const leave = leadRecords.filter((r) => r.status === 'LEAVE').length;
    const missed = leadRecords.filter(
      (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
    ).length;

    const domRecs = leadRecords.filter((r) => r.cadence === 'DOM' || r.meeting_frequency === 'DAILY');
    const domSched = domRecs.length;
    const domAtt = domRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const womRecs = leadRecords.filter((r) => r.cadence === 'WOM' || r.meeting_frequency === 'WEEKLY');
    const womSched = womRecs.length;
    const womAtt = womRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const effective = totalScheduled - leave;
    const rate = effective > 0 ? Math.round((attended / effective) * 100) : totalScheduled > 0 ? 100 : 0;

    return {
      lead,
      totalScheduled,
      attended,
      late,
      leave,
      missed,
      domSched,
      domAtt,
      womSched,
      womAtt,
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
    { title: 'WEEKLY SESSIONS', val: `${totalMeetings}`, sub: 'DOM + WOM', bg: [204, 251, 241], text: [13, 148, 136] },
    { title: 'AVG COMPLIANCE', val: `${avgCompliance}%`, sub: 'Hospital Benchmark', bg: [236, 253, 245], text: [22, 163, 74] },
    { title: 'TOTAL ABSENCES', val: `${totalMissedAll}`, sub: 'Across Departments', bg: [255, 241, 242], text: [225, 29, 72] },
    { title: 'LEADERS AUDITED', val: `${leaders.length}`, sub: 'Executive Roster', bg: [254, 249, 195], text: [161, 98, 7] },
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

  // Complete Leader Table
  const sortedStats = [...leaderStats].sort((a, b) => b.rate - a.rate);
  const rows = sortedStats.map((item, idx) => [
    `${idx + 1}`,
    item.lead.full_name,
    item.lead.department?.name || 'Department',
    `${item.totalScheduled}`,
    `${item.attended}`,
    `${item.late}`,
    `${item.missed}`,
    `${item.domAtt}/${item.domSched}`,
    `${item.womAtt}/${item.womSched}`,
    `${item.rate}%`,
    item.rate >= 90 ? 'EXEMPLARY' : item.rate >= 75 ? 'SATISFACTORY' : 'NEEDS ACTION',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Leader Name', 'Department', 'Sched', 'Attended', 'Late', 'Absent', 'DOM', 'WOM', 'Rate %', 'Compliance Status']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { fontStyle: 'bold', cellWidth: 38 },
      2: { cellWidth: 30 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 12 },
      7: { halign: 'center', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 16 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      10: { halign: 'center', cellWidth: 25 },
    },
  });

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
  const margin = 12;

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
    const late = leadRecords.filter(
      (r) => (r.late_minutes && r.late_minutes > 0) || r.status === 'INFORMED_LATE'
    ).length;
    const leave = leadRecords.filter((r) => r.status === 'LEAVE').length;
    const missed = leadRecords.filter(
      (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
    ).length;

    const domRecs = leadRecords.filter((r) => r.cadence === 'DOM' || r.meeting_frequency === 'DAILY');
    const domSched = domRecs.length;
    const domAtt = domRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const womRecs = leadRecords.filter((r) => r.cadence === 'WOM' || r.meeting_frequency === 'WEEKLY');
    const womSched = womRecs.length;
    const womAtt = womRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const momRecs = leadRecords.filter((r) => r.cadence === 'MOM' || r.meeting_frequency === 'MONTHLY');
    const momSched = momRecs.length;
    const momAtt = momRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const effective = totalScheduled - leave;
    const rate = effective > 0 ? Math.round((attended / effective) * 100) : totalScheduled > 0 ? 100 : 0;

    return {
      lead,
      totalScheduled,
      attended,
      late,
      leave,
      missed,
      domSched,
      domAtt,
      womSched,
      womAtt,
      momSched,
      momAtt,
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
    { title: 'TOTAL ABSENCES', val: `${totalMissedAll}`, sub: 'Across Departments', bg: [255, 241, 242], text: [225, 29, 72] },
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

  // Complete Leader Roster Table
  const sortedStats = [...leaderStats].sort((a, b) => b.rate - a.rate);
  const rows = sortedStats.map((item, idx) => [
    `${idx + 1}`,
    item.lead.full_name,
    item.lead.department?.name || 'Department',
    `${item.totalScheduled}`,
    `${item.attended}`,
    `${item.late}`,
    `${item.missed}`,
    `${item.domAtt}/${item.domSched}`,
    `${item.womAtt}/${item.womSched}`,
    `${item.momAtt}/${item.momSched}`,
    `${item.rate}%`,
    item.rate >= 90 ? 'EXEMPLARY' : item.rate >= 75 ? 'SATISFACTORY' : 'NEEDS ACTION',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Leader Name', 'Department', 'Sched', 'Attended', 'Late', 'Absent', 'DOM', 'WOM', 'MOM', 'Rate %', 'Compliance Status']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 6.8, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { fontStyle: 'bold', cellWidth: 35 },
      2: { cellWidth: 28 },
      3: { halign: 'center', cellWidth: 11 },
      4: { halign: 'center', cellWidth: 13 },
      5: { halign: 'center', cellWidth: 11 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 11 },
      7: { halign: 'center', cellWidth: 15 },
      8: { halign: 'center', cellWidth: 15 },
      9: { halign: 'center', cellWidth: 15 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 13 },
      11: { halign: 'center', cellWidth: 22 },
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

  // Section 2: Complete Leader Annual Compliance Roster
  let afterAnnualTableY = (doc as any).lastAutoTable?.finalY || 140;
  if (afterAnnualTableY > 190) {
    doc.addPage();
    afterAnnualTableY = 20;
  } else {
    afterAnnualTableY += 8;
  }

  const annualStats = leaders.map((lead) => {
    const yRecs = records.filter((r) => r.leader_id === lead.id && r.meeting_date?.startsWith(`${year}`));
    const totalScheduled = yRecs.length;
    const attended = yRecs.filter((r) => r.status === 'PRESENT' || (r.selected_mode === 'PHYSICAL' && r.admin_verified_attendance)).length;
    const late = yRecs.filter((r) => (r.late_minutes && r.late_minutes > 0) || r.status === 'INFORMED_LATE').length;
    const leave = yRecs.filter((r) => r.status === 'LEAVE').length;
    const missed = yRecs.filter((r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')).length;

    const domRecs = yRecs.filter((r) => r.cadence === 'DOM' || r.meeting_frequency === 'DAILY');
    const domSched = domRecs.length;
    const domAtt = domRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const womRecs = yRecs.filter((r) => r.cadence === 'WOM' || r.meeting_frequency === 'WEEKLY');
    const womSched = womRecs.length;
    const womAtt = womRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const momRecs = yRecs.filter((r) => r.cadence === 'MOM' || r.meeting_frequency === 'MONTHLY');
    const momSched = momRecs.length;
    const momAtt = momRecs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;

    const effective = totalScheduled - leave;
    const rate = effective > 0 ? Math.round((attended / effective) * 100) : totalScheduled > 0 ? 100 : 0;

    return {
      lead,
      totalScheduled,
      attended,
      late,
      missed,
      domSched,
      domAtt,
      womSched,
      womAtt,
      momSched,
      momAtt,
      rate,
    };
  }).sort((a, b) => b.rate - a.rate);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. ANNUAL LEADERSHIP ATTENDANCE AUDIT ROSTER (${year})`, margin, afterAnnualTableY);

  afterAnnualTableY += 2;
  const annualLeaderRows = annualStats.map((item, idx) => [
    `${idx + 1}`,
    item.lead.full_name,
    item.lead.department?.name || 'Department',
    `${item.totalScheduled}`,
    `${item.attended}`,
    `${item.late}`,
    `${item.missed}`,
    `${item.domAtt}/${item.domSched}`,
    `${item.womAtt}/${item.womSched}`,
    `${item.momAtt}/${item.momSched}`,
    `${item.rate}%`,
    item.rate >= 90 ? 'EXEMPLARY' : item.rate >= 75 ? 'SATISFACTORY' : 'NEEDS ACTION',
  ]);

  autoTable(doc, {
    startY: afterAnnualTableY,
    head: [['#', 'Leader Name', 'Department', 'Sched', 'Attended', 'Late', 'Absent', 'DOM', 'WOM', 'MOM', 'Rate %', 'Status']],
    body: annualLeaderRows,
    theme: 'grid',
    styles: { fontSize: 6.8, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { fontStyle: 'bold', cellWidth: 35 },
      2: { cellWidth: 28 },
      3: { halign: 'center', cellWidth: 11 },
      4: { halign: 'center', cellWidth: 13 },
      5: { halign: 'center', cellWidth: 11 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 11 },
      7: { halign: 'center', cellWidth: 15 },
      8: { halign: 'center', cellWidth: 15 },
      9: { halign: 'center', cellWidth: 15 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 13 },
      11: { halign: 'center', cellWidth: 22 },
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

export function downloadWeeklyAuditPdf(
  weekRangeStr: string,
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
) {
  const doc = generateWeeklyAuditPdf(weekRangeStr, leaders, records, settings);
  const cleanLabel = weekRangeStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`SBH_Weekly_Audit_${cleanLabel}.pdf`);
}

export function getWeeklyAuditPdfBase64(
  weekRangeStr: string,
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
): { base64: string; filename: string } {
  const doc = generateWeeklyAuditPdf(weekRangeStr, leaders, records, settings);
  const cleanLabel = weekRangeStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `SBH_Weekly_Audit_${cleanLabel}.pdf`;
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return { base64, filename };
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

export function getMonthlyAuditPdfBase64(
  monthYearStr: string,
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
): { base64: string; filename: string } {
  const doc = generateMonthlyAuditPdf(monthYearStr, leaders, records, settings);
  const cleanLabel = monthYearStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `SBH_Monthly_Audit_${cleanLabel}.pdf`;
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return { base64, filename };
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

export function getYearlyAuditPdfBase64(
  year: number,
  leaders: Leader[],
  records: AttendanceRecord[],
  settings: AppSettings
): { base64: string; filename: string } {
  const doc = generateYearlyAuditPdf(year, leaders, records, settings);
  const filename = `SBH_Annual_Audit_${year}.pdf`;
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return { base64, filename };
}
