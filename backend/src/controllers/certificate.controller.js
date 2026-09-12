import { verifyCertificateByCode } from '../services/certificate.service.js';

/**
 * Certificate Controller
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Public unauthenticated certificate verification endpoint.
 */

/**
 * GET /api/certificates/verify/:verificationCode
 * Public certificate verification
 */
export const verifyPublicCertificate = async (req, res, next) => {
  try {
    const { verificationCode } = req.params;

    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required.',
      });
    }

    const verificationResult = await verifyCertificateByCode(verificationCode);

    if (!verificationResult) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found. The verification code is invalid or has expired.',
      });
    }

    return res.status(200).json({
      success: true,
      data: verificationResult,
    });
  } catch (error) {
    next(error);
  }
};
