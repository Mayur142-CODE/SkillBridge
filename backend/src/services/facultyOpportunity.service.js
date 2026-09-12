/**
 * ═══════════════════════════════════════════════════
 * Faculty Opportunity Matching & Discovery Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Provides deterministic expertise matching and eligibility preview
 * without relying on client-supplied data or modifying student algorithms.
 * ═══════════════════════════════════════════════════
 */

/**
 * Normalizes a text string for fuzzy token/substring comparison
 */
const normalizeTerm = (term) => {
  if (!term || typeof term !== 'string') return '';
  return term
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Checks whether a single skill requirement matches any faculty competency
 */
const doesSkillMatch = (skill, facultyTokens, facultyPhrases) => {
  const normSkill = normalizeTerm(skill);
  if (!normSkill) return false;

  // 1. Exact phrase match
  for (const phrase of facultyPhrases) {
    if (phrase === normSkill) return true;
  }

  // 2. Substring inclusion (e.g. "artificial intelligence" in "artificial intelligence and machine learning")
  for (const phrase of facultyPhrases) {
    if (phrase.includes(normSkill) || normSkill.includes(phrase)) {
      return true;
    }
  }

  // 3. Token containment
  const skillWords = normSkill.split(' ').filter((w) => w.length > 2);
  if (skillWords.length > 0) {
    const allWordsPresent = skillWords.every((word) =>
      facultyTokens.has(word)
    );
    if (allWordsPresent) return true;
  }

  // 4. Common Acronyms
  const acronyms = {
    ai: 'artificial intelligence',
    ml: 'machine learning',
    dl: 'deep learning',
    nlp: 'natural language processing',
    iot: 'internet of things',
    hpc: 'high performance computing',
    os: 'operating systems',
    dbms: 'database management systems',
  };

  if (acronyms[normSkill]) {
    const expanded = acronyms[normSkill];
    if (facultyPhrases.some((p) => p.includes(expanded))) return true;
  }

  for (const [abbr, full] of Object.entries(acronyms)) {
    if (normSkill.includes(full) && facultyTokens.has(abbr)) {
      return true;
    }
  }

  return false;
};

/**
 * Deterministically computes faculty expertise match score and breakdown
 *
 * @param {Object} facultyUser - Authenticated user document
 * @param {Object} facultyProfile - Authenticated faculty profile document
 * @param {Object} opportunity - FacultyOpportunity document
 * @returns {Object} { matchScore, matchedExpertise, missingExpertise, hasNoRequiredExpertise, explanation }
 */
export const calculateFacultyExpertiseMatch = (facultyUser, facultyProfile, opportunity) => {
  const profile = facultyProfile || {};
  const user = facultyUser || {};

  // Build faculty competency pool
  const rawCompetencies = [
    ...(Array.isArray(profile.expertiseAreas) ? profile.expertiseAreas : []),
    ...(Array.isArray(user.academicianProfile?.expertise) ? user.academicianProfile.expertise : []),
    ...(Array.isArray(profile.researchInterests) ? profile.researchInterests : []),
    profile.specialization || '',
  ].filter(Boolean);

  const facultyPhrases = [];
  const facultyTokens = new Set();

  rawCompetencies.forEach((item) => {
    const norm = normalizeTerm(item);
    if (norm) {
      facultyPhrases.push(norm);
      norm.split(' ').forEach((token) => {
        if (token.length > 1) facultyTokens.add(token);
      });
    }
  });

  const opp = opportunity || {};
  const requiredList = Array.isArray(opp.requiredExpertise)
    ? opp.requiredExpertise.filter(Boolean)
    : [];
  const preferredList = Array.isArray(opp.preferredExpertise)
    ? opp.preferredExpertise.filter(Boolean)
    : [];

  // If opportunity has no required skills, provide baseline relevant score
  if (requiredList.length === 0) {
    return {
      matchScore: 90,
      matchedExpertise: [],
      missingExpertise: [],
      matchedSkills: [],
      missingSkills: [],
      matchedPreferred: [],
      hasNoRequiredExpertise: true,
      explanation: 'Relevant expertise match available (no specific prerequisites required).',
    };
  }

  const matchedExpertise = [];
  const missingExpertise = [];

  requiredList.forEach((reqSkill) => {
    if (doesSkillMatch(reqSkill, facultyTokens, facultyPhrases)) {
      matchedExpertise.push(reqSkill);
    } else {
      missingExpertise.push(reqSkill);
    }
  });

  const matchedPreferred = [];
  preferredList.forEach((prefSkill) => {
    if (doesSkillMatch(prefSkill, facultyTokens, facultyPhrases)) {
      matchedPreferred.push(prefSkill);
    }
  });

  const requiredRatio = matchedExpertise.length / requiredList.length;

  let rawScore = 0;
  if (preferredList.length > 0) {
    const preferredRatio = matchedPreferred.length / preferredList.length;
    rawScore = (requiredRatio * 0.85 + preferredRatio * 0.15) * 100;
  } else {
    rawScore = requiredRatio * 100;
  }

  const matchScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let explanation = '';
  if (matchScore >= 80) {
    explanation = 'This opportunity aligns strongly with your current expertise.';
  } else if (matchScore >= 50) {
    explanation = 'This opportunity aligns moderately with your expertise with minor skill gaps.';
  } else if (matchScore > 0) {
    explanation = 'This opportunity has some expertise gaps compared to your profile.';
  } else {
    explanation = 'Low match based on your current listed areas of expertise.';
  }

  return {
    matchScore,
    matchedExpertise,
    missingExpertise,
    matchedSkills: matchedExpertise,
    missingSkills: missingExpertise,
    matchedPreferred,
    hasNoRequiredExpertise: false,
    explanation,
  };
};

/**
 * Generates an automated eligibility preview for the opportunity
 *
 * @param {Object} facultyUser - Authenticated user document
 * @param {Object} facultyProfile - Authenticated faculty profile document
 * @param {Object} opportunity - FacultyOpportunity document
 * @returns {Object} { eligible, eligibilityReasons, previewOnly }
 */
export const evaluateFacultyEligibilityPreview = (facultyUserOrOpp, facultyProfile, opportunity) => {
  let user = facultyUserOrOpp;
  let profile = facultyProfile;
  let opp = opportunity;

  // Flexible handling if invoked as (opportunity, facultyProfile)
  if (facultyUserOrOpp && (facultyUserOrOpp.title !== undefined || !opportunity)) {
    opp = facultyUserOrOpp;
    profile = facultyProfile || {};
    user = {};
  }

  opp = opp || {};
  profile = profile || {};
  user = user || {};
  const reasons = [];

  const facultyDept = (profile.department || user.academicianProfile?.department || '').trim();
  const facultyExp = Number(profile.yearsOfExperience || 0);
  const facultyQual = (profile.academicQualifications || '').trim();

  // 1. Department Eligibility Check
  if (
    Array.isArray(opp.departmentEligibility) &&
    opp.departmentEligibility.length > 0
  ) {
    const normDept = normalizeTerm(facultyDept);
    const isDeptAllowed = opp.departmentEligibility.some((d) => {
      const allowed = normalizeTerm(d);
      return allowed.includes(normDept) || normDept.includes(allowed);
    });

    if (!isDeptAllowed && facultyDept) {
      reasons.push(
        `Your department (${facultyDept}) is not among the targeted departments (${opp.departmentEligibility.join(', ')}).`
      );
    }
  }

  // 2. Minimum Experience Check
  if (opp.minimumExperience && opp.minimumExperience > 0) {
    if (facultyExp < opp.minimumExperience) {
      reasons.push(
        `Requires at least ${opp.minimumExperience} years of experience (your profile lists ${facultyExp} years).`
      );
    }
  }

  // 3. Qualification Requirements Check
  if (
    Array.isArray(opp.qualificationRequirements) &&
    opp.qualificationRequirements.length > 0
  ) {
    const normQual = normalizeTerm(facultyQual);
    const hasPhd =
      normQual.includes('ph d') ||
      normQual.includes('phd') ||
      normQual.includes('doctorate');

    const hasQual = opp.qualificationRequirements.some((q) => {
      const target = normalizeTerm(q);
      if (normQual.includes(target)) return true;
      if (
        hasPhd &&
        (target.includes('master') ||
          target.includes('m tech') ||
          target.includes('m s') ||
          target.includes('bachelor') ||
          target.includes('b tech') ||
          target.includes('post graduate') ||
          target.includes('postgraduate'))
      ) {
        return true;
      }
      return false;
    });

    if (!hasQual && facultyQual) {
      reasons.push(
        `Preferred qualification: ${opp.qualificationRequirements.join(' or ')}.`
      );
    }
  }

  // 4. Deadline Check
  if (opp.applicationDeadline) {
    const deadline = new Date(opp.applicationDeadline);
    if (deadline < new Date()) {
      reasons.push('Application deadline has passed.');
    }
  }

  return {
    eligible: reasons.length === 0,
    eligibilityReasons: reasons,
    previewOnly: true,
  };
};
