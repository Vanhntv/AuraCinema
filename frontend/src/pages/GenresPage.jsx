import { useState, useEffect, useMemo, useCallback } from "react";
import {
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineRefresh,
} from "react-icons/hi";

import { getGenres } from "../services/genreService";
import GenreTable from "../components/genres/GenreTable";


const GenresPage = () => {

  // Danh sách thể loại
  const [genres, setGenres] = useState([]);

  // Loading
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");


  // Lấy danh sách thể loại từ API
  const fetchGenres = useCallback(async () => {

    try {

      setLoading(true);

      const data = await getGenres();

      setGenres(data.data || []);


    } catch (error) {

      console.error(
        "Không thể tải danh sách thể loại",
        error
      );


    } finally {

      setLoading(false);

    }

  }, []);



  // Gọi API khi mở trang
  useEffect(() => {

    fetchGenres();

  }, [fetchGenres]);




  // Tìm kiếm thể loại
  const filteredGenres = useMemo(() => {

    if (!searchQuery.trim()) {

      return genres;

    }


    const query = searchQuery.toLowerCase();


    return genres.filter((genre) =>

      genre.name
        .toLowerCase()
        .includes(query)

      ||

      genre.description
        .toLowerCase()
        .includes(query)

    );


  }, [genres, searchQuery]);




  return (

    <>

      {/* Header */}
      <div className="page-header">

        <div className="page-header-info">

          <h1>
            Quản lý Thể loại
          </h1>


          <p>
            Danh sách thể loại phim trong hệ thống AuraCinema
          </p>

        </div>


        <button
          className="btn btn-secondary"
          onClick={fetchGenres}
        >

          <HiOutlineRefresh />

          Làm mới

        </button>


      </div>





      {/* Tổng số lượng */}
      <div className="stats-grid">

        <div className="stat-card">


          <div className="stat-card-icon purple">

            <HiOutlineTag />

          </div>


          <div>

            <div className="stat-card-value">

              {genres.length}

            </div>


            <div className="stat-card-label">

              Tổng thể loại

            </div>


          </div>


        </div>


      </div>






      {/* Table */}
      <div className="table-container">


        <div className="table-toolbar">


          <div className="table-toolbar-left">


            <span className="table-toolbar-title">

              Danh sách thể loại

            </span>


            <span className="table-toolbar-count">

              {filteredGenres.length} kết quả

            </span>


          </div>





          {/* Search */}
          <div className="table-search">


            <HiOutlineSearch
              className="table-search-icon"
            />


            <input

              type="text"

              className="table-search-input"

              placeholder="Tìm kiếm thể loại..."

              value={searchQuery}

              onChange={(e) =>
                setSearchQuery(e.target.value)
              }

            />


          </div>


        </div>






        {
          loading

          ?

          (
            <div className="loading-spinner">

              <div className="spinner"></div>

            </div>
          )


          :

          (

            <GenreTable

              genres={filteredGenres}

            />

          )

        }



      </div>


    </>

  );

};


export default GenresPage;