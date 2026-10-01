const form=document.querySelector('#enquiry-form');
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}})},{threshold:.08});
 document.querySelectorAll('.steps article,.role-grid article,.story,.price-card,.contact-next li').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el)});
}
if(form){const started=Date.now();const key=crypto.randomUUID();form.addEventListener('submit',async e=>{
 e.preventDefault();if(!form.reportValidity())return;
 const status=document.querySelector('#form-status'),button=form.querySelector('button');button.disabled=true;button.textContent='Sending…';status.className='';status.textContent='Saving your enquiry securely…';
 try{const fields=new FormData(form),values=Object.fromEntries(fields);const interests=fields.getAll('interest');delete values.interest;
 if(interests.length)values.message='Interested in: '+interests.join(', ')+'.\n\n'+values.message;
 values.requestKey=key;values.elapsed=Math.floor((Date.now()-started)/1000);
 const response=await fetch('https://furqaninstitute.co.uk/madrasadesk/enquiry.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});
 const result=await response.json();if(!response.ok)throw new Error(result.message||'We could not save your enquiry. Please try again.');
 const success=document.createElement('div');success.className='form-success';success.tabIndex=-1;success.setAttribute('role','status');
 const icon=document.createElement('span');icon.className='success-icon';icon.textContent='✓';icon.setAttribute('aria-hidden','true');
 const title=document.createElement('h3');title.textContent='You’re on the list.';
 const body=document.createElement('p');body.textContent='Thank you for getting in touch. We’ve received your enquiry and will contact you to arrange a personal walkthrough.';
 const ref=document.createElement('p');ref.className='receipt';ref.textContent='Your reference: '+result.reference;
 success.append(icon,title,body,ref);form.replaceChildren(success);success.focus();
 }catch(err){status.className='error';status.textContent=err.message==='Failed to fetch'?'We couldn’t connect. Your answers are still here. Please try again, or email teojop@outlook.com.':err.message;button.disabled=false;button.textContent='Request a demo ↗';status.focus();}
})}
