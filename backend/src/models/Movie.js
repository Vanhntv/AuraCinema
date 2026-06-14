import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    poster: {
      type: String,
      default: null,
    },
    banner: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
    release_date: {
      type: Date,
      default: null,
    },
    director: {
      type: String,
      default: null,
    },
    actors: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: null,
    },
    age_limit: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["coming_soon", "now_showing", "ended"],
      default: "coming_soon",
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
