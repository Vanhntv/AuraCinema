const GenreTable = ({ genres }) => {

  // Format ngày tạo
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";

    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  return (
    <table className="data-table">

      {/* Header bảng */}
      <thead>
        <tr>
          <th style={{ width: "50px" }}>#</th>

          <th>
            Tên thể loại
          </th>

          <th>
            Mô tả
          </th>

          <th>
            Ngày tạo
          </th>

        </tr>
      </thead>


      <tbody>

        {/* Không có dữ liệu */}
        {genres.length === 0 ? (

          <tr>

            <td colSpan="4">

              <div className="table-empty">

                <div className="table-empty-icon">
                  🎬
                </div>


                <div className="table-empty-text">
                  Chưa có thể loại nào
                </div>


                <div className="table-empty-sub">
                  Hãy thêm thể loại đầu tiên cho hệ thống
                </div>

              </div>

            </td>

          </tr>


        ) : (


          // Render danh sách
          genres.map((genre, index) => (

            <tr key={genre._id}>


              {/* STT */}
              <td
                style={{
                  color: "var(--color-text-muted)",
                  fontWeight: 500
                }}
              >

                {index + 1}

              </td>



              {/* Tên thể loại */}
              <td className="table-cell-name">

                {genre.name}

              </td>




              {/* Mô tả */}
              <td className="table-cell-desc">

                {genre.description}

              </td>




              {/* Ngày tạo */}
              <td className="table-cell-date">

                {formatDate(genre.createdAt)}

              </td>


            </tr>

          ))

        )}

      </tbody>

    </table>
  );
};


export default GenreTable;