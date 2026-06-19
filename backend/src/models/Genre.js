import mongoose from "mongoose";

const genreSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
        deleted_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Genre = mongoose.model("Genre", genreSchema)
export default Genre;
