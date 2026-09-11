import jwt from 'jsonwebtoken';
import { users } from '../data/mockDatabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge_default_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const login = (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check against mock users or create session for demo
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For demo convenience, allow login if credentials look plausible
      user = {
        id: `usr_${Date.now()}`,
        role: 'student',
        name: email.split('@')[0],
        email: email,
        verified: true,
        createdAt: new Date().toISOString()
      };
      users.push(user);
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name || user.companyName || user.institutionName,
        email: user.email,
        role: user.role,
        verified: user.verified
      }
    });
  } catch (error) {
    next(error);
  }
};

export const registerStudent = (req, res, next) => {
  try {
    const { name, email, phone, university, rollNumber, branch, year, cgpa, password } = req.body;

    if (!name || !email || !university || !rollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required student registration fields'
      });
    }

    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    const newUser = {
      id: `usr_student_${Date.now()}`,
      role: 'student',
      name,
      email,
      phone,
      university,
      rollNumber,
      branch,
      year,
      cgpa: cgpa || null,
      verified: false,
      skills: [],
      projects: [],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      token,
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

export const registerIndustry = (req, res, next) => {
  try {
    const { companyName, email, sector, contactPerson, phone, website } = req.body;

    if (!companyName || !email || !contactPerson) {
      return res.status(400).json({
        success: false,
        message: 'Missing required industry registration fields'
      });
    }

    const newUser = {
      id: `usr_industry_${Date.now()}`,
      role: 'industry',
      companyName,
      email,
      sector,
      contactPerson,
      phone,
      website: website || '',
      verified: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Industry registration received and pending review',
      token,
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

export const registerFaculty = (req, res, next) => {
  try {
    const { name, email, university, department, designation, expertise } = req.body;

    if (!name || !email || !university || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required faculty registration fields'
      });
    }

    const newUser = {
      id: `usr_faculty_${Date.now()}`,
      role: 'faculty',
      name,
      email,
      university,
      department,
      designation: designation || 'Professor',
      expertise: typeof expertise === 'string' ? expertise.split(',').map((s) => s.trim()) : [],
      verified: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Academician account registered successfully',
      token,
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

export const registerInstitution = (req, res, next) => {
  try {
    const { institutionName, aisheCode, email, contactPerson, phone, address } = req.body;

    if (!institutionName || !aisheCode || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required institution registration fields'
      });
    }

    const newUser = {
      id: `usr_inst_${Date.now()}`,
      role: 'institution',
      institutionName,
      aisheCode,
      email,
      contactPerson,
      phone,
      address,
      verified: false,
      verificationStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Institutional registration submitted for administrative verification',
      token,
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Always respond with success for privacy
    return res.status(200).json({
      success: true,
      message: 'If this email is registered, a password reset link has been dispatched'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = (req, res, next) => {
  try {
    const user = users.find((u) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
