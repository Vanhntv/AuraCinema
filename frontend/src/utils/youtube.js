export const getYoutubeEmbedUrl = (url) => {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (!hostname.endsWith("youtube.com")) return "";

    if (parsed.pathname.includes("/embed/")) {
      const id = parsed.pathname.split("/embed/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (parsed.pathname.includes("/shorts/")) {
      const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    const id = parsed.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch {
    return "";
  }
};

export const isValidYoutubeUrl = (url) => Boolean(getYoutubeEmbedUrl(url));
