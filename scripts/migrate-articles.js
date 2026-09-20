#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),store=require('./article-store');
const legacyPath=path.join(store.DATA_DIR,'articles.json'),targetDir=store.ARTICLE_DIR,targetIndex=store.INDEX_PATH;
const dryRun=process.argv.includes('--dry-run')||process.argv.includes('--verify'),removeLegacy=process.argv.includes('--remove-legacy');
function writeFile(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content,'utf8');}
function expectedFiles(articles,directory){const files=new Map();for(const article of articles){store.validateArticleId(article.id);const file=path.join(directory,article.id+'.json');if(files.has(file))throw new Error('Output-path collision: '+file);files.set(file,store.stableStringify(article));}return files;}
function verifyOnDisk(articles){const actual=store.loadArticles();if(actual.length!==articles.length)throw new Error('Verification count mismatch');const expected=new Map(articles.map(a=>[a.id,store.stableStringify(a)])),actualById=new Map(actual.map(a=>[a.id,store.stableStringify(a)]));for(const [id,value] of expected)if(actualById.get(id)!==value)throw new Error('Verification mismatch for '+id);const index=store.readJson(targetIndex);if(store.stableStringify(index)!==store.stableStringify(store.catalogForArticles(actual)))throw new Error('Catalog does not match article files');}
const articles=fs.existsSync(legacyPath)?store.parseLegacy(store.readJson(legacyPath)):store.loadArticles(),temporaryRoot=fs.mkdtempSync(path.join(store.DATA_DIR,'.articles-migration-')),temporaryDir=path.join(temporaryRoot,'articles'),files=expectedFiles(articles,targetDir);
const backupDir=targetDir+'.backup-'+process.pid,backupIndex=targetIndex+'.backup-'+process.pid;
let movedArticles=false,movedIndex=false,promotedArticles=false,promotedIndex=false;
try{
  if(!dryRun){
    for(const [file,content] of files)writeFile(path.join(temporaryDir,path.basename(file)),content);
    const migrated=store.loadArticles({dir:temporaryDir});if(migrated.length!==articles.length)throw new Error('Temporary migration count mismatch');
    writeFile(path.join(temporaryRoot,'article-index.json'),store.stableStringify(store.catalogForArticles(migrated)));
    if(fs.existsSync(backupDir)||fs.existsSync(backupIndex))throw new Error('Stale migration backup exists; remove it before retrying.');
    if(fs.existsSync(targetDir))fs.renameSync(targetDir,backupDir),movedArticles=true;
    if(fs.existsSync(targetIndex))fs.renameSync(targetIndex,backupIndex),movedIndex=true;
    fs.renameSync(temporaryDir,targetDir);promotedArticles=true;
    fs.renameSync(path.join(temporaryRoot,'article-index.json'),targetIndex);promotedIndex=true;
    verifyOnDisk(articles);
    if(movedArticles)fs.rmSync(backupDir,{recursive:true,force:true});
    if(movedIndex)fs.rmSync(backupIndex,{force:true});
    if(removeLegacy&&fs.existsSync(legacyPath))fs.unlinkSync(legacyPath);
  }else if(fs.existsSync(targetDir)&&fs.existsSync(targetIndex))verifyOnDisk(articles);
  console.log((dryRun?'Verified ':'Migrated ')+articles.length+' articles.');
}catch(error){
  if(fs.existsSync(targetDir)&&promotedArticles)fs.rmSync(targetDir,{recursive:true,force:true});
  if(fs.existsSync(targetIndex)&&promotedIndex)fs.rmSync(targetIndex,{force:true});
  if(movedArticles&&fs.existsSync(backupDir))fs.renameSync(backupDir,targetDir);
  if(movedIndex&&fs.existsSync(backupIndex))fs.renameSync(backupIndex,targetIndex);
  if(fs.existsSync(temporaryRoot))fs.rmSync(temporaryRoot,{recursive:true,force:true});
  throw error;
}
