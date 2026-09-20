#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),store=require('./article-store');
const searchDir=path.join(store.DATA_DIR,'search'),articles=store.loadArticles(),generated=store.searchDataForArticles(articles),shards=generated.shards,manifest=generated.manifest,months=manifest.shards.map(shard=>shard.month);
fs.mkdirSync(searchDir,{recursive:true});for(const month of months)store.writeAtomic(path.join(searchDir,month+'.json'),store.stableStringify({schemaVersion:1,month,documents:shards.get(month)}));
for(const entry of fs.readdirSync(searchDir))if(/^\d{4}-\d{2}\.json$/.test(entry)&&!months.includes(entry.slice(0,-5)))fs.unlinkSync(path.join(searchDir,entry));
store.writeAtomic(path.join(searchDir,'manifest.json'),store.stableStringify(manifest));
console.log('Generated '+months.length+' search shards for '+articles.length+' articles.');
