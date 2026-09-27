import { useId, useState } from "react";
import { HiOutlineX } from "react-icons/hi";

const parseDelimitedList = (value) => String(value || "").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);

const GiftConditionSelect = ({ label, options, value, onChange, disabled, loading, loadError, error, selectAllLabel, compact = false, itemLabel = "phim" }) => {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const selectedIds = parseDelimitedList(value);
  const remaining = options.filter((item) => !selectedIds.includes(item._id));
  const allSelected = !loading && !loadError && options.length > 0 && remaining.length === 0 && selectedIds.length === options.length;
  const visibleIds = compact && !expanded ? (allSelected ? [] : selectedIds.slice(0, 2)) : selectedIds;
  const renderSelection = (id) => {
    const item = options.find((entry) => entry._id === id);
    const name = item?.title || item?.name || `Mục đã chọn (${id})`;
    return <span key={id} className="gift-condition-selection"><span className="gift-condition-name" title={name}>{name}</span><button type="button" aria-label={`Bỏ chọn ${name}`} disabled={disabled} onClick={() => onChange(selectedIds.filter((entry) => entry !== id).join(", "))}><HiOutlineX /></button></span>;
  };
  return <>
    <select aria-label={label} className={`form-input ${error ? "error" : ""}`} value="" disabled={disabled || loading || Boolean(loadError)} onChange={(event) => {
      if (selectAllLabel && event.target.value === "select-all") {
        onChange([...new Set([...selectedIds, ...options.map((item) => item._id)])].join(", "));
        return;
      }
      if (event.target.value) onChange([...new Set([...selectedIds, event.target.value])].join(", "));
    }}>
      <option value="">{loading ? "Đang tải danh sách..." : loadError ? "Không tải được danh sách" : remaining.length ? `Chọn ${label.toLowerCase()}` : compact && allSelected ? `Đã chọn tất cả ${itemLabel}` : "Không có mục để chọn"}</option>
      {selectAllLabel && options.length > 0 && <option value="select-all" disabled={remaining.length === 0}>{selectAllLabel}</option>}
      {remaining.map((item) => <option key={item._id} value={item._id}>{item.title || item.name}</option>)}
    </select>
    {selectedIds.length > 0 && <>
      {compact && allSelected && <p className="gift-condition-summary">Đã chọn tất cả {options.length} {itemLabel}</p>}
      <div id={listId} className={`gift-condition-selections${compact ? " gift-condition-selections-compact" : ""}${compact && expanded ? " gift-condition-selections-expanded" : ""}`}>
        {visibleIds.map(renderSelection)}
        {compact && !expanded && !allSelected && selectedIds.length > 2 && <button type="button" className="gift-condition-more" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(true)}>+{selectedIds.length - 2} {itemLabel}</button>}
      </div>
      {compact && <div className="gift-condition-actions">
        {(allSelected || selectedIds.length > 2 || expanded) && <button type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded((prev) => !prev)}>{expanded ? "Thu gọn" : "Xem danh sách"}</button>}
        <button type="button" disabled={disabled} onClick={() => { onChange(""); setExpanded(false); }}>Bỏ chọn tất cả</button>
      </div>}
    </>}
    {loadError && <p className="form-error">{loadError}</p>}
    {error && <p className="form-error">{error}</p>}
  </>;
};

export default GiftConditionSelect;
