import crypto from 'crypto';
import Certificate from '../models/Certificate.js';
import Enrollment from '../models/Enrollment.js';
import { verifyFacultyCertificateByCode } from './facultyCertificate.service.js';

/**
 * Certificate Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Authoritative certificate issuance and public verification.
 */

/**
 * Issue a verified certificate upon 100% program completion
 */
export const issueCertificate = async (studentId, programId, enrollmentId) => {
  // Check if certificate already issued for this enrollment
  let certificate = await Certificate.findOne({ enrollment: enrollmentId });
  if (certificate) {
    return certificate;
  }

  // Generate unique certificate number & verification code
  const year = new Date().getFullYear();
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  const certificateNumber = `SB-${year}-${randomSuffix}`;
  const verificationCode = `V-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  certificate = await Certificate.create({
    student: studentId,
    program: programId,
    enrollment: enrollmentId,
    certificateNumber,
    verificationCode,
    issuedAt: new Date(),
    document: null, // Clean document abstraction (no fake URLs)
  });

  // Link to enrollment
  await Enrollment.findByIdAndUpdate(enrollmentId, {
    certificate: certificate._id,
  });

  return certificate;
};

/**
 * Public certificate verification (no login, no sensitive PII)
 * Checks both Faculty Certificates and Student Program Certificates
 */
export const verifyCertificateByCode = async (verificationCode) => {
  if (!verificationCode) {
    return null;
  }

  // 1. Check Faculty Certificate first
  const facultyCertResult = await verifyFacultyCertificateByCode(verificationCode);
  if (facultyCertResult) {
    return facultyCertResult;
  }

  // 2. Check Student Certificate
  const cert = await Certificate.findOne({
    verificationCode: verificationCode.trim().toUpperCase(),
  })
    .populate('student', 'name')
    .populate('program', 'title provider type level duration mode skills')
    .populate({
      path: 'program',
      populate: {
        path: 'skills',
        select: 'name category',
      },
    })
    .lean();

  if (!cert || !cert.student || !cert.program) {
    return null;
  }

  return {
    valid: true,
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    issuedAt: cert.issuedAt,
    studentName: cert.student.name,
    programTitle: cert.program.title,
    provider: cert.program.provider,
    type: cert.program.type,
    level: cert.program.level,
    duration: cert.program.duration,
    mode: cert.program.mode,
    skillsCovered: (cert.program.skills || []).map((s) => s.name || s),
    status: 'Verified Official Credential',
  };
};
