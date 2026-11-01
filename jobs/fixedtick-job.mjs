/** Host-only fixed-tick orchestration. No clocks or scheduling affect simulation dt. */
export async function runFixedTickJob({step,done,finish,onCapture,shouldCancel=()=>false,now=()=>performance.now(),yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0)),maxSliceMs=8,maxStepsPerSlice=16,maxTicks=3601}={}){
 if(typeof step!=='function'||typeof done!=='function'||typeof finish!=='function'||(onCapture!==undefined&&typeof onCapture!=='function')||typeof shouldCancel!=='function'||typeof now!=='function'||typeof yieldControl!=='function'||!Number.isFinite(maxSliceMs)||maxSliceMs<=0||!Number.isSafeInteger(maxStepsPerSlice)||maxStepsPerSlice<1||!Number.isSafeInteger(maxTicks)||maxTicks<1)throw new TypeError('invalid-fixedtick-job-options');
 let ticks=0,recordingError=null,captureEnabled=typeof onCapture==='function';
 const checkCancel=()=>{if(shouldCancel()){const error=new Error('fixedtick-job-cancelled');error.name='AbortError';throw error}};
 const clock=()=>{const t=now();if(!Number.isFinite(t))throw new TypeError('invalid-job-clock');return t};
 while(true){
  checkCancel();
  if(done())return finish({ticks,recordingError});
  if(ticks>=maxTicks)throw new Error('fixedtick-job-tick-limit');
  const start=clock();let sliceSteps=0;
  do{
   checkCancel();
   // The step receives fixed dt and the upcoming canonical tick, never wall time.
   step(1/60,ticks+1);ticks++;sliceSteps++;
   if(captureEnabled){try{onCapture(ticks)}catch(error){if(error?.message!=='replay-byte-cap')throw error;recordingError='replay-byte-cap';captureEnabled=false}}
   checkCancel();
   if(done())return finish({ticks,recordingError});
   if(ticks>=maxTicks)throw new Error('fixedtick-job-tick-limit');
  }while(sliceSteps<maxStepsPerSlice&&clock()-start<maxSliceMs);
  await yieldControl();
 }
}
