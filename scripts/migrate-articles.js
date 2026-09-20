#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path'), store=require('./article-store');
const legacyPath=path.join(store.DATA_DIR,'articles.json'), targetDir=store.ARTICLE_DIR, targetIndex=store.INDEX_PATH;
const dryRun=process.argv.includes('--dry-run')||process.argv.includes('--verify'), removeLegacy=process.argv.includes('--remove-legacy');
function writeFile(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content,'utf8');}
function expectedFiles(articles,directory){const files=new Map();for(const article of articles){store.validateArticleId(article.id);const file=path.join(directory,article.id+'.json');if(files.has(file))throw new Error('Output-path collision: '+file);files.set(file,store.stableStringify(article));}return files;}
function verifyOnDisk(articles){const actual=store.loadArticles();if(actual.length!==articles.length)throw new Error('Verification count mismatch');const expected=new Map(articles.map(a=>[a.id,store.stableStringify(a)])),actualById=new Map(actual.map(a=>[a.id,store.stableStringify(a)]));for(const [id,value] of expected)if(actualById.get(id)!==value)throw new Error('Verification mismatch for '+id);const index=store.readJson(targetIndex);if(store.stableStringify(index)!==store.stableStringify(store.catalogForArticles(actual)))throw new Error('Catalog does not match article files');}
let articles=fs.existsSync(legacyPath)?store.parseLegacy(store.readJson(legacyPath)):store.loadArticles();
const files=expectedFiles(articles,targetDir), temporaryDir=fs.mkdtempSync(path.join(store.DATA_DIR,'.articles-migration-'));
try{
  if(!dryRun){for(const [file,content] of files)writeFile(path.join(temporaryDir,path.basename(file)),content);const migrated=store.loadArticles({dir:temporaryDir});if(migrated.length!==articles.length)throw new Error('Temporary migration count mismatch');writeFile(path.join(temporaryDir,'article-index.json'),store.stableStringify(store.catalogForArticles(migrated)));if(fs.existsSync(targetDir))fs.renameSync(targetDir,targetDir+'.backup-'+process.pid);fs.renameSync(temporaryDir,targetDir);store.writeCatalog(targetIndex);verifyOnDisk(articles);const backup=targetDir+'.backup-'+process.pid;if(fs.existsSync(backup))fs.rmSync(backup,{recursive:true,force:true});if(removeLegacy&&fs.existsSync(legacyPath))fs.unlinkSync(legacyPath);}
  else if(fs.existsSync(targetDir))verifyOnDisk(articles);
  console.log((dryRun?'Verified ':'Migrated ')+articles.length+' articles.');
}catch(error){if(fs.existsSync(temporaryDir))fs.rmSync(temporaryDir,{recursive:true,force:true});throw error;}
