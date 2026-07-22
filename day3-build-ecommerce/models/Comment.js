const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    itemTitle: {
      type: String,
      required: true,
      trim: true,
    },
    itemArtist: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Comment must be at most 1000 characters"],
    },
  },
  { timestamps: true }
);

commentSchema.index({ itemTitle: 1, itemArtist: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
