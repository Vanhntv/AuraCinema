import mongoose from "mongoose";

const trailerSchema = new mongoose.Schema(
  {
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    youtube_url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const Trailer = mongoose.model("Trailer", trailerSchema);

export default Trailer;
