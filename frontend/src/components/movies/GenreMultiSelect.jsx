import { useState, useEffect, useRef } from "react";
import { HiOutlineChevronDown, HiOutlineX } from "react-icons/hi";

const GenreMultiSelect = ({ options, selected, onChange, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (option) => {
    const isSelected = selected.some((s) => s._id === option._id);
    if (isSelected) {
      onChange(selected.filter((s) => s._id !== option._id));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleRemove = (optionId) => {
    onChange(selected.filter((s) => s._id !== optionId));
  };

  return (
    <div className="genre-multi-select" ref={containerRef}>
      <div
        className="multi-select-input"
        onClick={() => !isLoading && setIsOpen(!isOpen)}
      >
        <div className="multi-select-values">
          {selected.length === 0 ? (
            <span className="multi-select-placeholder">
              Chọn một hoặc nhiều thể loại...
            </span>
          ) : (
            selected.map((item) => (
              <div key={item._id} className="multi-select-tag">
                <span>{item.name}</span>
                <button
                  type="button"
                  className="multi-select-tag-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item._id);
                  }}
                >
                  <HiOutlineX />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="multi-select-icon">
          <HiOutlineChevronDown
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      </div>

      {isOpen && (
        <div className="multi-select-dropdown">
          <input
            type="text"
            className="multi-select-search"
            placeholder="Tìm kiếm thể loại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <div className="multi-select-empty">Không tìm thấy thể loại</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.some(
                  (s) => s._id === option._id
                );
                return (
                  <label key={option._id} className="multi-select-option">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelect(option)}
                    />
                    <span>{option.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreMultiSelect;
