import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import FacultyCertificate from '../models/FacultyCertificate.js';
import FacultyApplication from '../models/FacultyApplication.js';
import User from '../models/User.js';
import { createNotification } from './notification.service.js';

const UPLOADS_DIR = path.resolve('uploads');
const CERT_DIR = path.join(UPLOADS_DIR, 'faculty_certificates');

if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

/**
 * Escapes text for PDF string literals
 */
const escapePdfText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Keep printable ASCII
};

/**
 * Generates a valid, dependency-free binary PDF 1.4 certificate
 * Page size: A4 Landscape (842 x 595 pt)
 * Styled exclusively using SkillBridge official color tokens:
 * - Plum: #352044 (0.208, 0.125, 0.267)
 * - Ink: #29252B (0.161, 0.145, 0.169)
 * - Saffron: #F2B84B (0.949, 0.722, 0.294)
 * - Ivory Warm: #F0EBE0 (0.941, 0.922, 0.878)
 * - Ember: #D85C3F (0.847, 0.361, 0.247)
 */
export const generateCertificatePdfBuffer = ({
  facultyName,
  title,
  opportunityTitle,
  domain,
  issuer,
  duration,
  certificateNumber,
  verificationCode,
  completionDate,
}) => {
  const safeFacultyName = escapePdfText(facultyName || 'Distinguished Faculty Member');
  const safeTitle = escapePdfText(title || 'Certificate of Completion');
  const safeOppTitle = escapePdfText(opportunityTitle || 'Faculty Professional Initiative');
  const safeDomain = escapePdfText(domain || 'Engineering & Technology');
  const safeIssuer = escapePdfText(issuer || 'SkillBridge & Industry Partner');
  const safeDuration = escapePdfText(duration || 'Prescribed Duration');
  const safeCertNumber = escapePdfText(certificateNumber);
  const safeVerifCode = escapePdfText(verificationCode);
  const safeDate = escapePdfText(
    completionDate ? new Date(completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'September 2026'
  );

  // Content Stream for A4 Landscape (842 x 595)
  const contentStream = `
q
% Background Ivory Warm
0.969 0.953 0.918 rg
0 0 842 595 re
f

% Outer Plum Border (4pt)
0.208 0.125 0.267 RG
4 w
24 24 794 547 re
S

% Inner Saffron Accent Border (1.5pt)
0.949 0.722 0.294 RG
1.5 w
32 32 778 531 re
S

% Corner Medallion Highlights
0.847 0.361 0.247 RG
1 w
36 36 12 12 re S
794 36 12 12 re S
36 547 12 12 re S
794 547 12 12 re S

% Brand Header Banner
BT
/F2 13 Tf
0.208 0.125 0.267 rg
180 520 Td
(SKILLBRIDGE ACADEMIA-INDUSTRY COLLABORATION PORTAL) Tj
ET

BT
/F1 10 Tf
0.431 0.408 0.459 rg
210 502 Td
(NATIONAL PORTAL FOR ACADEMIA-INDUSTRY ENGAGEMENT | SIH PROBLEM 26044) Tj
ET

% Decorative Horizontal Rule
0.949 0.722 0.294 RG
1 w
160 488 m
682 488 l
S

% Main Title
BT
/F3 28 Tf
0.208 0.125 0.267 rg
240 445 Td
(${safeTitle}) Tj
ET

% Subtitle
BT
/F1 12 Tf
0.161 0.145 0.169 rg
300 415 Td
(This is proudly awarded to) Tj
ET

% Faculty Name
BT
/F2 24 Tf
0.847 0.361 0.247 rg
220 375 Td
(${safeFacultyName}) Tj
ET

% Citation paragraph
BT
/F1 12 Tf
0.161 0.145 0.169 rg
150 335 Td
(for exemplary participation and successful completion of the academic initiative:) Tj
ET

% Opportunity Title
BT
/F2 16 Tf
0.208 0.125 0.267 rg
160 305 Td
("${safeOppTitle}") Tj
ET

% Metadata specs
BT
/F1 11 Tf
0.290 0.271 0.314 rg
170 270 Td
(Domain: ${safeDomain}   |   Duration: ${safeDuration}   |   Completed on: ${safeDate}) Tj
ET

BT
/F1 11 Tf
0.290 0.271 0.314 rg
230 248 Td
(Host & Certifying Body: ${safeIssuer}) Tj
ET

% Lower Divider Line
0.800 0.800 0.800 RG
1 w
120 215 m
722 215 l
S

% Signature / Authorization Blocks
BT
/F2 11 Tf
0.208 0.125 0.267 rg
150 170 Td
(Dr. Rajesh Verma) Tj
ET

BT
/F1 9 Tf
0.431 0.408 0.459 rg
150 156 Td
(Academic Director, SkillBridge) Tj
ET

0.500 0.500 0.500 RG
1 w
140 182 m
280 182 l
S

BT
/F2 11 Tf
0.208 0.125 0.267 rg
560 170 Td
(Authorized Industry Partner) Tj
ET

BT
/F1 9 Tf
0.431 0.408 0.459 rg
560 156 Td
(${safeIssuer}) Tj
ET

0.500 0.500 0.500 RG
1 w
550 182 m
710 182 l
S

% Verification & Credential Strip
BT
/F2 10 Tf
0.208 0.125 0.267 rg
120 95 Td
(Certificate No: ${safeCertNumber}     Verification Code: ${safeVerifCode}) Tj
ET

BT
/F1 9 Tf
0.431 0.408 0.459 rg
120 78 Td
(Verify official authenticity: https://skillbridge.dev/api/certificates/verify/${safeVerifCode}) Tj
ET

Q
`;

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  // Build Objects
  const objects = [];

  // 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>\nendobj\n'
  );

  // 4: Content Stream
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream${contentStream}\nendstream\nendobj\n`);

  // 5: Font F1 (Helvetica)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // 6: Font F2 (Helvetica-Bold)
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  // 7: Font F3 (Times-Bold)
  objects.push('7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>\nendobj\n');

  // Calculate xref offsets
  let header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let offset = Buffer.byteLength(header, 'utf8');
  const offsets = [offset];

  for (let i = 0; i < objects.length; i++) {
    offset += Buffer.byteLength(objects[i], 'utf8');
    offsets.push(offset);
  }

  let xref = 'xref\n0 8\n0000000000 65535 f \n';
  for (let i = 0; i < objects.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0');
    xref += `${padded} 00000 n \n`;
  }

  const startxref = offset;
  const trailer = `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  const fullPdf = header + objects.join('') + xref + trailer;
  return Buffer.from(fullPdf, 'utf8');
};

