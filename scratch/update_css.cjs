const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../client/src/index.css');
let content = fs.readFileSync(cssPath, 'utf8');

const startMarker = '/* ════════════════════════════════════════════════════════════════\n   PHASE 2: STUDENT PROFILE & DIGITAL PORTFOLIO STYLES';
const endMarker = '/* ==========================================================================\n   Phase 3 — Skill Assessment & Skill Engine Styles';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!', { startIndex, endIndex });
  process.exit(1);
}

const newCss = `/* ════════════════════════════════════════════════════════════════
   PHASE 2: STUDENT PROFILE & DIGITAL PORTFOLIO (REDESIGNED V2)
   Clean Modern Professional Light Theme
   ════════════════════════════════════════════════════════════════ */

.student-profile-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 32px 24px 60px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  color: #0f172a;
  background-color: transparent;
}

/* ── Toasts ── */
.profile-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.profile-toast--success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
}

.profile-toast--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.profile-toast__close {
  margin-left: auto;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  opacity: 0.8;
  display: flex;
  align-items: center;
}
.profile-toast__close:hover { opacity: 1; }

/* ── PROFILE HEADER (TASK 3) ── */
.profile-header-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 16px rgba(0, 0, 0, 0.02);
}

.profile-header-card__body {
  display: flex;
  align-items: flex-start;
  gap: 28px;
}

.profile-header-card__avatar {
  width: 92px;
  height: 92px;
  border-radius: 20px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 32px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
}

.profile-header-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-header-card__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.profile-header-card__name {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.profile-header-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.profile-header-card__headline {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.profile-header-card__meta {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 14px;
}

.profile-header-card__meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-header-card__actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-end;
  flex-shrink: 0;
}

/* ── Public Visibility Widget ── */
.profile-visibility-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 250px;
}

.profile-visibility-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.profile-visibility-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.profile-visibility-card__link-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-visibility-card__hint {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch__slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.25s;
  border-radius: 22px;
}

.toggle-switch__slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-switch input:checked + .toggle-switch__slider {
  background-color: #16a34a;
}

.toggle-switch input:checked + .toggle-switch__slider:before {
  transform: translateX(18px);
}

/* ── Completeness Banner ── */
.profile-completeness-banner {
  border-top: 1px solid #f1f5f9;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-completeness-banner__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-completeness-banner__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.profile-completeness-banner__score {
  font-size: 15px;
  font-weight: 700;
  color: #2563eb;
}

.profile-completeness-banner__bar-track {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
}

.profile-completeness-banner__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  border-radius: 8px;
  transition: width 0.4s ease;
}

.profile-completeness-banner__pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.comp-pill {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
}

.comp-pill--done {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.comp-pill--missing {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

/* ── STICKY NAVIGATION BAR ── */
.profile-sticky-nav {
  position: sticky;
  top: 64px;
  z-index: 40;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.nav-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.nav-pill:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.nav-pill--active {
  background: #2563eb;
  color: #ffffff;
}
.nav-pill--active:hover {
  background: #1d4ed8;
  color: #ffffff;
}

/* ── SECTION CARD CONTAINER (TASK 3) ── */
.profile-section-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.profile-section-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 16px;
}

.profile-section-card__title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-section-card__title h2 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.profile-limit-counter {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 10px;
  border-radius: 12px;
}

.profile-limit-reached-badge {
  font-size: 12px;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 4px 12px;
  border-radius: 8px;
}

/* Two-column layout on desktop, single on mobile (TASK 3 & TASK 28) */
.profile-two-col-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.profile-info-tile {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-info-tile__label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
}

.profile-info-tile__value {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.profile-info-tile__value--highlight {
  color: #2563eb;
  font-weight: 700;
}

.profile-bio-box,
.profile-interests-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-bio-text {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  margin: 0;
}

.profile-tag-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-tag {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
}

.profile-tech-badge {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
}

/* ── Resume Box (TASK 3 & TASK 10) ── */
.profile-resume-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.profile-resume-box__icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-resume-box__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-resume-box__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
}

.profile-status-badge--success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.profile-resume-box__filename {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.profile-resume-box__size {
  font-size: 13px;
  color: #64748b;
}

.profile-resume-box__date {
  font-size: 12px;
  color: #64748b;
}

.profile-resume-box__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Item Grid (Projects, Certifications) ── */
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.profile-item-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.profile-item-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.profile-item-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.profile-item-card__badge-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-item-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.profile-item-card__subtitle {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.profile-item-card__desc {
  font-size: 14px;
  line-height: 1.55;
  color: #334155;
  margin: 0;
  flex: 1;
}

.profile-item-card__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-item-card__meta-row {
  font-size: 13px;
  color: #64748b;
}

.profile-credential-id {
  font-size: 12px;
  font-family: monospace;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.profile-item-card__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  margin-top: auto;
}

.profile-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
}
.profile-link-btn:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* ── Stacked List (Achievements & Internships) ── */
.profile-list-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-list-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.profile-list-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.profile-list-item__icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-list-item__icon--achievement {
  background: #fdf2f8;
  color: #db2777;
}

.profile-list-item__icon--internship {
  background: #eff6ff;
  color: #2563eb;
}

.profile-list-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-list-item__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.profile-list-item__title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.profile-list-item__company {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.profile-list-item__meta,
.profile-list-item__period {
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-list-item__desc {
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
  margin: 2px 0 0;
}

/* ── Document Vault Layout (TASK 3 & TASK 19-21) ── */
.profile-vault-header-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.profile-filter-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
}

.profile-filter-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.profile-filter-btn--active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.profile-documents-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.profile-doc-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.profile-doc-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.profile-doc-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-doc-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-doc-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-doc-card__date {
  font-size: 11px;
  color: #64748b;
}

.profile-doc-card__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-doc-card__size {
  font-size: 12px;
  color: #64748b;
}

.profile-doc-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}

/* ── Generic Empty States (TASK 30) ── */
.profile-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.profile-empty-state h4 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.profile-empty-state p {
  font-size: 14px;
  color: #64748b;
  max-width: 480px;
  margin: 0;
  line-height: 1.5;
}

/* ═══════════════════════════════════════════════════
   BUTTON SYSTEM (TASK 27) — High Contrast & Clear
   ═══════════════════════════════════════════════════ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease-in-out;
  border: 1px solid transparent;
  line-height: 1.2;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--xs {
  font-size: 12px;
  padding: 6px 10px;
}

.btn--sm {
  font-size: 13px;
  padding: 7px 14px;
}

.btn--md {
  font-size: 14px;
  padding: 9px 18px;
}

.btn--lg {
  font-size: 15px;
  padding: 12px 24px;
}

.btn--primary {
  background: #2563eb;
  color: #ffffff;
  border-color: #1d4ed8;
}
.btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn--secondary {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}
.btn--secondary:hover:not(:disabled) {
  background: #e2e8f0;
  color: #0f172a;
}

.btn--outline {
  background: #ffffff;
  color: #334155;
  border-color: #cbd5e1;
}
.btn--outline:hover:not(:disabled) {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}

.btn--danger {
  background: #dc2626;
  color: #ffffff;
  border-color: #b91c1c;
}
.btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-icon {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.btn-icon--danger {
  color: #dc2626;
}
.btn-icon--danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.icon--primary { color: #2563eb; }
.icon--accent { color: #d97706; }
.icon--success { color: #16a34a; }
.icon--muted { color: #94a3b8; }

/* ═══════════════════════════════════════════════════
   MODAL DIALOGS (TASK 28, TASK 29, TASK 31)
   ═══════════════════════════════════════════════════ */
.profile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.profile-modal {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.profile-modal--sm {
  max-width: 480px;
}

.profile-modal--lg {
  max-width: 900px;
  height: 85vh;
}

.profile-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.profile-modal__header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.profile-modal__header--danger {
  border-bottom-color: #fee2e2;
  background: #fef2f2;
}

.profile-modal__close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}
.profile-modal__close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.profile-modal__body {
  padding: 24px;
}

.profile-modal__delete-message {
  font-size: 15px;
  line-height: 1.6;
  color: #334155;
  margin: 0;
}

.profile-modal__error {
  margin: 16px 24px 0;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.profile-modal__form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.form-control {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
}

.form-control:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.form-hint {
  font-size: 12px;
  color: #64748b;
}

.file-input {
  padding: 8px;
  background: #f8fafc;
}

.checkbox-row {
  flex-direction: row;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #334155;
  cursor: pointer;
}

.slug-input-wrapper {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
}

.slug-prefix {
  padding: 10px 12px;
  background: #f8fafc;
  font-size: 13px;
  color: #64748b;
  border-right: 1px solid #cbd5e1;
}

.slug-input {
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.profile-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 18px;
  border-top: 1px solid #e2e8f0;
}

/* ── Document Viewer Inside Modal ── */
.profile-modal__preview-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  max-width: 450px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-modal__preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-modal__viewer-container {
  flex: 1;
  width: 100%;
  height: calc(85vh - 70px);
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.profile-modal__preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.profile-modal__preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  padding: 16px;
}

/* ═══════════════════════════════════════════════════
   PUBLIC PORTFOLIO PAGE STYLES (/portfolio/:slug) (TASK 23, 24, 26)
   Clean Modern White Theme
   ═══════════════════════════════════════════════════ */

.public-portfolio-page {
  min-height: 100vh;
  background: #ffffff;
  color: #0f172a;
  display: flex;
  flex-direction: column;
}

.public-portfolio-nav {
  height: 64px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.public-portfolio-nav__container {
  max-width: 1120px;
  margin: 0 auto;
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.public-portfolio-nav__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #0f172a;
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.01em;
}

.public-portfolio-nav__logo-mark {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-portfolio-nav__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.public-portfolio-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* Public Hero */
.public-hero-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 40px;
  display: flex;
  align-items: flex-start;
  gap: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.public-hero-card__avatar {
  width: 108px;
  height: 108px;
  border-radius: 24px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 38px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.2);
}

.public-hero-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.public-hero-card__top-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.public-hero-card__name {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.public-badge-verified {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.public-hero-card__headline {
  font-size: 17px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.public-hero-card__meta {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 14px;
}

.public-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.public-hero-card__bio {
  font-size: 15px;
  line-height: 1.6;
  color: #334155;
  margin: 4px 0 0;
}

.public-hero-card__actions {
  margin-top: 12px;
}

.public-tag-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.public-tag {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.public-tech-badge {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
}

/* Public Sections */
.public-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.public-section__header {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 12px;
}

.public-section__header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

/* Public Skills Grid */
.public-skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.public-skill-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.public-skill-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.public-skill-card__level {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.public-skill-card__score-badge {
  font-size: 14px;
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 4px 10px;
  border-radius: 8px;
}

/* Public Project & Cert Cards */
.public-projects-grid,
.public-certs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.public-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.public-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.public-card__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.public-card__icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-card__title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.public-card__subtitle {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.public-card__desc {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  margin: 0;
  flex: 1;
}

.public-card__meta-row {
  font-size: 13px;
  color: #64748b;
}

.public-credential-id {
  font-size: 12px;
  font-family: monospace;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.public-card__footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  margin-top: auto;
}

.public-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
}
.public-link-btn:hover {
  text-decoration: underline;
}

.public-link-btn--primary {
  color: #2563eb;
  font-weight: 700;
}

/* Public List Stack (Internships & Achievements) */
.public-list-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.public-list-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.public-list-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-list-card__icon--achievement {
  background: #fdf2f8;
  color: #db2777;
}

.public-list-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.public-list-card__title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.public-list-card__company {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.public-list-card__period {
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.public-list-card__desc {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  margin: 4px 0 0;
}

/* Private / Not Found Card */
.public-portfolio-private {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.private-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 48px 36px;
  max-width: 500px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
}

.private-card__icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
}

.private-card h2 {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.private-card p {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.public-portfolio-loading {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #64748b;
}

/* Public Footer */
.public-portfolio-footer {
  margin-top: auto;
  border-top: 1px solid #e2e8f0;
  padding: 28px 24px;
  background: #f8fafc;
}

.public-portfolio-footer__container {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #64748b;
}

.public-portfolio-footer__link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}
.public-portfolio-footer__link:hover {
  text-decoration: underline;
}

/* ── Responsive Breakpoints (TASK 26) ── */
@media (max-width: 992px) {
  .profile-grid,
  .public-projects-grid,
  .public-certs-grid {
    grid-template-columns: 1fr;
  }

  .profile-documents-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .profile-header-card__body,
  .public-hero-card {
    flex-direction: column;
  }

  .profile-header-card__actions {
    align-items: flex-start;
    width: 100%;
  }

  .profile-visibility-card {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .student-profile-page {
    padding: 16px 12px 40px;
    gap: 20px;
  }

  .profile-header-card,
  .profile-section-card,
  .public-hero-card {
    padding: 20px 16px;
  }

  .profile-two-col-grid,
  .form-row,
  .profile-documents-grid {
    grid-template-columns: 1fr;
  }

  .profile-resume-box {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-resume-box__actions {
    width: 100%;
  }

  .profile-resume-box__actions .btn {
    flex: 1;
  }

  .profile-header-card__title-row h1,
  .public-hero-card__name {
    font-size: 22px;
  }
}

`;

const updatedContent = content.slice(0, startIndex) + newCss + content.slice(endIndex);
fs.writeFileSync(cssPath, updatedContent, 'utf8');
console.log('CSS updated successfully! Replaced', endIndex - startIndex, 'bytes with', newCss.length, 'bytes');
