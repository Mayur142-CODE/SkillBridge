import React from 'react';

/**
 * @typedef {Object} TabItem
 * @property {string|number} id - Unique identifier for the tab
 * @property {string} label - Display text
 * @property {React.ReactNode} [icon] - Optional icon element
 * @property {number|string} [count] - Optional counter badge value
 * @property {boolean} [disabled] - Whether the tab is disabled
 */

/**
 * Reusable SegmentedTabs component adhering strictly to SkillBridge design system.
 * Supports standard application tabs and compact filter pill variants.
 *
 * @param {Object} props
 * @param {TabItem[]} props.tabs - Array of tab definitions
 * @param {string|number} props.activeTab - Currently active tab id
 * @param {function(string|number): void} props.onChange - Tab click handler
 * @param {'default' | 'compact'} [props.variant='default'] - Visual size variant
 * @param {string} [props.ariaLabel='Navigation Tabs'] - Accessibility label for tablist
 * @param {string} [props.className=''] - Optional additional CSS class
 */
export default function SegmentedTabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'default',
  ariaLabel = 'Navigation Tabs',
  className = '',
}) {
  const isCompact = variant === 'compact';
  const containerClass = `segmented-tabs ${isCompact ? 'segmented-tabs--compact' : ''} ${className}`.trim();

  return (
    <nav className={containerClass} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasCount = tab.count !== undefined && tab.count !== null;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            className={`segmented-tab ${isActive ? 'segmented-tab--active' : ''}`}
            onClick={() => {
              if (!tab.disabled && onChange) {
                onChange(tab.id);
              }
            }}
          >
            {tab.icon && <span className="segmented-tab__icon">{tab.icon}</span>}
            <span className="segmented-tab__label">{tab.label}</span>
            {hasCount && (
              <span className="segmented-tab__count">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
