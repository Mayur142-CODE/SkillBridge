import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { PROFILE_LIMITS } from '../config/limits.config.js';

/**
 * GET /api/student/projects
 * List all projects belonging to authenticated student
 */
export const getProjects = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const projects = await Project.find({ student: studentId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/projects
 * Create a new project for authenticated student (enforces max limit)
 */
export const createProject = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const {
      title,
      description,
      technologies,
      githubUrl,
      projectUrl,
      role,
      startDate,
      endDate,
      isCurrent,
    } = req.body;

    // Enforce server-side limit
    const count = await Project.countDocuments({ student: studentId });
    if (count >= PROFILE_LIMITS.projects) {
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${PROFILE_LIMITS.projects} projects.`,
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Project description is required.' });
    }

    // Validate dates if both provided
    if (startDate && endDate && !isCurrent) {
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
          success: false,
          message: 'Project end date cannot be earlier than start date.',
        });
      }
    }

    const techArray = Array.isArray(technologies)
      ? technologies.map((t) => t.trim()).filter(Boolean)
      : typeof technologies === 'string'
      ? technologies
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const project = await Project.create({
      student: studentId,
      title: title.trim(),
      description: description.trim(),
      technologies: techArray,
      githubUrl: githubUrl ? githubUrl.trim() : '',
      projectUrl: projectUrl ? projectUrl.trim() : '',
      role: role ? role.trim() : 'Developer',
      startDate: startDate || null,
      endDate: isCurrent ? null : endDate || null,
      isCurrent: Boolean(isCurrent),
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/projects/:id
 * Retrieve a specific project (ownership enforced)
 */
export const getProjectById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (project.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this item.',
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/student/projects/:id
 * Update project (ownership enforced)
 */
export const updateProject = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;
    const {
      title,
      description,
      technologies,
      githubUrl,
      projectUrl,
      role,
      startDate,
      endDate,
      isCurrent,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (project.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this item.',
      });
    }

    if (startDate !== undefined && endDate !== undefined && !isCurrent) {
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
          success: false,
          message: 'Project end date cannot be earlier than start date.',
        });
      }
    }

    if (title !== undefined) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (githubUrl !== undefined) project.githubUrl = githubUrl.trim();
    if (projectUrl !== undefined) project.projectUrl = projectUrl.trim();
    if (role !== undefined) project.role = role.trim();
    if (startDate !== undefined) project.startDate = startDate || null;
    if (isCurrent !== undefined) project.isCurrent = Boolean(isCurrent);
    if (endDate !== undefined) project.endDate = project.isCurrent ? null : endDate || null;

    if (technologies !== undefined) {
      project.technologies = Array.isArray(technologies)
        ? technologies.map((t) => t.trim()).filter(Boolean)
        : typeof technologies === 'string'
        ? technologies
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/student/projects/:id
 * Delete project (ownership strictly enforced)
 */
export const deleteProject = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (project.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this item.',
      });
    }

    await Project.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
