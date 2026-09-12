import mongoose from 'mongoose';
import FacultyOpportunity, {
  FACULTY_OPPORTUNITY_TYPES,
  FACULTY_OPPORTUNITY_MODES,
} from '../models/FacultyOpportunity.js';
import FacultyProfile from '../models/FacultyProfile.js';
import User from '../models/User.js';
import {
  calculateFacultyExpertiseMatch,
  evaluateFacultyEligibilityPreview,
} from '../services/facultyOpportunity.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Faculty Opportunity Discovery Controllers
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * All handlers strictly authenticate via req.user._id.
 * Read-only opportunity discovery with deterministic server-side
 * expertise matching and eligibility evaluation.
 * ═══════════════════════════════════════════════════
 */

/**
 * GET /api/faculty/opportunities
 *
 * Browses discoverable opportunities with multi-faceted filtering,
 * full-text/regex search, server-side sorting, and deterministic match scores.
 */
export const getFacultyOpportunities = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch authenticated faculty user & profile
    const facultyUser = await User.findById(userId).lean();
    const facultyProfile = await FacultyProfile.findOne({ user: userId }).lean();

    const {
      search,
      type,
      domain,
      mode,
      provider,
      expertise,
      certificate,
      duration,
      deadline,
      minMatch,
      sort = 'recommended',
      page = 1,
      limit = 9,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));

    // Base query: strictly Open opportunities only
    // Drafts, private, or deleted opportunities are strictly filtered out
    const filterQuery = {
      status: 'Open',
    };

    // 1. Search (title, description, provider, domain, requiredExpertise)
    if (search && search.trim()) {
      const term = search.trim();
      const searchRegex = new RegExp(term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      filterQuery.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { provider: searchRegex },
        { domain: searchRegex },
        { requiredExpertise: searchRegex },
      ];
    }

    // 2. Type filter
    if (type && type !== 'All') {
      if (FACULTY_OPPORTUNITY_TYPES.includes(type)) {
        filterQuery.type = type;
      }
    }

    // 3. Domain filter
    if (domain && domain !== 'All') {
      filterQuery.domain = new RegExp(`^${domain.trim()}$`, 'i');
    }

    // 4. Mode filter (Online, Offline, Hybrid)
    if (mode && mode !== 'All') {
      if (FACULTY_OPPORTUNITY_MODES.includes(mode)) {
        filterQuery.mode = mode;
      }
    }

    // 5. Provider filter
    if (provider && provider !== 'All') {
      filterQuery.provider = new RegExp(`^${provider.trim()}$`, 'i');
    }

    // 6. Expertise filter
    if (expertise && expertise !== 'All') {
      filterQuery.requiredExpertise = new RegExp(expertise.trim(), 'i');
    }

    // 7. Certificate Available filter
    if (certificate !== undefined && certificate !== 'All') {
      filterQuery.certificateAvailable = certificate === 'true' || certificate === true;
    }

    // 8. Duration filter
    if (duration && duration !== 'All') {
      filterQuery.duration = new RegExp(`^${duration.trim()}$`, 'i');
    }

    // 9. Deadline filter
    const now = new Date();
    if (deadline === 'active') {
      filterQuery.applicationDeadline = { $gte: now };
    } else if (deadline === 'upcoming_week') {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filterQuery.applicationDeadline = { $gte: now, $lte: nextWeek };
    } else if (deadline === 'upcoming_month') {
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      filterQuery.applicationDeadline = { $gte: now, $lte: nextMonth };
    }

    // Fetch all matching records to evaluate deterministic match scores
    const rawOpportunities = await FacultyOpportunity.find(filterQuery).lean();

    // Attach deterministic expertise match & eligibility preview
    let enriched = rawOpportunities.map((opp) => {
      const match = calculateFacultyExpertiseMatch(facultyUser, facultyProfile, opp);
      const eligibility = evaluateFacultyEligibilityPreview(facultyUser, facultyProfile, opp);
      return {
        ...opp,
        match,
        eligibility,
      };
    });

    // MinMatch filter
    if (minMatch !== undefined && minMatch !== '') {
      const minScore = parseInt(minMatch, 10);
      if (!isNaN(minScore)) {
        enriched = enriched.filter((opp) => opp.match.matchScore >= minScore);
      }
    }

    // Server-Side Sorting
    if (sort === 'recommended' || sort === 'highest_match') {
      enriched.sort((a, b) => {
        if (b.match.matchScore !== a.match.matchScore) {
          return b.match.matchScore - a.match.matchScore;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    } else if (sort === 'newest') {
      enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'deadline') {
      enriched.sort((a, b) => new Date(a.applicationDeadline) - new Date(b.applicationDeadline));
    } else {
      // Default: recommended match
      enriched.sort((a, b) => b.match.matchScore - a.match.matchScore);
    }

    const total = enriched.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedOpportunities = enriched.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      data: {
        opportunities: paginatedOpportunities,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
        meta: {
          facultyName: facultyUser?.name || 'Faculty Member',
          department: facultyProfile?.department || facultyUser?.academicianProfile?.department || '',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/opportunities/:id
 *
 * Retrieves comprehensive specifications for a single opportunity
 * with detailed expertise matching breakdown and eligibility preview.
 */
export const getFacultyOpportunityById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found.',
      });
    }

    const opportunity = await FacultyOpportunity.findById(id).lean();

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found.',
      });
    }

    // Security check: Draft or internal opportunities are strictly hidden
    if (opportunity.status === 'Draft') {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found or not currently discoverable.',
      });
    }

    const facultyUser = await User.findById(userId).lean();
    const facultyProfile = await FacultyProfile.findOne({ user: userId }).lean();

    const match = calculateFacultyExpertiseMatch(facultyUser, facultyProfile, opportunity);
    const eligibility = evaluateFacultyEligibilityPreview(facultyUser, facultyProfile, opportunity);

    return res.status(200).json({
      success: true,
      data: {
        ...opportunity,
        match,
        eligibility,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/opportunities/filters
 *
 * Returns distinct filter facets derived dynamically from open opportunities.
 */
export const getFacultyOpportunityFilters = async (req, res, next) => {
  try {
    const openFilter = { status: 'Open' };

    const [types, domains, modes, providers, durations] = await Promise.all([
      FacultyOpportunity.distinct('type', openFilter),
      FacultyOpportunity.distinct('domain', openFilter),
      FacultyOpportunity.distinct('mode', openFilter),
      FacultyOpportunity.distinct('provider', openFilter),
      FacultyOpportunity.distinct('duration', openFilter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        types: types.filter(Boolean).sort(),
        domains: domains.filter(Boolean).sort(),
        modes: modes.filter(Boolean).sort(),
        providers: providers.filter(Boolean).sort(),
        durations: durations.filter(Boolean).sort(),
        allControlledTypes: FACULTY_OPPORTUNITY_TYPES,
        allControlledModes: FACULTY_OPPORTUNITY_MODES,
      },
    });
  } catch (error) {
    next(error);
  }
};
