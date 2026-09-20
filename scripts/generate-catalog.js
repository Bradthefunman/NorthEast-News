#!/usr/bin/env node
'use strict';
const store=require('./article-store');
const catalog=store.writeCatalog();
console.log('Generated catalog for '+catalog.articles.length+' articles.');
