(function(){
  'use strict';
  const state = new WeakMap();
  const safeParse = raw => { try { const v=JSON.parse(raw); return v&&Array.isArray(v.blocks)?v:null; } catch(e){ return null; } };
  const escapeHtml = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'b_'+Math.random().toString(36).slice(2)+Date.now().toString(36);

  function newData(){return {version:1,kind:'math_essay',blocks:[{id:uid(),type:'text',html:''}]};}
  function serialize(root){
    const blocks=[];
    root.querySelectorAll('.mee-block').forEach(el=>{
      const type=el.dataset.type,id=el.dataset.id||uid();
      if(type==='text') blocks.push({id,type,html:el.querySelector('.mee-text').innerHTML});
      if(type==='math') blocks.push({id,type,latex:el.querySelector('.mee-math-input').value});
      if(type==='drawing') blocks.push({id,type,dataUrl:el.querySelector('canvas').toDataURL('image/png')});
      if(type==='image') blocks.push({id,type,dataUrl:el.querySelector('img').src,name:el.dataset.name||''});
    });
    return {version:1,kind:'math_essay',blocks};
  }
  function sync(root){
    const s=state.get(root); if(!s)return;
    const data=serialize(root); s.hidden.value=JSON.stringify(data);
    if(s.storageKey) try{localStorage.setItem(s.storageKey,s.hidden.value);}catch(e){}
  }
  function button(label,action,title){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.action=action;if(title)b.title=title;return b;}
  function addBlock(root,block,focus=true){
    const blocksEl=root.querySelector('.mee-blocks');
    const el=document.createElement('div'); el.className='mee-block';el.dataset.type=block.type;el.dataset.id=block.id||uid();
    const remove=document.createElement('button');remove.type='button';remove.className='mee-remove';remove.innerHTML='&times;';remove.title='Xóa khối';remove.addEventListener('click',()=>{el.remove();if(!blocksEl.children.length)addBlock(root,{id:uid(),type:'text',html:''});sync(root);});el.appendChild(remove);
    if(block.type==='text'){
      const d=document.createElement('div');d.className='mee-text';d.contentEditable='true';d.innerHTML=block.html||'';d.addEventListener('input',()=>sync(root));d.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text'));});el.appendChild(d);if(focus)setTimeout(()=>d.focus(),0);
    } else if(block.type==='math'){
      const wrap=document.createElement('div');wrap.className='mee-math-row';
      const symbols=document.createElement('div');symbols.className='mee-symbols';
      [['Phân số','\\frac{□}{□}'],['Căn','\\sqrt{□}'],['x²','^{2}'],['Mũ','^{□}'],['Chỉ số','_{□}'],['∫','\\int_{□}^{□}'],['Σ','\\sum_{□}^{□}'],['π','\\pi'],['→','\\Rightarrow'],['≤','\\le'],['≥','\\ge'],['≠','\\ne'],['∞','\\infty']].forEach(([l,t])=>{const b=button(l,'symbol');b.addEventListener('click',()=>insertAtCursor(inp,t));symbols.appendChild(b);});
      const inp=document.createElement('input');inp.type='text';inp.className='mee-math-input';inp.placeholder='Nhập công thức hoặc dùng các nút phía trên';inp.value=block.latex||'';
      const preview=document.createElement('div');preview.className='mee-math-preview';
      const refresh=()=>{preview.textContent=inp.value?'\\['+inp.value.replaceAll('□','\\square')+'\\]':'Xem trước công thức';if(window.MathJax&&MathJax.typesetPromise)MathJax.typesetPromise([preview]).catch(()=>{});sync(root);};inp.addEventListener('input',refresh);
      wrap.append(symbols,inp,preview);el.appendChild(wrap);setTimeout(refresh,0);if(focus)setTimeout(()=>inp.focus(),0);
    } else if(block.type==='drawing'){
      const w=document.createElement('div');w.className='mee-canvas-wrap';const tools=document.createElement('div');tools.className='mee-canvas-tools';
      const pen=button('Bút','pen'),erase=button('Tẩy','erase'),undo=button('Hoàn tác','undo'),clear=button('Xóa hết','clear');
      const size=document.createElement('select');[2,4,7,12].forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent='Nét '+n;size.appendChild(o);});tools.append(pen,erase,undo,clear,size);
      const canvas=document.createElement('canvas');canvas.className='mee-canvas';canvas.width=1200;canvas.height=600;w.append(tools,canvas);el.appendChild(w);
      const ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const history=[];let drawing=false,mode='pen';
      const load=()=>{if(!block.dataUrl)return;const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,canvas.width,canvas.height);im.src=block.dataUrl;};load();
      const pos=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height};};
      const start=e=>{e.preventDefault();history.push(canvas.toDataURL());if(history.length>15)history.shift();drawing=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};
      const move=e=>{if(!drawing)return;e.preventDefault();const p=pos(e);ctx.strokeStyle=mode==='erase'?'#fff':'#111827';ctx.lineWidth=mode==='erase'?28:Number(size.value);ctx.lineTo(p.x,p.y);ctx.stroke();};
      const end=()=>{if(drawing){drawing=false;sync(root);}};['pointerdown'].forEach(n=>canvas.addEventListener(n,start));canvas.addEventListener('pointermove',move);window.addEventListener('pointerup',end);
      pen.addEventListener('click',()=>mode='pen');erase.addEventListener('click',()=>mode='erase');clear.addEventListener('click',()=>{history.push(canvas.toDataURL());ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);sync(root);});undo.addEventListener('click',()=>{const src=history.pop();if(!src)return;const im=new Image();im.onload=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);sync(root);};im.src=src;});
    } else if(block.type==='image'){
      const img=document.createElement('img');img.className='mee-image';img.alt=block.name||'Ảnh bài làm';img.src=block.dataUrl||'';el.dataset.name=block.name||'';el.appendChild(img);
    }
    blocksEl.appendChild(el);sync(root);return el;
  }
  function insertAtCursor(input,text){const s=input.selectionStart||0,e=input.selectionEnd||0;input.value=input.value.slice(0,s)+text+input.value.slice(e);input.focus();input.setSelectionRange(s+text.length,s+text.length);input.dispatchEvent(new Event('input'));}
  function init(root){
    const hidden=document.getElementById(root.dataset.target);if(!hidden)return;const key=root.dataset.storageKey||'';state.set(root,{hidden,storageKey:key});
    root.innerHTML='';const toolbar=document.createElement('div');toolbar.className='mee-toolbar';toolbar.append(button('＋ Văn bản','text'),button('＋ Công thức','math'),button('✍ Viết / vẽ','drawing'),button('🖼 Ảnh bài làm','image'));
    const blocks=document.createElement('div');blocks.className='mee-blocks';const help=document.createElement('div');help.className='mee-help';help.textContent='Bài làm được lưu theo từng khối. Có thể kết hợp chữ, công thức, hình vẽ và ảnh chụp trong cùng một câu.';root.append(toolbar,blocks,help);
    let data=safeParse(hidden.value);if(!data&&key){try{data=safeParse(localStorage.getItem(key)||'');}catch(e){}}if(!data)data=newData();data.blocks.forEach(b=>addBlock(root,b,false));
    toolbar.addEventListener('click',e=>{const a=e.target.dataset.action;if(!a)return;if(a==='image'){const f=document.createElement('input');f.type='file';f.accept='image/*';f.onchange=()=>{const file=f.files[0];if(!file)return;if(file.size>5*1024*1024){alert('Ảnh tối đa 5MB.');return;}const r=new FileReader();r.onload=()=>addBlock(root,{id:uid(),type:'image',dataUrl:r.result,name:file.name});r.readAsDataURL(file);};f.click();return;}addBlock(root,{id:uid(),type:a,html:'',latex:''});});
    sync(root);
  }
  function renderAnswer(container,raw){
    const data=safeParse(raw);container.innerHTML='';container.classList.add('essay-render');
    if(!data){const d=document.createElement('div');d.className='er-invalid';d.textContent=raw||'(Học sinh không làm câu này)';container.appendChild(d);return;}
    data.blocks.forEach(b=>{if(b.type==='text'){const d=document.createElement('div');d.className='er-text';d.innerHTML=b.html||'';container.appendChild(d);}else if(b.type==='math'){const d=document.createElement('div');d.className='er-math';d.textContent='\\['+(b.latex||'').replaceAll('□','\\square')+'\\]';container.appendChild(d);}else if((b.type==='drawing'||b.type==='image')&&b.dataUrl){const im=document.createElement('img');im.src=b.dataUrl;im.alt=b.type==='drawing'?'Bài viết/vẽ tay':'Ảnh bài làm';container.appendChild(im);}});
    if(window.MathJax&&MathJax.typesetPromise)MathJax.typesetPromise([container]).catch(()=>{});
  }
  window.MathEssayEditor={initAll:()=>document.querySelectorAll('.math-essay-editor').forEach(init),syncAll:()=>document.querySelectorAll('.math-essay-editor').forEach(sync),renderAnswer};
  document.addEventListener('DOMContentLoaded',()=>window.MathEssayEditor.initAll());
})();