/**
 * Issues a completion certificate for an application in 'Completed' status
 */
export const issueFacultyCertificate = async (applicationId) => {
  const application = await FacultyApplication.findById(applicationId)
    .populate('faculty', 'name email')
    .populate('opportunity')
    .populate('facultyProfile');

  if (!application) {
    const err = new Error('Application not found.');
    err.status = 404;
    throw err;
  }

  if (application.status !== 'Completed') {
    const err = new Error(
      `Certificate can only be issued for completed applications (current status: ${application.status}).`
    );
    err.status = 400;
    throw err;
  }

  // If already issued, return existing certificate
  let existingCert = await FacultyCertificate.findOne({ application: application._id });
  if (existingCert) {
    return existingCert;
  }

  const year = new Date().getFullYear();
  const hexSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  const certificateNumber = `SB-FAC-${year}-${hexSuffix}`;
  const verificationCode = `VFC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  const certTitle = `Certificate of Completion - ${application.opportunity?.title || 'Faculty Development'}`;
  const issuer = application.opportunity?.provider || application.opportunity?.industryPartner || 'SkillBridge Partner';
  const completionDate = application.completedAt || application.completionDetails?.completionDate || new Date();

  // Generate binary PDF
  const pdfBuffer = generateCertificatePdfBuffer({
    facultyName: application.faculty?.name || 'Faculty Member',
    title: 'CERTIFICATE OF COMPLETION',
    opportunityTitle: application.opportunity?.title || 'Faculty Opportunity',
    domain: application.opportunity?.domain || 'Academic Research',
    issuer,
    duration: application.opportunity?.duration || '4 Weeks',
    certificateNumber,
    verificationCode,
    completionDate,
  });

  const pdfFileName = `${certificateNumber}_${verificationCode}.pdf`;
  const pdfPath = path.join(CERT_DIR, pdfFileName);
  fs.writeFileSync(pdfPath, pdfBuffer);

  const certificate = await FacultyCertificate.create({
    certificateNumber,
    verificationCode,
    faculty: application.faculty._id,
    application: application._id,
    opportunity: application.opportunity?._id,
    title: certTitle,
    issuer,
    issuedAt: new Date(),
    completionDate,
    certificateUrl: `/api/faculty/certificates/${certificateNumber}/view`,
    pdfPath,
    status: 'Valid',
  });

  // Link to application
  application.certificate = certificate._id;
  await application.save();

  // Trigger notification for faculty
  try {
    await createNotification({
      userId: application.faculty._id,
      title: 'Certificate Available',
      message: `Your completion certificate for "${application.opportunity?.title}" has been issued and is available to download.`,
      type: 'application',
      link: `/faculty/applications/${application._id}`,
    });
  } catch (notifErr) {
    console.error('Failed to dispatch certificate notification:', notifErr.message);
  }

  return certificate;
};

/**
 * Get all certificates earned by authenticated faculty
 */
export const getFacultyCertificates = async (facultyUserId) => {
  return FacultyCertificate.find({ faculty: facultyUserId, status: 'Valid' })
    .populate('opportunity', 'title type provider domain duration')
    .sort({ issuedAt: -1 })
    .lean();
};

/**
 * Get certificate by ID with strict ownership validation
 */
export const getFacultyCertificateById = async (facultyUserId, certificateId) => {
  const certificate = await FacultyCertificate.findOne({
    _id: certificateId,
    faculty: facultyUserId,
  })
    .populate('faculty', 'name email')
    .populate('opportunity', 'title type provider domain duration startDate endDate')
    .populate('application');

  if (!certificate) {
    const err = new Error('Certificate not found or not authorized.');
    err.status = 404;
    throw err;
  }

  return certificate;
};

/**
 * Public certificate verification (no login, zero private PII)
 */
export const verifyFacultyCertificateByCode = async (verificationCode) => {
  if (!verificationCode) return null;

  const code = verificationCode.trim().toUpperCase();
  const cert = await FacultyCertificate.findOne({ verificationCode: code, status: 'Valid' })
    .populate('faculty', 'name')
    .populate('opportunity', 'title type provider domain duration startDate endDate')
    .lean();

  if (!cert || !cert.faculty) {
    return null;
  }

  return {
    valid: true,
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    issuedAt: cert.issuedAt,
    completionDate: cert.completionDate,
    facultyName: cert.faculty.name,
    recipientName: cert.faculty.name,
    certificateTitle: cert.title,
    issuingOrganization: cert.issuer || cert.opportunity?.provider || 'SkillBridge Partner',
    opportunityTitle: cert.opportunity?.title || 'Academic Initiative',
    opportunityType: cert.opportunity?.type || 'Faculty Program',
    domain: cert.opportunity?.domain || 'Engineering & Technology',
    duration: cert.opportunity?.duration || '4 Weeks',
    status: 'Verified Official Credential',
  };
};
