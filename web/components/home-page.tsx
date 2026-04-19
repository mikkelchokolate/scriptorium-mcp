"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/graph-client";
import { APP_LOCALES, localeName, t, type AppLocale } from "@/lib/i18n";
import type { GraphCapabilitiesDTO, GraphProjectSummaryDTO } from "@/lib/types";

export function HomePage({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const [projects, setProjects] = useState<GraphProjectSummaryDTO[]>([]);
  const [capabilities, setCapabilities] = useState<GraphCapabilitiesDTO | null>(null);
  const [projectInput, setProjectInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [projectsResponse, capabilitiesResponse] = await Promise.all([
          fetchJson<GraphProjectSummaryDTO[]>("/api/projects"),
          fetchJson<GraphCapabilitiesDTO>("/api/capabilities"),
        ]);
        if (cancelled) return;
        setProjects(projectsResponse);
        setCapabilities(capabilitiesResponse);
        if (projectsResponse.length > 0) {
          setProjectInput(projectsResponse[0].slug);
        }
      } catch (nextError) {
        if (cancelled) return;
        setError(String(nextError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openProject = () => {
    if (!projectInput.trim()) return;
    router.push(`/${locale}/project/${encodeURIComponent(projectInput.trim())}`);
  };

  return (
    <main className="home">
      <section className="hero">
        <div className="hero__eyebrow">{t(locale, "heroEyebrow")}</div>
        <div className="locale-toggle">
          {APP_LOCALES.map((nextLocale) => (
            <Link
              key={nextLocale}
              className={`pill ${nextLocale === locale ? "pill--active" : ""}`}
              href={`/${nextLocale}`}
            >
              {localeName(nextLocale)}
            </Link>
          ))}
        </div>
        <h1>{t(locale, "heroTitle")}</h1>
        <p>{t(locale, "heroCopy")}</p>
        <div className="button-row">
          <input
            className="text-input"
            value={projectInput}
            onChange={(event) => setProjectInput(event.target.value)}
            placeholder={t(locale, "projectInputPlaceholder")}
          />
          <button className="button button--primary" type="button" onClick={openProject}>
            {t(locale, "openProject")}
          </button>
        </div>
      </section>

      <section className="grid home__grid">
        <div className="panel">
          <div className="panel__eyebrow">{t(locale, "availableProjects")}</div>
          <div className="panel__title">{t(locale, "projectShelf")}</div>
          <div className="panel__copy">{t(locale, "projectShelfCopy")}</div>

          {loading ? (
            <div className="loading">{t(locale, "loading")}</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">{t(locale, "noProjects")}</div>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <Link key={project.slug} className="project-card" href={`/${locale}/project/${encodeURIComponent(project.slug)}`}>
                  <div className="project-card__meta">
                    <span className="pill">{project.slug}</span>
                    <span className="pill">{t(locale, "chapters", { count: String(project.chapterCount) })}</span>
                    <span className="pill">{t(locale, "characters", { count: String(project.characterCount) })}</span>
                  </div>
                  <h3>{project.title}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__eyebrow">{t(locale, "capabilities")}</div>
          <div className="panel__title">{t(locale, "liveLayer")}</div>
          <div className="panel__copy">{t(locale, "liveLayerCopy")}</div>
          <div className="grid">
            <div className="metric">
              <span>{t(locale, "liveUpdates")}</span>
              <strong>{capabilities?.liveUpdatesAvailable ? "ON" : "OFF"}</strong>
            </div>
            <div className="metric">
              <span>{t(locale, "forecasting")}</span>
              <strong>{capabilities?.forecastingAvailable ? "ON" : "OFF"}</strong>
            </div>
            <div className="metric">
              <span>{t(locale, "neo4jStatus")}</span>
              <strong>{capabilities?.neo4jConnected ? "ON" : "FILE"}</strong>
            </div>
            <div className="metric">
              <span>{t(locale, "locales")}</span>
              <strong>{capabilities?.locales.join(", ") || APP_LOCALES.join(", ")}</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
