PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS research_records(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 platform TEXT NOT NULL CHECK(platform='tiktok'),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 180),
 creator TEXT NOT NULL CHECK(length(creator) BETWEEN 1 AND 100),
 url TEXT NOT NULL CHECK(length(url)<=2048),
 region TEXT NOT NULL CHECK(region IN('ID','GLOBAL')),
 views INTEGER CHECK(views IS NULL OR views>=0),
 likes INTEGER CHECK(likes IS NULL OR likes>=0),
 comments INTEGER CHECK(comments IS NULL OR comments>=0),
 shares INTEGER CHECK(shares IS NULL OR shares>=0),
 hashtags TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_research_created ON research_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_creator ON research_records(creator);