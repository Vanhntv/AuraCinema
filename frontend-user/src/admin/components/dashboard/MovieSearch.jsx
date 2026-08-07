import { useEffect, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineFilm,
  HiOutlineSearch,
  HiOutlineX,
} from "react-icons/hi";
import { getMovies } from "../../services/movieService";

const statusLabels = {
  now_showing: "Đang chiếu",
  coming_soon: "Sắp chiếu",
  ended: "Đã kết thúc",
};

const MovieSearch = ({ selectedMovie, onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (
      normalizedQuery.length < 2 ||
      (selectedMovie && normalizedQuery === selectedMovie.title)
    ) {
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getMovies(normalizedQuery, 1, 6);
        if (active) {
          setResults(response.data || []);
          setOpen(true);
        }
      } catch {
        if (active) {
          setResults([]);
          setError("Không thể tìm kiếm phim.");
          setOpen(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selectedMovie]);

  const handleChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    setOpen(true);
    if (selectedMovie) onSelect(null);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
    }
  };

  const handleSelect = (movie) => {
    onSelect(movie);
    setQuery(movie.title);
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    setResults([]);
    setError("");
    setOpen(false);
  };

  return (
    <div className="dashboard-movie-search">
      <div className="dashboard-movie-search-input-wrap">
        <HiOutlineSearch />
        <input
          aria-autocomplete="list"
          aria-expanded={open}
          aria-label="Tìm kiếm phim"
          className="form-input dashboard-movie-search-input"
          onBlur={() => setOpen(false)}
          onChange={handleChange}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Tìm kiếm phim..."
          role="combobox"
          type="search"
          value={query}
        />
        {query && (
          <button
            aria-label="Xóa phim đã chọn"
            className="dashboard-movie-search-clear"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClear}
            type="button"
          >
            <HiOutlineX />
          </button>
        )}
      </div>

      {open && (
        <div className="dashboard-movie-results" role="listbox">
          {loading ? (
            <div className="dashboard-movie-result-state">Đang tìm phim...</div>
          ) : error ? (
            <div className="dashboard-movie-result-state error">{error}</div>
          ) : results.length ? (
            results.map((movie) => (
              <button
                aria-selected="false"
                className="dashboard-movie-result"
                key={movie._id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(movie)}
                role="option"
                type="button"
              >
                <span className="dashboard-movie-result-icon">
                  <HiOutlineFilm />
                </span>
                <span>
                  <strong>{movie.title}</strong>
                  <small>
                    {statusLabels[movie.status] || "Chưa xác định"}
                    {movie.duration ? ` · ${movie.duration} phút` : ""}
                  </small>
                </span>
              </button>
            ))
          ) : (
            query.trim().length >= 2 && (
              <div className="dashboard-movie-result-state">
                Không tìm thấy phim phù hợp.
              </div>
            )
          )}
        </div>
      )}

      {selectedMovie && (
        <div className="dashboard-selected-movie">
          <HiOutlineCheckCircle />
          <span>
            Đã chọn: <strong>{selectedMovie.title}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default MovieSearch;
