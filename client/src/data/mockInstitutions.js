/**
 * CampusVault / SkillBridge — Registered Institutions Dataset
 *
 * In this stage, realistic mock institution data is used.
 * In production, this module will fetch from the backend API:
 *   Database -> Institutions table -> GET /api/institutions
 *
 * Users select an existing institution by its ID/value, not arbitrary text.
 * Conceptually:
 *   institutionId: unique identifier
 *   institutionName: display name
 */

export const MOCK_INSTITUTIONS = [
  {
    institutionId: 'inst_abc_univ',
    institutionName: 'ABC University',
    code: 'ABCU',
    state: 'Delhi',
    type: 'Central University',
  },
  {
    institutionId: 'inst_dtu',
    institutionName: 'Delhi Technological University',
    code: 'DTU',
    state: 'Delhi',
    type: 'State University',
  },
  {
    institutionId: 'inst_gec',
    institutionName: 'Government Engineering College',
    code: 'GEC',
    state: 'Gujarat',
    type: 'Government College',
  },
  {
    institutionId: 'inst_iitb',
    institutionName: 'Indian Institute of Technology, Bombay',
    code: 'IITB',
    state: 'Maharashtra',
    type: 'Institute of National Importance',
  },
  {
    institutionId: 'inst_iitd',
    institutionName: 'Indian Institute of Technology, Delhi',
    code: 'IITD',
    state: 'Delhi',
    type: 'Institute of National Importance',
  },
  {
    institutionId: 'inst_iot',
    institutionName: 'Institute of Technology',
    code: 'IOT',
    state: 'Karnataka',
    type: 'Autonomous Institute',
  },
  {
    institutionId: 'inst_nce',
    institutionName: 'National College of Engineering',
    code: 'NCE',
    state: 'Tamil Nadu',
    type: 'Affiliated College',
  },
  {
    institutionId: 'inst_xyz_univ',
    institutionName: 'XYZ University',
    code: 'XYZU',
    state: 'Maharashtra',
    type: 'State University',
  },
].sort((a, b) => a.institutionName.localeCompare(b.institutionName));

/**
 * Retrieve all registered institutions sorted alphabetically
 */
export const getInstitutions = () => MOCK_INSTITUTIONS;

/**
 * Find institution by ID
 */
export const getInstitutionById = (id) =>
  MOCK_INSTITUTIONS.find((inst) => inst.institutionId === id);

/**
 * Get institution display name from ID
 */
export const getInstitutionName = (id) => {
  const inst = getInstitutionById(id);
  return inst ? inst.institutionName : id;
};
