'use strict';
const fs = require('fs');
const AstDocument = require('../core/AstDocument');
const { ommlNodeToMathml } = require('../../examImport/ommlToMathml');

function textOf(content){
  if(typeof content==='string') return content;
  if(Array.isArray(content)&&content[0]&&Object.prototype.hasOwnProperty.call(content[0],'#text')) return String(content[0]['#text']||'');
  return '';
}
function normalizeTarget(target){const clean=String(target||'').replace(/^\.\.\//,'');return clean.startsWith('word/')?clean:`word/${clean}`;}
function findRelId(node){
  if(Array.isArray(node)){for(const x of node){const v=findRelId(x);if(v)return v;}}
  else if(node&&typeof node==='object'){
    if(node[':@']) for(const [k,v] of Object.entries(node[':@'])) if(k.endsWith(':embed')||k.endsWith(':id')) return v;
    for(const [k,v] of Object.entries(node)) if(k!==':@'){const found=findRelId(v);if(found)return found;}
  }
  return null;
}
async function readRelationships(zip,XMLParser){const map={};const f=zip.file('word/_rels/document.xml.rels');if(!f)return map;const p=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_'});const x=p.parse(await f.async('string'));const rows=x.Relationships&&x.Relationships.Relationship;for(const r of(Array.isArray(rows)?rows:rows?[rows]:[]))if(r['@_Id']&&r['@_Target'])map[r['@_Id']]=r['@_Target'];return map;}
async function vectorConverters(zip,relMap){
  const out={};const targets=[...new Set(Object.values(relMap).filter(v=>/\.(wmf|emf)$/i.test(v)).map(normalizeTarget))];if(!targets.length)return out;
  try{
    if(typeof global.FileReader==='undefined')global.FileReader=class{readAsArrayBuffer(b){Promise.resolve(b.arrayBuffer?b.arrayBuffer():b).then(v=>{this.result=v;this.onload&&this.onload({target:this});}).catch(e=>this.onerror&&this.onerror(e));}readAsDataURL(b){Promise.resolve(b.arrayBuffer?b.arrayBuffer():b).then(v=>{this.result=`data:${b.type||'application/octet-stream'};base64,${Buffer.from(v).toString('base64')}`;this.onload&&this.onload({target:this});}).catch(e=>this.onerror&&this.onerror(e));}};
    const {convertWmfToDataUrl,convertEmfToDataUrl}=require('emf-converter');const canvas=require('@napi-rs/canvas');if(!global.OffscreenCanvas)global.OffscreenCanvas=canvas.Canvas;
    for(const target of targets){const f=zip.file(target);if(!f)continue;try{const a=await f.async('arraybuffer');out[target]=/\.emf$/i.test(target)?await convertEmfToDataUrl(a):await convertWmfToDataUrl(a);}catch(e){console.warn('[AST] vector conversion:',target,e.message);}}
  }catch(e){console.warn('[AST] vector converter unavailable:',e.message);}return out;
}
async function cropFormula(dataUrl){
  if(!dataUrl||!dataUrl.startsWith('data:image/png'))return dataUrl;
  try{const {createCanvas,loadImage}=require('@napi-rs/canvas');const img=await loadImage(dataUrl);const c=createCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,img.width,img.height).data;let x0=img.width,y0=img.height,x1=-1,y1=-1;for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const i=(y*img.width+x)*4;if(d[i+3]>20&&(d[i]<245||d[i+1]<245||d[i+2]<245)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}if(x1<0)return dataUrl;const p=3;x0=Math.max(0,x0-p);y0=Math.max(0,y0-p);x1=Math.min(img.width-1,x1+p);y1=Math.min(img.height-1,y1+p);const w=x1-x0+1,h=y1-y0+1,scale=h>120?120/h:1,o=createCanvas(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))),oc=o.getContext('2d');oc.drawImage(c,x0,y0,w,h,0,0,o.width,o.height);return o.toDataURL('image/png');}catch(e){return dataUrl;}
}
async function read(filePath){
  const JSZip=require('jszip');const {XMLParser}=require('fast-xml-parser');const zip=await JSZip.loadAsync(fs.readFileSync(filePath));const docFile=zip.file('word/document.xml');if(!docFile)throw new Error('DOCX không có word/document.xml');
  const relMap=await readRelationships(zip,XMLParser),vectors=await vectorConverters(zip,relMap);const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',preserveOrder:true,trimValues:false});const parsed=parser.parse(await docFile.async('string'));const assets={math:{},image:{}};let mid=0,iid=0;
  async function mediaNode(content,formulaHint=false){const rid=findRelId(content);if(!rid||!relMap[rid])return null;const target=normalizeTarget(relMap[rid]),f=zip.file(target),ext=(target.split('.').pop()||'png').toLowerCase();const formula=formulaHint||/\.(wmf|emf)$/i.test(target);let dataUrl=vectors[target]||null;if(!dataUrl&&f){const b=await f.async('base64');const mime=ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='svg'?'image/svg+xml':`image/${ext}`;dataUrl=`data:${mime};base64,${b}`;}if(formula){const id=`m${++mid}`;dataUrl=await cropFormula(dataUrl);assets.math[id]={id,dataUrl,sourceType:ext};return{type:'math',id,dataUrl,sourceType:ext};}const id=`img${++iid}`;assets.image[id]={id,dataUrl,sourceType:ext};return{type:'image',id,dataUrl,sourceType:ext};}
  async function inline(nodes){const out=[];if(!Array.isArray(nodes))return out;for(const node of nodes){const tag=Object.keys(node).find(k=>k!==':@');if(!tag)continue;const c=node[tag];if(tag==='w:t'||tag==='w:instrText'){const t=textOf(c);if(t)out.push({type:'text',text:t});}else if(tag==='w:tab')out.push({type:'tab'});else if(tag==='w:br'||tag==='w:cr')out.push({type:'break'});else if(tag==='m:oMath'||tag==='m:oMathPara'){const id=`m${++mid}`,mathml=ommlNodeToMathml(c)||null;assets.math[id]={id,mathml,sourceType:'omml'};out.push({type:'math',id,mathml,sourceType:'omml'});}else if(tag==='w:object'){const n=await mediaNode(c,true);if(n)out.push(n);}else if(tag==='w:drawing'||tag==='w:pict'){const n=await mediaNode(c,false);if(n)out.push(n);}else if(Array.isArray(c)){out.push(...await inline(c));}}
    return mergeText(out);
  }
  function mergeText(arr){const out=[];for(const n of arr){const last=out[out.length-1];if(n.type==='text'&&last&&last.type==='text')last.text+=n.text;else out.push(n);}return out;}
  async function blocks(nodes){const out=[];if(!Array.isArray(nodes))return out;for(const node of nodes){const tag=Object.keys(node).find(k=>k!==':@');if(!tag)continue;const c=node[tag];if(tag==='w:p'){const children=await inline(c);if(children.length)out.push({type:'paragraph',children});}else if(tag==='w:tbl'){const rows=[];for(const tr of(c||[]).filter(x=>x['w:tr'])){const cells=[];for(const tc of(tr['w:tr']||[]).filter(x=>x['w:tc']))cells.push({blocks:await blocks(tc['w:tc'])});rows.push(cells);}out.push({type:'table',rows});}else if(Array.isArray(c)){out.push(...await blocks(c));}}return out;}
  function findBody(n){if(Array.isArray(n)){for(const x of n){const b=findBody(x);if(b)return b;}}else if(n&&typeof n==='object'){if(n['w:body'])return n['w:body'];for(const [k,v]of Object.entries(n))if(k!==':@'){const b=findBody(v);if(b)return b;}}return null;}
  return new AstDocument({source:{format:'docx',name:require('path').basename(filePath)},blocks:await blocks(findBody(parsed)||[]),assets});
}
module.exports={read};
