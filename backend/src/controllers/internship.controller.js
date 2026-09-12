import mongoose from 'mongoose';
import InternshipRecord from '../models/InternshipRecord.js';
import { PROFILE_LIMITS } from '../config/limits.config.js';

/**
 * GET /api/student/internships
 * List all historical internship records for authenticated student
 */
export const getInternships = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const records = await InternshipRecord.find({ student: studentId }).sort({
      startDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/internships
 * Add historical internship record (enforces max limit)
 */
export const createInternship = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const {
      company,
      role,
      location,
      startDate,
      endDate,
      isCurrent,
      description,
      skills,
    } = req.body;

    // Enforce server-side limit
    const count = await InternshipRecord.countDocuments({ student: studentId });
    if (count >= PROFILE_LIMITS.internships) {
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${PROFILE_LIMITS.internships} internship records.`,
      });
    }

    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    if (!role || !role.trim()) {
      return res.status(400).json({ success: false, message: 'Internship role is required.' });
    }

    if (startDate && endDate && !isCurrent) {
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be earlier than start date.',
        });
      }
    }

    const skillsArray = Array.isArray(skills)
      ? skills.map((s) => s.trim()).filter(Boolean)
      : typeof skills === 'string'
      ? skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const record = await InternshipRecord.create({
      student: studentId,
      company: company.trim(),
      role: role.trim(),
      location: location ? location.trim() : '',
      startDate: startDate || null,
      endDate: isCurrent ? null : endDate || null,
      isCurrent: Boolean(isCurrent),
      description: description ? description.trim() : '',
      skills: skillsArray,
    });

    return res.status(201).json({
      success: true,
      message: 'Internship experience added successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/student/internships/:id
 * Update historical internship record (ownership enforced)
 */
export const updateInternship = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;
    const {
      company,
      role,
      location,
      startDate,
      endDate,
      isCurrent,
      description,
      skills,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const record = await InternshipRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (record.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this item.',
      });
    }

    if (startDate !== undefined && endDate !== undefined && !isCurrent) {
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be earlier than start date.',
        });
      }
    }

    if (company !== undefined) record.company = company.trim();
    if (role !== undefined) record.role = role.trim();
    if (location !== undefined) record.location = location.trim();
    if (startDate !== undefined) record.startDate = startDate || null;
    if (isCurrent !== undefined) record.isCurrent = Boolean(isCurrent);
    if (endDate !== undefined) record.endDate = record.isCurrent ? null : endDate || null;
    if (description !== undefined) record.description = description.trim();

    if (skills !== undefined) {
      record.skills = Array.isArray(skills)
        ? skills.map((s) => s.trim()).filter(Boolean)
        : typeof skills === 'string'
        ? skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Internship record updated successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/student/internships/:id
 * Delete historical internship record (ownership strictly enforced)
 */
export const deleteInternship = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const record = await InternshipRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (record.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this item.',
      });
    }

    await InternshipRecord.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Internship record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
