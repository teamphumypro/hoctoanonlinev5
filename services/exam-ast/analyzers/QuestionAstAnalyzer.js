'use strict';
const { plainBlocks } = require('../renderers/AstHtmlRenderer');
const { buildDocument } = require('../../examImport/azotaStructuredParser');

function astFromMarkedText(value, assets){
  const text=String(value||'');const children=[];const re=/⟦(MATH|IMAGE):([^⟧]+)⟧/g;let last=0,m;
  while((m=re.exec(text))){if(m.index>last)children.push({type:'text',text:text.slice(last,m.index)});const type=m[1],id=m[2];if(type==='MATH'){const a=assets.math[id]||{};children.push({type:'math',id,mathml:a.mathml||null,dataUrl:a.dataUrl||null,sourceType:a.sourceType||null});}else{const a=assets.image[id]||{};children.push({type:'image',id,dataUrl:a.dataUrl||null,sourceType:a.sourceType||null});}last=re.lastIndex;}if(last<text.length)children.push({type:'text',text:text.slice(last)});return [{type:'paragraph',children}];
}
function mapOldAssets(assets){const maths={},images={};for(const [id,a] of Object.entries(assets.math||{}))maths[id]={...a};for(const [id,a] of Object.entries(assets.image||{}))images[id]={...a};return{maths,images,tables:{}};}
function markedToLegacy(marked){return String(marked||'').replace(/⟦MATH:([^⟧]+)⟧/g,'[!m:$$$1$$]').replace(/⟦IMAGE:([^⟧]+)⟧/g,'[img:$$$1$$]');}
function legacyToMarked(value){return String(value||'').replace(/\[!m:\$([^$]+)\$\]/g,'⟦MATH:$1⟧').replace(/\[img:\$([^$]+)\$\]/g,'⟦IMAGE:$1⟧');}
function analyze(document){
  const marked=plainBlocks(document.blocks);const legacy=markedToLegacy(marked);const parsed=buildDocument(legacy,mapOldAssets(document.assets));
  document.sections=parsed.sections||[];
  document.questions=(parsed.questions||[]).map(q=>{
    const rawQuestion=legacyToMarked(q.rawQuestion||q.question||'');
    const rawOptions=(q.rawOptions||[]).map(legacyToMarked);
    const rawSolution=legacyToMarked(q.rawSolution||q.explanation||'');
    return {...q,questionAst:astFromMarkedText(rawQuestion,document.assets),optionAsts:rawOptions.map(x=>astFromMarkedText(x,document.assets)),solutionAst:astFromMarkedText(rawSolution,document.assets),rawQuestion,rawOptions,rawSolution,question:undefined,options:undefined,explanation:undefined};
  });
  document.rawText=marked;document.regions=parsed.regions||{};return document;
}
module.exports={analyze,astFromMarkedText};
