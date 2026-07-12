import { HiOutlineX } from "react-icons/hi";
import { getYoutubeEmbedUrl } from "../../utils/youtube";

const TrailerModal = ({ isOpen, title = "Trailer", trailerUrl, onClose }) => {
  if (!isOpen) return null;

  const embedUrl = getYoutubeEmbedUrl(trailerUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal trailer-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" type="button" onClick={onClose} title="Đóng">
            <HiOutlineX />
          </button>
        </div>

        <div className="trailer-modal-body">
          {embedUrl ? (
            <iframe
              className="trailer-frame"
              src={`${embedUrl}?autoplay=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="trailer-invalid">Trailer không hợp lệ</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;
