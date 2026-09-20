#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),store=require('./article-store'),root=store.ROOT,articles=store.loadArticles(),indexPath=store.INDEX_PATH;
if(!fs.existsSync(indexPath))throw new Error('Missing generated catalog: data/article-index.json');
const index=store.readJson(indexPath),expected=store.catalogForArticles(articles);
if(store.stableStringify(index)!==store.stableStringify(expected))throw new Error('Catalog does not exactly match individual article files');
const ids=new Set(),slugs=new Set();
for(const record of index.articles||[]){if(!record.file||!record.file.startsWith('data/articles/')||record.file.includes('..')||record.file.includes('\\'))throw new Error('Unsafe catalog path for '+record.id);const target=path.join(root,record.file);if(path.relative(store.ARTICLE_DIR,target).startsWith('..')||!fs.existsSync(target))throw new Error('Missing catalog target for '+record.id);if(ids.has(record.id)||slugs.has(record.slug))throw new Error('Duplicate catalog id or slug');ids.add(record.id);slugs.add(record.slug);}
if(ids.size!==articles.length)throw new Error('Catalog/article count mismatch');
for(const article of articles){if(!Array.isArray(article.body)||!article.body.some(block=>block.trim()))throw new Error('Missing body content: '+article.id);if(article.image){const imagePath=path.resolve(root,article.image);if(!imagePath.startsWith(root+path.sep)||!fs.existsSync(imagePath))throw new Error('Missing image reference: '+article.id);}}
const searchDir=path.join(store.DATA_DIR,'search'),manifestPath=path.join(searchDir,'manifest.json');if(!fs.existsSync(manifestPath))throw new Error('Missing search manifest');
const manifest=store.readJson(manifestPath),expectedSearch=store.searchDataForArticles(articles),expectedMonths=new Set(expectedSearch.manifest.shards.map(shard=>shard.month)),seen=new Set();
if(store.stableStringify(manifest)!==store.stableStringify(expectedSearch.manifest))throw new Error('Search manifest does not exactly match individual article files');
const listedShards=new Set(manifest.shards.map(shard=>path.basename(shard.file)));for(const entry of fs.readdirSync(searchDir))if(/^\d{4}-\d{2}\.json$/.test(entry)&&!listedShards.has(entry))throw new Error('Orphaned search shard: '+entry);
for(const shard of manifest.shards){if(!expectedMonths.has(shard.month)||!shard.file.startsWith('data/search/')||shard.file.includes('..'))throw new Error('Invalid search shard');const value=store.readJson(path.join(root,shard.file)),expectedValue={schemaVersion:1,month:shard.month,documents:expectedSearch.shards.get(shard.month)};if(store.stableStringify(value)!==store.stableStringify(expectedValue))throw new Error('Search shard does not exactly match individual article files: '+shard.month);if(value.month!==shard.month||Number(shard.count)!==Object.keys(value.documents||{}).length)throw new Error('Search shard metadata mismatch: '+shard.month);for(const [id,doc] of Object.entries(value.documents||{})){if(seen.has(id))throw new Error('Duplicate search record: '+id);seen.add(id);if(!ids.has(id)||typeof doc.text!=='string')throw new Error('Orphan or malformed search record: '+id);}}
if(seen.size!==articles.length)throw new Error('Search record count mismatch');
for(const route of ['new-hampshire','massachusetts','rhode-island','breaking','tech','markets','misc','search','business-directory','about','editorial-standards','corrections','privacy','terms','advertise','tips','contact'])if(!fs.existsSync(path.join(root,route,'index.html')))throw new Error('Missing route: '+route);
const styles=fs.readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
if(!/\.hero-card\s*>\s*\.story-link\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:/s.test(styles))throw new Error('Hero-card layout must be applied to the story link that directly contains the visual and headline');
if(/\.hero-card\s*\{[^}]*grid-template-rows:/s.test(styles))throw new Error('Hero-card wrapper must not own the internal visual/headline grid');
console.log('Validated '+articles.length+' articles, catalog, search shards, images and public routes.');
