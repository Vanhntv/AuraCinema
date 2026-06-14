import { useEffect, useState } from "react";
import {
  getGenres,
  createGenre,
  deleteGenre,
} from "../services/genreService";

const HomePage = () => {
  const [genres, setGenres] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const fetchGenres = async () => {
    const data = await getGenres();
    setGenres(data.data);
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await createGenre(formData);

    setFormData({
      name: "",
      description: "",
    });

    fetchGenres();
  };

  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa?")) {
      await deleteGenre(id);
      fetchGenres();
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Quản lý thể loại</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Tên thể loại"
          value={formData.name}
          onChange={(e) =>
            setFormData({
              ...formData,
              name: e.target.value,
            })
          }
        />

        <br />
        <br />

        <input
          type="text"
          placeholder="Mô tả"
          value={formData.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value,
            })
          }
        />

        <br />
        <br />

        <button type="submit">
          Thêm mới
        </button>
      </form>

      <hr />

      {genres.map((item) => (
        <div key={item._id}>
          <h3>{item.name}</h3>

          <p>{item.description}</p>

          <button
            onClick={() =>
              handleDelete(item._id)
            }
          >
            Xóa
          </button>

          <hr />
        </div>
      ))}
    </div>
  );
};

export default HomePage;