import { useState, useRef, useEffect, useId } from 'react';
import { Search, ChevronDown, Check, Building2 } from 'lucide-react';
import { getInstitutions } from '../../data/mockInstitutions';

export default function InstitutionSelect({
  label = 'Institution / University',
  value = '',
  onChange,
  error = '',
  required = true,
  className = '',
  placeholder = 'Select your institution',
  hint = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const institutions = getInstitutions();

  // Find currently selected institution object
  const selectedInstitution = institutions.find(
    (inst) => inst.institutionId === value
  );

  // Filter institutions based on search query (case-insensitive)
  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      inst.institutionName.toLowerCase().includes(term) ||
      (inst.code && inst.code.toLowerCase().includes(term)) ||
      (inst.state && inst.state.toLowerCase().includes(term))
    );
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard ESC to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (inst) => {
    if (onChange) {
      // Return synthetic event with institutionId as value and institutionName
      onChange({
        target: {
          name: 'institutionId',
          value: inst.institutionId,
          institutionName: inst.institutionName,
        },
      });
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    setSearchTerm('');
  };

  return (
    <div
      ref={containerRef}
      className={`form-group institution-select ${className}`.trim()}
      style={{ position: 'relative' }}
    >
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="form-label__required">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        id={id}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`form-input institution-select__trigger ${
          error ? 'form-input--error' : ''
        } ${isOpen ? 'institution-select__trigger--open' : ''}`.trim()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          paddingRight: '16px',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selectedInstitution
              ? 'var(--color-ink)'
              : 'rgba(41, 37, 43, 0.45)',
            fontWeight: selectedInstitution ? '500' : '400',
          }}
        >
          <Building2
            size={18}
            style={{
              color: selectedInstitution
                ? 'var(--color-ember)'
                : 'var(--color-ink-muted)',
              flexShrink: 0,
            }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedInstitution
              ? selectedInstitution.institutionName
              : placeholder}
          </span>
        </span>

        <ChevronDown
          size={18}
          style={{
            color: 'var(--color-ink-muted)',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="institution-select__menu animate-fade-in"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 150,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            maxHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-ivory)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search registered institutions..."
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13.5px',
                color: 'var(--color-ink)',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Institution List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '6px 0',
            }}
          >
            {filteredInstitutions.length > 0 ? (
              filteredInstitutions.map((inst) => {
                const isSelected = inst.institutionId === value;
                return (
                  <div
                    key={inst.institutionId}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(inst)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected
                        ? 'rgba(216, 92, 63, 0.08)'
                        : 'transparent',
                      transition: 'background-color 0.15s ease',
                      gap: '12px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          'rgba(41, 37, 43, 0.03)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: isSelected ? '600' : '500',
                          color: isSelected
                            ? 'var(--color-ember)'
                            : 'var(--color-ink)',
                          lineHeight: 1.35,
                        }}
                      >
                        {inst.institutionName}
                      </div>
                      {inst.type && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--color-ink-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {inst.type} {inst.state ? `• ${inst.state}` : ''}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check
                        size={16}
                        style={{ color: 'var(--color-ember)', flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--color-ink-muted)',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: '600', color: 'var(--color-ink)', marginBottom: '4px' }}>
                  No matching registered institution
                </div>
                <div style={{ fontSize: '12px', maxWidth: '300px', margin: '0 auto', lineHeight: 1.4 }}>
                  Only institutions currently registered in CampusVault can be selected. Custom entries are not permitted.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} className="form-error" role="alert">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="form-hint">{hint}</p>
      )}
    </div>
  );
}
