import StudentSkill from '../models/StudentSkill.js';
import Skill from '../models/Skill.js';

/**
 * Skill Engine Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Centralized, deterministic scoring engine and proficiency evaluation.
 */

// ── Centralized Thresholds ──
export const VERIFICATION_THRESHOLD = 60; // 60% and above verifies skill
export const STRENGTH_THRESHOLD = 80;     // 80% and above marks strength
export const PASSING_SCORE_DEFAULT = 60;

/**
 * Map numerical percentage score to standardized proficiency level
 * 0–39   -> Beginner
 * 40–59  -> Developing
 * 60–79  -> Proficient
 * 80–100 -> Advanced
 */
export const getSkillLevel = (score) => {
  if (score >= 80) return 'Advanced';
  if (score >= 60) return 'Proficient';
  if (score >= 40) return 'Developing';
  return 'Beginner';
};

/**
 * Evaluate student assessment answers against authoritative questions in DB.
 * Supports Technical right/wrong MCQs and Soft Skill scenario-based weighted options.
 *
 * @param {Array} questions - Questions loaded from DB (including correctAnswer & explanation)
 * @param {Array} studentAnswers - Array of { questionId, selectedOption }
 * @param {Object} assessment - Assessment configuration
 * @returns {Object} Graded evaluation with overall stats and per-skill breakdown
 */
export const gradeAssessmentAttempt = (questions, studentAnswers, assessment) => {
  // Index questions by string ID
  const questionMap = new Map();
  questions.forEach((q) => {
    questionMap.set(q._id.toString(), q);
  });

  const answersMap = new Map();
  studentAnswers.forEach((ans) => {
    if (ans.questionId) {
      answersMap.set(ans.questionId.toString(), ans.selectedOption);
    }
  });

  let totalMarks = 0;
  let obtainedMarks = 0;
  const gradedAnswers = [];

  // Grouping by skill: skillId -> { skillId, skillName, category, totalMarks, obtainedMarks }
  const skillBuckets = new Map();

  questions.forEach((q) => {
    const qId = q._id.toString();
    const qMarks = q.marks || 1;
    totalMarks += qMarks;

    const skillId = q.skill?._id ? q.skill._id.toString() : q.skill.toString();
    const skillName = q.skill?.name || 'General Engineering';
    const skillCategory = q.skill?.category || 'Technical';

    if (!skillBuckets.has(skillId)) {
      skillBuckets.set(skillId, {
        skillId,
        skillName,
        category: skillCategory,
        totalMarks: 0,
        obtainedMarks: 0,
      });
    }
    skillBuckets.get(skillId).totalMarks += qMarks;

    const selectedOption = answersMap.get(qId) || '';
    let isCorrect = false;
    let marksAwarded = 0;

    if (assessment.type === 'Soft Skill') {
      // Soft-skill scenario evaluation: check weighted option values if configured
      const chosenOpt = q.options?.find((opt) => opt.optionId === selectedOption);
      if (chosenOpt && typeof chosenOpt.scoreValue === 'number' && chosenOpt.scoreValue > 0) {
        marksAwarded = Math.min(qMarks, chosenOpt.scoreValue);
        isCorrect = marksAwarded >= qMarks * 0.75;
      } else if (q.correctAnswer && selectedOption === q.correctAnswer) {
        marksAwarded = qMarks;
        isCorrect = true;
      }
    } else {
      // Technical / MCQ: exact match with server-side correctAnswer
      if (selectedOption && q.correctAnswer && selectedOption.trim() === q.correctAnswer.trim()) {
        isCorrect = true;
        marksAwarded = qMarks;
      }
    }

    obtainedMarks += marksAwarded;
    skillBuckets.get(skillId).obtainedMarks += marksAwarded;

    gradedAnswers.push({
      question: q._id,
      selectedOption,
      isCorrect,
      marksAwarded,
    });
  });

  // Calculate overall percentage
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const passingScore = assessment.passingScore || PASSING_SCORE_DEFAULT;
  const passed = percentage >= passingScore;

  // Calculate per-skill scores
  const skillScores = [];
  const strengths = [];
  const weaknesses = [];

  for (const bucket of skillBuckets.values()) {
    const skillPercentage =
      bucket.totalMarks > 0
        ? Math.round((bucket.obtainedMarks / bucket.totalMarks) * 100)
        : 0;

    const level = getSkillLevel(skillPercentage);
    const verified = skillPercentage >= VERIFICATION_THRESHOLD;

    if (skillPercentage >= STRENGTH_THRESHOLD) {
      strengths.push(bucket.skillName);
    } else if (skillPercentage < VERIFICATION_THRESHOLD) {
      weaknesses.push(bucket.skillName);
    }

    skillScores.push({
      skill: bucket.skillId,
      skillName: bucket.skillName,
      category: bucket.category,
      marksObtained: bucket.obtainedMarks,
      totalMarks: bucket.totalMarks,
      percentage: skillPercentage,
      level,
      verified,
    });
  }

  return {
    totalMarks,
    obtainedMarks,
    percentage,
    passed,
    answers: gradedAnswers,
    skillScores,
    strengths,
    weaknesses,
  };
};

/**
 * Update the student's authoritative StudentSkill profile based on assessment outcome.
 * Verified status is granted ONLY if score >= VERIFICATION_THRESHOLD.
 */
export const updateStudentSkillProfile = async (
  studentId,
  skillScores,
  assessmentId,
  attemptId
) => {
  const updates = [];

  for (const scoreItem of skillScores) {
    const isVerified = scoreItem.percentage >= VERIFICATION_THRESHOLD;
    const now = new Date();

    const existingSkill = await StudentSkill.findOne({
      student: studentId,
      skillName: scoreItem.skillName,
    });

    if (!existingSkill) {
      // Create new StudentSkill record
      updates.push(
        StudentSkill.create({
          student: studentId,
          skill: scoreItem.skill,
          skillName: scoreItem.skillName,
          category: scoreItem.category || 'Technical',
          score: scoreItem.percentage,
          level: scoreItem.level,
          verified: isVerified,
          verifiedAt: isVerified ? now : null,
          sourceAssessment: assessmentId,
          sourceAttempt: attemptId,
          lastAssessedAt: now,
        })
      );
    } else {
      // Update existing skill record (update score, retain verified if previously verified or newly verified)
      const shouldBeVerified = existingSkill.verified || isVerified;
      const verifiedAt =
        existingSkill.verifiedAt || (isVerified ? now : null);

      updates.push(
        StudentSkill.findByIdAndUpdate(
          existingSkill._id,
          {
            $set: {
              skill: scoreItem.skill || existingSkill.skill,
              score: scoreItem.percentage,
              level: scoreItem.level,
              verified: shouldBeVerified,
              verifiedAt,
              sourceAssessment: assessmentId,
              sourceAttempt: attemptId,
              lastAssessedAt: now,
            },
          },
          { new: true }
        )
      );
    }
  }

  return Promise.all(updates);
};
