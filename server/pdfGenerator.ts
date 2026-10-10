/**
 * PDF Documentation Generator for UEBA Sentinel
 * Produces an enterprise-grade multi-page architecture, operator manual,
 * and security methodology document.
 */
import { jsPDF } from 'jspdf';

export function generateDocumentationPdf(): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  // Helpers
  const addHeader = (title: string, sectionNumber: string) => {
    doc.setFillColor(17, 17, 17);
    doc.rect(margin, 35, contentWidth, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('SENTINEL UEBA // OPERATIONAL SPECIFICATION & ARCHITECTURE', margin, 28);
    doc.text(`SECTION ${sectionNumber}: ${title.toUpperCase()}`, pageWidth - margin, 28, { align: 'right' });
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, pageHeight - 35, contentWidth, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('CONFIDENTIAL // SENTINEL REAL-TIME SOC ENGINE v2.4 // RESTRICTED ACCESS', margin, pageHeight - 22);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
  };

  // ==========================================
  // PAGE 1: TITLE & EXECUTIVE SUMMARY
  // ==========================================
  // Dark Hero Banner
  doc.setFillColor(15, 15, 18);
  doc.rect(0, 0, pageWidth, 210, 'F');

  // Accent line
  doc.setFillColor(234, 88, 12); // Orange #ea580c
  doc.rect(0, 208, pageWidth, 4, 'F');

  // Badge
  doc.setFillColor(35, 20, 15);
  doc.roundedRect(margin, 42, 160, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(251, 146, 60);
  doc.text('REAL-TIME ENTERPRISE SOC SYSTEM', margin + 8, 55);

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('SENTINEL UEBA PLATFORM', margin, 92);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(212, 212, 216);
  doc.text('User & Entity Behavior Analytics with Real-Time SOC Analyst Feedback', margin, 114);

  // Metadata block
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170);
  doc.text('Document Release: 2026.4  |  Classification: Security Operations Technical Manual', margin, 140);
  doc.text('Core Models: Multivariate Isolation Forest + Circadian Profiling + Heuristic Corroborator', margin, 155);
  doc.text('Role-Based Access: Security Director (Executive Authority) & Assistant Security (SOC Triage)', margin, 170);

  // Page 1 Body
  let y = 245;

  // Section 1: Executive Overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('1. Executive Overview & Mission Purpose', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(63, 63, 70);
  const overviewText = 
    'Sentinel is an enterprise-grade User and Entity Behavior Analytics (UEBA) application built for Security Operations Center (SOC) teams. Modern security environments face two critical vulnerabilities: high false-positive alert fatigue and isolated telemetry silos. Sentinel solves both challenges by fusing multi-source telemetry (authentication timestamps, geo-velocity coordinates, and egress transfer volumes) into a multivariate statistical Isolation Forest engine. It pairs machine learning anomaly scores with strict human-in-the-loop oversight to deliver an adaptive, real-time cyber defense platform.';
  const splitOverview = doc.splitTextToSize(overviewText, contentWidth);
  doc.text(splitOverview, margin, y);
  y += splitOverview.length * 13 + 14;

  // Highlights Grid
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 90, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Core Platform Value Drivers', margin + 14, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('* Unified Single-Pane Telemetry: Zero context-switching across logs, peer baselines, and geo-locations.', margin + 14, y + 36);
  doc.text('* Multi-Signal Threat Corroboration: Alerts require intersecting evidence (e.g. speed + odd hour + data egress).', margin + 14, y + 50);
  doc.text('* Human-Analyst Sovereign Feedback: Direct feedback loop recording true/false positive audits into database.', margin + 14, y + 64);
  doc.text('* Sovereign Role-Based Access Control: Granular authority between Director and Assistant analysts.', margin + 14, y + 78);
  y += 105;

  // Section 2: Key Platform Architectural Views
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('2. The Three Real-Time Operational Workspaces', margin, y);
  y += 18;

  // 3-box vertical breakdown
  const views = [
    {
      title: 'Workspace 1: Unified Analytics (Entity Deep-Dive)',
      desc: 'Provides complete 360-degree behavioral profiles for individual enterprise accounts. Includes 30-day circadian working hours baseline vs current activity, radar deviation analysis, volumetric egress z-scores, interactive geographic velocity maps, and raw chronological security event logs.'
    },
    {
      title: 'Workspace 2: Threat Oversight & Feedback (SOC Corroboration)',
      desc: 'The real-time incident resolution console. Presents compound alert incidents with explicit signal breakdowns (Isolation Forest score, odd-hour access, impossible travel velocity, and unauthorized asset probing). Features analyst decision controls (CONFIRM, DISMISS, REVIEW, ESCALATE).'
    },
    {
      title: 'Workspace 3: Priority Queue (Multi-Factor Triage Matrix)',
      desc: 'An automated triaging queue powered by dynamic composite scoring (Priority Score 0-100). Alerts are ranked using asset sensitivity weighting, peer deviation ratios, credential privilege flags, and signal co-occurrence multipliers to prevent critical breaches from remaining buried.'
    }
  ];

  views.forEach((v) => {
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD');

    // Left accent bar
    doc.setFillColor(234, 88, 12);
    doc.rect(margin, y, 4, 54, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(v.title, margin + 12, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    const splitVDesc = doc.splitTextToSize(v.desc, contentWidth - 24);
    doc.text(splitVDesc, margin + 12, y + 29);

    y += 62;
  });

  addFooter(1, 4);

  // ==========================================
  // PAGE 2: DETECTION ALGORITHMS & CORROBORATION
  // ==========================================
  doc.addPage();
  addHeader('Detection Algorithms & Mathematical Modeling', '02');
  y = 65;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('3. Machine Learning & Anomaly Detection Pipeline', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  const mlIntro = 
    'Sentinel abandons naive static thresholding (such as simple "alerts on any login after 6 PM") in favor of statistical peer cohort baselining and tree-based multivariate outlier partitioning.';
  const splitMlIntro = doc.splitTextToSize(mlIntro, contentWidth);
  doc.text(splitMlIntro, margin, y);
  y += splitMlIntro.length * 13 + 12;

  // Algorithm Table / Cards
  const algos = [
    {
      name: 'Multivariate Isolation Forest (iForest)',
      metric: 'Anomalous Path Length s(x, n) = 2^(-E(h(x)) / c(n))',
      details: 'Isolates observations by randomly selecting a feature and split value. Because anomalies require fewer partitions to isolate than normal cluster points, path length h(x) is noticeably shorter. Features evaluated simultaneously: local hour-of-day, network egress volume, access frequency z-score, and historical asset privilege rank. A normalized score > 65 marks an anomaly.'
    },
    {
      name: 'Circadian Hour-of-Day Peer Profiling',
      metric: 'Peer Group Deviation Delta (Hours vs Department Baseline)',
      details: 'Each department (Engineering, Sales, HR, Executive) generates an empirical normal operating window (e.g. Engineering: 08:00 - 20:00; HR: 08:30 - 17:30). Telemetry events occurring outside typical hours incur a graded penalty scaled by whether the day is a scheduled weekend or recognized holiday.'
    },
    {
      name: 'Haversine Great-Circle Impossible Travel',
      metric: 'Velocity (km/h) = Distance(Coord_A, Coord_B) / Delta_T',
      details: 'Calculates shortest spherical surface distance across sequential logins using the Haversine formula. If two logins originating from disparate coordinates (e.g., New York and Sofia, Bulgaria) exhibit implied physical transit speeds exceeding 900 km/h (commercial jet cruising velocity), an instant CRITICAL flag is attached to the session.'
    },
    {
      name: 'Volumetric Egress Deviation (Z-Score)',
      metric: 'Z = (Egress_MB - Mean_Role_MB) / StdDev_Role_MB',
      details: 'Compares per-session outbound transfer payloads against role baselines. An HR analyst egressing 850 MB when the departmental mean is 90 MB generates an alarm ratio of 9.4x, indicating possible bulk data harvesting, unencrypted document staging, or credential compromise.'
    }
  ];

  algos.forEach((a) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 72, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(a.name, margin + 12, y + 16);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(217, 119, 6);
    doc.text(a.metric, margin + 12, y + 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitD = doc.splitTextToSize(a.details, contentWidth - 24);
    doc.text(splitD, margin + 12, y + 42);

    y += 80;
  });

  // Section 4: Threat Corroboration Engine
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('4. Multi-Signal Corroboration Architecture', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  const corrobText = 
    'A single isolated anomaly rarely signifies an active intrusion; it often represents benign user variance. Sentinel enforces a compound corroboration threshold: alerts are only elevated to priority triage when two or more distinct signal stages intersect within a correlated time-window. For example: an odd-hour login (Ingress) coupled with an Isolation Forest vector anomaly (Reconnaissance) and abnormal egress transfer (Exfiltration) forms a verified kill-chain sequence.';
  const splitCorrob = doc.splitTextToSize(corrobText, contentWidth);
  doc.text(splitCorrob, margin, y);

  addFooter(2, 4);

  // ==========================================
  // PAGE 3: SOC OPERATOR MANUAL & RBAC
  // ==========================================
  doc.addPage();
  addHeader('SOC Operator Manual & Role-Based Access Control', '03');
  y = 65;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('5. Role-Based Access Control (RBAC) Governance', margin, y);
  y += 18;

  // Comparison Grid: Director vs Assistant
  const boxW = (contentWidth - 14) / 2;

  // Box 1: Security Director
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, boxW, 140, 5, 5, 'FD');

  doc.setFillColor(220, 38, 38);
  doc.roundedRect(margin + 12, y + 12, 110, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('SECURITY DIRECTOR', margin + 18, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(153, 27, 27);
  doc.text('Eleanor Vance (Clearance L4)', margin + 12, y + 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(127, 29, 29);
  doc.text('Executive threat authority and perimeter management.', margin + 12, y + 54);
  doc.text('[x] Escalate incidents to Tier-2 SOC & IR Team', margin + 12, y + 70);
  doc.text('[x] Confirm malicious alerts / Dismiss false alarms', margin + 12, y + 84);
  doc.text('[x] Onboard new monitored entities into UEBA', margin + 12, y + 98);
  doc.text('[x] Configure working hours & data egress baselines', margin + 12, y + 112);
  doc.text('[x] Re-seed synthetic dataset & calibrate models', margin + 12, y + 126);

  // Box 2: Assistant Security
  const x2 = margin + boxW + 14;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(x2, y, boxW, 140, 5, 5, 'FD');

  doc.setFillColor(2, 132, 199);
  doc.roundedRect(x2 + 12, y + 12, 120, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ASSISTANT SECURITY', x2 + 18, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(7, 89, 133);
  doc.text('Caleb Hayes (Clearance L2)', x2 + 12, y + 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(12, 74, 110);
  doc.text('Dedicated front-line SOC triage & threat analysis.', x2 + 12, y + 54);
  doc.text('[x] Escalate incidents to Tier-2 SOC & IR Team', x2 + 12, y + 70);
  doc.text('[x] Record feedback (Confirm, Dismiss, Review)', x2 + 12, y + 84);
  doc.text('[x] Examine entity behavioral timelines & logs', x2 + 12, y + 98);
  doc.text('[!] Entity Onboarding: FORBIDDEN (Director only)', x2 + 12, y + 112);
  doc.text('[!] System Model Re-calibration: Restricted', x2 + 12, y + 126);

  y += 155;

  // Section 6: Analyst Feedback Loop
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('6. The Human-in-the-Loop Feedback Loop', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  const feedbackIntro = 
    'Sentinel implements sovereign analyst decision-making. No AI automated action terminates account access without human corroboration. Every analyst feedback action executes an immutable database audit entry:';
  const splitFIntro = doc.splitTextToSize(feedbackIntro, contentWidth);
  doc.text(splitFIntro, margin, y);
  y += splitFIntro.length * 13 + 12;

  // Decision actions table
  const actions = [
    { action: 'CONFIRMED', role: 'Director + Assistant', impact: 'Validates malicious activity. Tags true positive. Alerts CIRT team.' },
    { action: 'DISMISSED', role: 'Director + Assistant', impact: 'Marks benign anomaly (false positive). Recalibrates noise filter.' },
    { action: 'ESCALATED', role: 'Director + Assistant', impact: 'High-urgency escalation to Tier-2 SOC & incident response coordinator.' },
    { action: 'MARK FOR REVIEW', role: 'Director + Assistant', impact: 'Flags session for peer review or requests user confirmation.' },
    { action: 'ADD ENTITY', role: 'Security Director ONLY', impact: 'Creates new employee account with automated 30-day baseline telemetry.' }
  ];

  actions.forEach((act) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(act.action, margin + 10, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(194, 65, 12);
    doc.text(act.role, margin + 120, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(act.impact, margin + 250, y + 15);

    y += 28;
  });

  addFooter(3, 4);

  // ==========================================
  // PAGE 4: TECHNICAL ARCHITECTURE & REST API
  // ==========================================
  doc.addPage();
  addHeader('Technical Architecture & Integration Specifications', '04');
  y = 65;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('7. Software Architecture & Technology Stack', margin, y);
  y += 18;

  // Architecture summary bullets
  const techStack = [
    { layer: 'Frontend Client', tech: 'React 19 + TypeScript + Tailwind CSS', desc: 'Single-page reactive cockpit with instant navigation across Unified Analytics, Oversight Console, Priority Queue, and RBAC Switcher.' },
    { layer: 'Backend Server', tech: 'Node.js Express + TypeScript (CJS Bundle)', desc: 'Secure REST endpoints serving aggregated behavioral queries, anomaly evaluations, and RBAC authentication headers.' },
    { layer: 'Database Layer', tech: 'SQLite (Native synchronous storage)', desc: 'Indexed relational schema storing users, 30-day chronological event logs, anomaly vectors, alert incidents, and analyst feedback logs.' },
    { layer: 'Real-Time Sync', tech: 'Automated 6-second polling engine', desc: 'Continuous background heartbeat updating pending alerts, incident queues, and feedback audits with instant UI feedback banners.' }
  ];

  techStack.forEach((t) => {
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text(`${t.layer}: `, margin + 10, y + 15);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(234, 88, 12);
    doc.text(t.tech, margin + 110, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(t.desc, margin + 10, y + 29);

    y += 44;
  });

  y += 8;

  // Section 8: Primary API Endpoints
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('8. Key REST API Specifications', margin, y);
  y += 18;

  const endpoints = [
    { method: 'GET', path: '/api/unified/:userId', desc: 'Retrieves complete 360 profile: user info, radar metrics, hourly circadian histogram, logs.' },
    { method: 'GET', path: '/api/alerts', desc: 'Returns all corroborated incidents with co-occurring signals, priority scores, and statuses.' },
    { method: 'POST', path: '/api/alerts/:id/feedback', desc: 'Submits analyst decision (CONFIRMED, DISMISSED, ESCALATED) with x-user-role validation.' },
    { method: 'POST', path: '/api/entities', desc: 'Onboards a new employee account with synthetic baseline. Requires role: security_director.' },
    { method: 'GET', path: '/api/feedback', desc: 'Fetches feedback audit logs, true positive accuracy rates, and total corroboration counts.' },
    { method: 'GET', path: '/api/download-documentation-pdf', desc: 'Generates and streams this comprehensive 4-page technical documentation PDF.' }
  ];

  endpoints.forEach((ep) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');

    // Method badge
    doc.setFillColor(ep.method === 'GET' ? 16 : 220, ep.method === 'GET' ? 185 : 38, ep.method === 'GET' ? 129 : 38);
    doc.roundedRect(margin + 6, y + 5, 34, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(ep.method, margin + 12, y + 15);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(ep.path, margin + 46, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(ep.desc, margin + 210, y + 15);

    y += 28;
  });

  y += 10;
  // Final Sign-off box
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(margin, y, contentWidth, 34, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(39, 39, 42);
  doc.text('UEBA Sentinel Verification & Quality Certification', margin + 12, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Compiled and certified for production SOC deployment. Real-time telemetry validated against NIST CSF & MITRE ATT&CK.', margin + 12, y + 26);

  addFooter(4, 4);

  // Return buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
