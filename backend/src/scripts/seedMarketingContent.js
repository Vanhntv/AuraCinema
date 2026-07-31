import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import MarketingContent from "../models/MarketingContent.js";
import { newsArticles } from "../../../frontend-user/src/data/newsContent.js";
import { promotionItems } from "../../../frontend-user/src/data/promotionContent.js";

const parseVietnameseDate = (value) => {
  if (!value) return null;
  const parts = String(value).split("/").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [day, month, year] = parts;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const normalizeHtml = (value = "") => String(value).trim();

const mapNewsArticle = (article) => ({
  type: "news",
  slug: article.slug,
  title: article.title,
  summary: article.excerpt || article.summary,
  thumbnail: article.thumbnail,
  category: article.category || "Tin tức",
  content_html: normalizeHtml(article.contentHtml),
  author: article.author || "AuraCinema",
  status: "published",
  published_at: parseVietnameseDate(article.date) || new Date(),
  start_date: null,
  end_date: null,
  linked_voucher_id: null,
  view_count: Number(article.viewCount || 0),
  deleted_at: null,
});

const mapPromotion = (promotion) => ({
  type: "promotion",
  slug: promotion.slug,
  title: promotion.title,
  summary: promotion.summary,
  thumbnail: promotion.thumbnail,
  category: promotion.category || "Khuyến mãi",
  content_html: normalizeHtml(promotion.contentHtml),
  author: "AuraCinema",
  status: "published",
  published_at: parseVietnameseDate(promotion.startDate) || new Date(),
  start_date: parseVietnameseDate(promotion.startDate),
  end_date: parseVietnameseDate(promotion.endDate),
  linked_voucher_id: null,
  view_count: Number(promotion.viewCount || 0),
  deleted_at: null,
});

const seedMarketingContent = async () => {
  await connectDB();

  const items = [
    ...newsArticles.map(mapNewsArticle),
    ...promotionItems.map(mapPromotion),
  ];

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const result = await MarketingContent.updateOne(
      { type: item.type, slug: item.slug },
      { $set: item },
      { upsert: true, runValidators: true },
    );

    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  console.log(`Marketing CMS seed completed: ${created} created, ${updated} updated, ${items.length} total.`);
  await mongoose.disconnect();
};

seedMarketingContent().catch(async (error) => {
  console.error("Marketing CMS seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
