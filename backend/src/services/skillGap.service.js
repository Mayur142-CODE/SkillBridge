import IndustrySkillDemand from '../models/IndustrySkillDemand.js';
import StudentSkill from '../models/StudentSkill.js';
import Skill from '../models/Skill.js';

/**
 * Skill Gap Analysis Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Compares the student's evaluated skills against industry target benchmarks.
 */
export const calculateStudentSkillGaps = async (studentId) => {
  // 1. Fetch industry demand benchmarks
  const demands = await IndustrySkillDemand.find()
    .populate('skill', 'name category slug')
    .lean();

  // 2. Fetch student's current skill profile
  const studentSkills = await StudentSkill.find({ student: studentId }).lean();
  const studentSkillMap = new Map();
  studentSkills.forEach((sk) => {
    studentSkillMap.set(sk.skillName.toLowerCase(), sk);
  });

  // 3. Compute gaps
  const gapAnalysis = demands.map((demand) => {
    const skillName = demand.skill?.name || demand.skillName;
    const category = demand.skill?.category || 'Technical';
    const targetScore = demand.targetScore || 70;
    const studentRecord = studentSkillMap.get(skillName.toLowerCase());

    const currentScore = studentRecord ? studentRecord.score : 0;
    const isVerified = studentRecord ? studentRecord.verified : false;
    const currentLevel = studentRecord ? studentRecord.level : 'Unassessed';

    const gap = Math.max(0, targetScore - currentScore);

    let status = 'Met';
    if (gap === 0) {
      status = 'Benchmark Met';
    } else if (gap <= 20) {
      status = 'Moderate Gap';
    } else {
      status = 'Critical Gap';
    }

    return {
      skillId: demand.skill?._id || demand.skill,
      skillName,
      category,
      currentScore,
      targetScore,
      gap,
      status,
      demandLevel: demand.demandLevel || 'High',
      marketGrowthRate: demand.marketGrowthRate || '+15% YoY',
      isVerified,
      currentLevel,
    };
  });

  // Sort by highest gap and highest demand level
  gapAnalysis.sort((a, b) => b.gap - a.gap);

  const totalEvaluated = gapAnalysis.length;
  const benchmarksMet = gapAnalysis.filter((g) => g.gap === 0).length;
  const criticalGapsCount = gapAnalysis.filter((g) => g.gap > 20).length;

  return {
    summary: {
      totalEvaluated,
      benchmarksMet,
      criticalGapsCount,
      overallReadinessPercentage:
        totalEvaluated > 0
          ? Math.round((benchmarksMet / totalEvaluated) * 100)
          : 0,
    },
    gaps: gapAnalysis,
  };
};
