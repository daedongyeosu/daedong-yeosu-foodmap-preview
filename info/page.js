// Use browser history only when this page was reached from our foodmap.
document.getElementById('back')?.addEventListener('click',event=>{
 try{const ref=new URL(document.referrer);if(ref.origin===location.origin&&ref.pathname==='/'&&history.length>1){event.preventDefault();history.back();}}catch{}
});
