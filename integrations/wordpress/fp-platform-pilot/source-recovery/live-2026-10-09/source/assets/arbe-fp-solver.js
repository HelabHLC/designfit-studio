document.addEventListener('DOMContentLoaded',function(){
  if(typeof Chart==='undefined')return;
  document.querySelectorAll('.arbe-chart-data').forEach(function(node){
    try{
      const p=JSON.parse(node.textContent);
      const id=node.getAttribute('data-chart-id');
      const canvas=document.getElementById(id);
      if(!canvas)return;
      const datasets=[
        {label:p.a_label||'Reference',data:p.a||[],tension:.25,pointRadius:0,borderWidth:2},
        {label:p.b_label||'Formula',data:p.b||[],tension:.25,pointRadius:0,borderWidth:2,fill:'-1',backgroundColor:'rgba(15,23,42,.08)'}
      ];
      if(p.difference){
        datasets.push({label:'SCISSOR Difference',data:p.difference||[],tension:.25,pointRadius:0,borderWidth:1});
      }
      new Chart(canvas,{
        type:'line',
        data:{labels:p.labels||[],datasets:datasets},
        options:{
          responsive:true,
          plugins:{legend:{display:true}},
          scales:{
            x:{title:{display:true,text:'Wavelength λ / nm'}},
            y:{title:{display:true,text:'Remission R(λ) / Difference'},min:p.difference?-1:0,max:p.difference?1:1}
          }
        }
      });
    }catch(e){console.error('ARBE chart error',e)}
  })
});