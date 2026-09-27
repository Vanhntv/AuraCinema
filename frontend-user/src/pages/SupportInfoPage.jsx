import { useEffect, useState } from "react";
import { NavLink, Navigate, useLocation } from "react-router-dom";
import { getPublishedPolicies } from "../services/policyService";
import { getSupportSamplePolicies, supportTopics } from "../data/supportInformation";

const splitParagraphs = (content = "") =>
  String(content).split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

function SupportInfoPage() {
  const { pathname } = useLocation();
  const topic = supportTopics.find((item) => item.path === pathname);
  const policyId = pathname.startsWith("/thong-tin-chung/")
    ? pathname.slice("/thong-tin-chung/".length)
    : "";
  const [result, setResult] = useState({ path: "", policies: [], failed: false });

  useEffect(() => {
    if (!topic && !policyId) return undefined;
    let active = true;

    getPublishedPolicies()
      .then((response) => {
        if (active) setResult({ path: pathname, policies: response.data || [], failed: false });
      })
      .catch(() => {
        if (active) setResult({ path: pathname, policies: [], failed: true });
      });

    return () => { active = false; };
  }, [pathname, policyId, topic]);

  if (!topic && !policyId) return <Navigate to="/dieu-khoan-su-dung" replace />;

  const isLoading = result.path !== pathname;
  const selectedPolicy = policyId
    ? result.policies.find((policy) => String(policy._id) === policyId)
    : null;
  const publishedInTopic = topic
    ? result.policies.filter((policy) => policy.surface === topic.surface)
    : [];
  const sections = isLoading
    ? []
    : selectedPolicy
      ? [selectedPolicy]
      : topic && publishedInTopic.length > 0
        ? publishedInTopic
        : topic
          ? getSupportSamplePolicies(topic.surface)
          : [];
  const isFaq = topic?.surface === "faq";
  const title = selectedPolicy?.title || topic?.title || "Không tìm thấy chính sách";
  const description = selectedPolicy?.summary || topic?.description || "";

  return (
    <main className="mx-auto w-[min(1180px,calc(100%_-_40px))] py-10 pb-20 max-sm:w-[calc(100%_-_28px)]">
      <div className="mb-8 border-b border-white/10 pb-8">
        <h1 className="text-3xl font-black text-white md:text-4xl">Thông tin chung</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Tìm hiểu quy định, quyền riêng tư và cách đặt vé tại AuraCinema.
        </p>
      </div>

      <div className="grid items-start gap-9 md:grid-cols-[245px_minmax(0,1fr)] lg:gap-14">
        <nav aria-label="Mục thông tin chung" className="md:sticky md:top-24">
          <h2 className="mb-3 text-sm font-bold uppercase text-slate-400">Hỗ trợ</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {supportTopics.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `shrink-0 rounded-xl px-4 py-3 text-sm font-semibold no-underline transition-colors md:w-full ${isActive
                    ? "bg-[#ff5364] text-[#0a0e1a]"
                    : "border border-white/10 bg-[#151b26] text-slate-300 hover:border-white/25 hover:text-white"}`
                }
              >
                {item.title}
              </NavLink>
            ))}
          </div>
          {!isLoading && result.policies.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Chính sách đã xuất bản</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
                {result.policies.map((policy) => (
                  <NavLink
                    key={policy._id}
                    to={`/thong-tin-chung/${policy._id}`}
                    className={({ isActive }) =>
                      `shrink-0 rounded-xl px-4 py-3 text-sm font-medium no-underline transition-colors md:w-full md:whitespace-normal ${isActive
                        ? "bg-[#ff5364] text-[#0a0e1a]"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`
                    }
                  >
                    {policy.title}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <section aria-labelledby="support-topic-title" className="min-w-0">
          <header className="mb-8 border-b border-white/10 pb-7">
            <h2 id="support-topic-title" className="text-2xl font-black text-white md:text-3xl">
              {title}
            </h2>
            {description && <p className="mt-3 max-w-[70ch] text-sm leading-7 text-slate-300">{description}</p>}
          </header>

          {result.failed && (
            <p role="status" className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Chưa tải được nội dung đã xuất bản. Nội dung mẫu đang được hiển thị.
            </p>
          )}
          {!isLoading && topic && publishedInTopic.length === 0 && !result.failed && (
            <p className="mb-6 text-xs text-slate-400">Nội dung tham khảo · AuraCinema sẽ cập nhật chính sách chính thức tại đây.</p>
          )}

          {isLoading ? (
            <p role="status" className="text-sm text-slate-300">Đang tải nội dung...</p>
          ) : policyId && !selectedPolicy ? (
            <p role="status" className="text-sm text-slate-300">Chính sách này chưa được xuất bản hoặc không còn tồn tại.</p>
          ) : isFaq ? (
            <div className="divide-y divide-white/10 border-y border-white/10">
              {sections.map((section) => (
                <details key={section._id || section.title} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-white marker:hidden">
                    {section.title}
                    <span aria-hidden="true" className="text-xl text-[#ff7180] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  {section.summary && <p className="mt-3 text-sm font-medium text-slate-300">{section.summary}</p>}
                  <div className="mt-3 grid max-w-[72ch] gap-3 text-sm leading-7 text-slate-300">
                    {splitParagraphs(section.content).map((paragraph, index) => (
                      <p className="whitespace-pre-line" key={index}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="grid gap-9">
              {sections.map((section) => (
                <article key={section._id || section.title} className="border-b border-white/10 pb-8 last:border-0">
                  <h3 className="text-lg font-bold text-white">{section.title}</h3>
                  {section.summary && <p className="mt-2 max-w-[72ch] text-sm font-medium text-slate-200">{section.summary}</p>}
                  <div className="mt-4 grid max-w-[72ch] gap-4 text-sm leading-7 text-slate-300">
                    {splitParagraphs(section.content).map((paragraph, index) => (
                      <p className="whitespace-pre-line" key={index}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default SupportInfoPage;
