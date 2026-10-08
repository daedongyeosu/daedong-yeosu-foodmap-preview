const home = document.querySelector('#errandHome');
const request = document.querySelector('#requestPreview');
function openRequest(){home.hidden=true;request.hidden=false;window.scrollTo({top:0,behavior:'smooth'});}
document.querySelector('#requestStart').addEventListener('click',openRequest);
document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',openRequest));
document.querySelector('#backHome').addEventListener('click',()=>{request.hidden=true;home.hidden=false;window.scrollTo({top:0,behavior:'smooth'});});
