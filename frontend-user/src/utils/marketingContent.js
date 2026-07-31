const formatCmsDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN");
};

export const mapCmsContentItem = (item = {}) => ({
  slug: item.slug,
  status: item.status || "active",
  startDate: formatCmsDate(item.start_date || item.startDate || item.published_at || item.created_at),
  endDate: formatCmsDate(item.end_date || item.endDate),
  date: formatCmsDate(item.published_at || item.created_at),
  author: item.author || "AuraCinema",
  title: item.title || "",
  category: item.category || "",
  summary: item.summary || item.excerpt || "",
  excerpt: item.excerpt || item.summary || "",
  viewCount: Number(item.view_count || item.viewCount || 0),
  thumbnail: item.thumbnail || item.thumbnail_url || item.image_url || "",
  contentHtml: item.content_html || item.contentHtml || item.content || "",
});
