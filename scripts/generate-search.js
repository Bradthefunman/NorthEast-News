#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),store=require('./article-store');
const searchDir=path.join(store.DATA_DIR,'search'),articles=store.loadArticles(),shards=new Map();
for(const article of articles){const month=String(article.publishedAt).slice(0,7);if(!/^\d{4}-\d{2}$/.test(month))throw new Error('Cannot derive search month for '+article.id);if(!shards.has(month))shards.set(month,{});const body=Array.isArray(article.body)?article.body:[article.body||''];const fields=[article.headline,article.dek,article.summary,body.join('\n'),article.category,article.topic,article.topicLabel,article.state,article.city,article.location,(article.tags||[]).join(' ')].filter(v=>v!=null);shards.get(month)[article.id]={id:article.id,text:fields.join(' ').replace(/\s+/g,' ').trim().toLowerCase(),excerpt:body[0]||article.dek||article.summary||''};}
const months=Array.from(shards.keys()).sort().reverse(),manifest={schemaVersion:1,shards:months.map(month=>({month,file:'data/search/'+month+'.json',count:Object.keys(shards.get(month)).length}))};
fs.mkdirSync(searchDir,{recursive:true});for(const month of months)store.writeAtomic(path.join(searchDir,month+'.json'),store.stableStringify({schemaVersion:1,month,documents:shards.get(month)}));
for(const entry of fs.readdirSync(searchDir))if(/^\d{4}-\d{2}\.json$/.test(entry)&&!months.includes(entry.slice(0,-5)))fs.unlinkSync(path.join(searchDir,entry));
store.writeAtomic(path.join(searchDir,'manifest.json'),store.stableStringify(manifest));
console.log('Generated '+months.length+' search shards for '+articles.length+' articles.');
