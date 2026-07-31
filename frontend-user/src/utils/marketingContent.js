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

export const mapCmsContentItem = (item = {}) => {
  const contentHtml = item.content_html || item.contentHtml || item.content || "";

  return {
    ...item,
    id: item._id || item.id,
    slug: item.slug,
    status: item.status || "active",
    title: item.title || "",
    category: item.category || (item.type === "promotion" ? "Khuyến mãi" : "Tin tức"),
    summary: item.summary || item.excerpt || "",
    excerpt: item.excerpt || item.summary || "",
    thumbnail: item.thumbnail || item.thumbnail_url || item.image_url || "",
    contentHtml,
    content_html: contentHtml,
    author: item.author || "AuraCinema",
    date: formatContentDate(item.published_at || item.created_at),
    startDate: formatContentDate(item.start_date || item.startDate || item.published_at || item.created_at),
    endDate: formatContentDate(item.end_date || item.endDate),
    viewCount: Number(item.view_count || item.viewCount || 0),
    linkedVoucher: item.linked_voucher_id || item.linkedVoucher || null,
  };
};
