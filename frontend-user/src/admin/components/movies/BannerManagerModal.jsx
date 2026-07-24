import { useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from "react-icons/hi";

const normalizeBanners = (movie) => {
  const banners = Array.isArray(movie?.banners) ? movie.banners : [];
  const urls = banners
    .concat(movie?.banner ? [movie.banner] : [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(urls));
};

const BannerManagerModal = ({ isOpen, movie, isLoading, onClose, onSubmit }) => {
  const [banners, setBanners] = useState([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setBanners(normalizeBanners(movie));
    setNewBannerUrl("");
    setError("");
  }, [isOpen, movie]);

  if (!isOpen || !movie) return null;

  const addBanner = () => {
    const value = newBannerUrl.trim();

    if (!value) {
      setError("Vui lòng nhập đường dẫn banner.");
      return;
    }

    try {
      new URL(value);
    } catch {
      setError("Đường dẫn banner không hợp lệ.");
      return;
    }

    if (banners.includes(value)) {
      setError("Banner này đã có trong danh sách.");
      return;
    }

    setBanners((current) => [...current, value]);
    setNewBannerUrl("");
    setError("");
  };

  const removeBanner = (indexToRemove) => {
    setBanners((current) => current.filter((_, index) => index !== indexToRemove));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(movie, banners);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large banner-manager-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Quản lý Banner</h2>
            <p className="modal-subtitle">{movie.title}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="banner-manager-add">
              <div className="form-group">
                <label className="form-label">Đường dẫn Banner</label>
                <input
                  type="url"
                  className={`form-input ${error ? "error" : ""}`}
                  placeholder="https://example.com/banner.jpg"
                  value={newBannerUrl}
                  onChange={(event) => {
                    setNewBannerUrl(event.target.value);
                    if (error) setError("");
                  }}
                />
                {error ? <p className="form-error">{error}</p> : null}
              </div>
              <button className="btn btn-secondary" type="button" onClick={addBanner}>
                <HiOutlinePlus />
                Thêm
              </button>
            </div>

            <div className="banner-manager-list">
              {banners.length ? (
                banners.map((banner, index) => (
                  <div className="banner-manager-item" key={`${banner}-${index}`}>
                    <div className="banner-preview">
                      <img
                        src={banner}
                        alt={`Banner ${index + 1}`}
                        onError={(event) => {
                          event.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='120'%3E%3Crect fill='%23242d4a' width='320' height='120'/%3E%3Ctext fill='%23fff' font-size='14' x='112' y='66'%3EInvalid banner%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="banner-manager-url">
                      <span>{index === 0 ? "Banner chính" : `Banner ${index + 1}`}</span>
                      <strong title={banner}>{banner}</strong>
                    </div>
                    <button
                      className="btn btn-icon btn-ghost"
                      type="button"
                      onClick={() => removeBanner(index)}
                      title="Xóa banner"
                    >
                      <HiOutlineTrash />
                    </button>
                  </div>
                ))
              ) : (
                <div className="banner-manager-empty">
                  Chưa có banner nào cho phim này.
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Hủy bỏ
            </button>
            <button className="btn btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Cập nhật banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerManagerModal;
