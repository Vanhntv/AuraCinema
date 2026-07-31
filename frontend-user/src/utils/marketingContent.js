const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const formatContentDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
};

export const mapCmsContentItem = (item = {}) => ({
  ...item,
  id: item._id || item.id,
  slug: item.slug,
  title: item.title,
  summary: item.summary,
  excerpt: item.summary,
  thumbnail: item.thumbnail,
  category: item.category || (item.type === "promotion" ? "Khuyến mãi" : "Tin tức"),
  contentHtml: item.content_html || item.contentHtml || "",
  content_html: item.content_html || item.contentHtml || "",
  author: item.author || "AuraCinema",
  date: formatContentDate(item.published_at || item.created_at),
  startDate: formatContentDate(item.start_date),
  endDate: formatContentDate(item.end_date),
  viewCount: Number(item.view_count || item.viewCount || 0),
  status: item.status,
  linkedVoucher: item.linked_voucher_id || null,
});
