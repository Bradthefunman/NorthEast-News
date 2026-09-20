'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ARTICLE_DIR = path.join(DATA_DIR, 'articles');
const INDEX_PATH = path.join(DATA_DIR, 'article-index.json');
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const REQUIRED_FIELDS = ['id', 'slug', 'headline', 'body', 'category', 'publishedAt'];

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { out[key] = stableValue(value[key]); return out; }, {});
  return value;
}
function stableStringify(value) { return JSON.stringify(stableValue(value), null, 2) + '\n'; }
function isValidTimestamp(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function validateArticleId(id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id) || id.includes('..') || id.includes('/') || id.includes('\\')) throw new Error('Unsafe article id: ' + String(id));
  return id;
}
function validateArticle(article, sourcePath) {
  if (!article || typeof article !== 'object' || Array.isArray(article)) throw new Error('Article must be a JSON object: ' + (sourcePath || 'unknown'));
  for (const field of REQUIRED_FIELDS) if (article[field] === undefined || article[field] === null || article[field] === '') throw new Error('Missing required article field "' + field + '": ' + (sourcePath || article.id || 'unknown'));
  validateArticleId(article.id);
  if (typeof article.slug !== 'string' || !article.slug.trim()) throw new Error('Invalid article slug: ' + article.id);
  if (typeof article.headline !== 'string' || !article.headline.trim()) throw new Error('Invalid article headline: ' + article.id);
  if (!Array.isArray(article.body) || !article.body.length || article.body.some(item => typeof item !== 'string' || !item.trim())) throw new Error('Article body must be a non-empty array of strings: ' + article.id);
  if (!isValidTimestamp(article.publishedAt)) throw new Error('Invalid publishedAt: ' + article.id);
  if (article.updatedAt !== undefined && article.updatedAt !== null && !isValidTimestamp(article.updatedAt)) throw new Error('Invalid updatedAt: ' + article.id);
  if (!Array.isArray(article.tags)) throw new Error('Article tags must be an array: ' + article.id);
  for (const flag of ['breaking','developing','analysis','featured','trending','archive']) if (article[flag] !== undefined && article[flag] !== null && typeof article[flag] !== 'boolean') throw new Error('Article flag must be boolean "' + flag + '": ' + article.id);
  if (article.image !== undefined && article.image !== null && typeof article.image !== 'string') throw new Error('Invalid image: ' + article.id);
  if (article.sourceUrl !== undefined && article.sourceUrl !== null && article.sourceUrl !== '' && !/^https?:\/\//i.test(article.sourceUrl)) throw new Error('Invalid sourceUrl: ' + article.id);
  return article;
}
function validateUnique(articles) {
  const ids = new Set(), slugs = new Set();
  for (const article of articles) {
    if (ids.has(article.id)) throw new Error('Duplicate article id: ' + article.id);
    if (slugs.has(article.slug)) throw new Error('Duplicate article slug: ' + article.slug);
    ids.add(article.id); slugs.add(article.slug);
  }
  return articles;
}
function listArticleFiles(articleDir = ARTICLE_DIR) {
  if (!fs.existsSync(articleDir)) throw new Error('Missing article directory: ' + path.relative(ROOT, articleDir));
  return fs.readdirSync(articleDir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).map(entry => {
    if (!entry.isFile() || !entry.name.endsWith('.json')) throw new Error('Unexpected entry in article directory: ' + entry.name);
    const id = entry.name.slice(0, -5); validateArticleId(id);
    const file = path.join(articleDir, entry.name), relative = path.relative(articleDir, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || path.basename(file) !== entry.name) throw new Error('Unsafe article path: ' + file);
    return file;
  });
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error('Malformed JSON in ' + path.relative(ROOT, file) + ': ' + error.message); }
}
function loadArticles(options = {}) {
  const articleDir = options.dir || ARTICLE_DIR;
  const articles = listArticleFiles(articleDir).map(file => {
    const article = validateArticle(readJson(file), file);
    if (article.id !== path.basename(file, '.json')) throw new Error('Article id does not match filename: ' + path.relative(ROOT, file));
    return article;
  });
  return validateUnique(articles).sort(compareArticles);
}
function validateArticles(articles) {
  if (!Array.isArray(articles)) throw new Error('Legacy article source must be an array');
  articles.forEach((article,index) => validateArticle(article, 'legacy article #' + (index + 1)));
  return validateUnique(articles);
}
function parseLegacy(value) {
  const articles = Array.isArray(value) ? value : value && Array.isArray(value.articles) ? value.articles : null;
  if (!articles) throw new Error('Legacy article source must be an array or {articles: []}');
  return validateArticles(articles);
}
function parseTimestamp(value) { const time = Date.parse(value); return Number.isFinite(time) ? time : 0; }
function effectiveTime(article) { return parseTimestamp(article.updatedAt) || parseTimestamp(article.publishedAt); }
function compareArticles(a,b) { return effectiveTime(b)-effectiveTime(a) || parseTimestamp(b.publishedAt)-parseTimestamp(a.publishedAt) || String(a.id||'').localeCompare(String(b.id||'')) || String(a.slug||'').localeCompare(String(b.slug||'')); }
function catalogRecord(article) {
  const record = {};
  for (const field of ['id','slug','headline','dek','summary','category','topic','topicLabel','tags','state','city','location','author','publishedAt','updatedAt','breaking','developing','analysis','featured','trending','archive','image','imageAlt','visualLabel']) {
    if (field === 'tags') record[field] = Array.isArray(article[field]) ? article[field] : [];
    else if (['breaking','developing','analysis','featured','trending','archive'].includes(field)) record[field] = article[field] === true;
    else record[field] = article[field] === undefined ? null : article[field];
  }
  record.file = 'data/articles/' + validateArticleId(article.id) + '.json';
  return record;
}
function catalogForArticles(articles) { return { schemaVersion: 1, articles: articles.slice().sort(compareArticles).map(catalogRecord) }; }
function catalogFromDisk() { return catalogForArticles(loadArticles()); }
function searchDocument(article) {
  const body = Array.isArray(article.body) ? article.body : [article.body || ''];
  const fields = [article.headline,article.dek,article.summary,body.join('\n'),article.category,article.topic,article.topicLabel,article.state,article.city,article.location,(article.tags||[]).join(' ')].filter(value => value != null);
  return {id:article.id,text:fields.join(' ').replace(/\s+/g,' ').trim().toLowerCase(),excerpt:article.dek||article.summary||body[0]||''};
}
function searchDataForArticles(articles) {
  const shards = new Map();
  for (const article of articles) {
    const month=String(article.publishedAt).slice(0,7);
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Cannot derive search month for '+article.id);
    if (!shards.has(month)) shards.set(month,{});
    shards.get(month)[article.id]=searchDocument(article);
  }
  const months=Array.from(shards.keys()).sort().reverse();
  return {manifest:{schemaVersion:1,shards:months.map(month=>({month,file:'data/search/'+month+'.json',count:Object.keys(shards.get(month)).length}))},shards};
}
function writeAtomic(file, content) { fs.mkdirSync(path.dirname(file), {recursive:true}); const temporary=file+'.tmp-'+process.pid; fs.writeFileSync(temporary,content,'utf8'); fs.renameSync(temporary,file); }
function writeCatalog(file = INDEX_PATH) { const catalog=catalogFromDisk(); writeAtomic(file,stableStringify(catalog)); return catalog; }
function findArticleById(articles,id) { return articles.find(article => article.id === id) || null; }
function findArticleBySlug(articles,slug) { return articles.find(article => article.slug === slug) || null; }

module.exports = {ROOT,DATA_DIR,ARTICLE_DIR,INDEX_PATH,ID_PATTERN,REQUIRED_FIELDS,stableValue,stableStringify,isValidTimestamp,validateArticleId,validateArticle,validateUnique,listArticleFiles,readJson,loadArticles,validateArticles,parseLegacy,parseTimestamp,effectiveTime,compareArticles,catalogRecord,catalogForArticles,catalogFromDisk,searchDocument,searchDataForArticles,writeAtomic,writeCatalog,findArticleById,findArticleBySlug};
