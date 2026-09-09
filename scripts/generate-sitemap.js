#!/usr/bin/env node
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'data/site-config.json'),'utf8'));
const raw=JSON.parse(fs.readFileSync(path.join(root,'data/articles.json'),'utf8'));
const articles=Array.isArray(raw)?raw:raw.articles||[],base=String(config.siteUrl||'').replace(/\/$/,'');
const routes=[['/','1.0'],['/new-hampshire/','0.9'],['/massachusetts/','0.8'],['/rhode-island/','0.8'],['/search/','0.6'],['/archive.html','0.7'],['/business-directory/','0.6'],['/about/','0.4'],['/editorial-standards/','0.4'],['/corrections/','0.4'],['/privacy/','0.3'],['/terms/','0.3'],['/advertise/','0.6'],['/tips/','0.6'],['/contact/','0.4']];
function xml(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function entry(loc,lastmod,priority){return '<url><loc>'+xml(base+loc)+'</loc>'+(lastmod?'<lastmod>'+xml(String(lastmod).slice(0,10))+'</lastmod>':'')+'<priority>'+priority+'</priority></url>';}
const entries=routes.map(x=>entry(x[0],new Date().toISOString(),x[1]));
articles.forEach(a=>{if(a.slug)entries.push(entry('/article.html?slug='+encodeURIComponent(a.slug),a.updatedAt||a.publishedAt,a.featured?'0.9':'0.7'));});
fs.writeFileSync(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  '+entries.join('\n  ')+'\n</urlset>\n');
fs.writeFileSync(path.join(root,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /submissions/\nSitemap: '+base+'/sitemap.xml\n');
console.log('Generated sitemap for '+articles.length+' articles.');
