#!/usr/bin/env node
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const raw=JSON.parse(fs.readFileSync(path.join(root,'data/articles.json'),'utf8')),articles=Array.isArray(raw)?raw:raw.articles||[],ids=new Set(),slugs=new Set();
for(const a of articles){if(!a.id||!a.slug||!a.headline||!a.publishedAt)throw new Error('Missing core article field');if(ids.has(a.id)||slugs.has(a.slug))throw new Error('Duplicate id or slug: '+a.slug);ids.add(a.id);slugs.add(a.slug);}
for(const route of ['new-hampshire','massachusetts','rhode-island','breaking','tech','markets','misc','search','business-directory','about','editorial-standards','corrections','privacy','terms','advertise','tips','contact'])if(!fs.existsSync(path.join(root,route,'index.html')))throw new Error('Missing route: '+route);
const styles=fs.readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
if(!/\.hero-card\s*>\s*\.story-link\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:/s.test(styles))throw new Error('Hero-card layout must be applied to the story link that directly contains the visual and headline');
if(/\.hero-card\s*\{[^}]*grid-template-rows:/s.test(styles))throw new Error('Hero-card wrapper must not own the internal visual/headline grid');
console.log('Validated '+articles.length+' articles and all public routes.');
