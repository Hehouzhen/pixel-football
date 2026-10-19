export function sceneSound(type,start=0){
 const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Audio)return()=>{};const audio=new Audio(),master=audio.createGain();master.gain.value=.055;master.connect(audio.destination);
 const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.35;
 const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=type==='contract'?350:650;gain.gain.value=type==='contract'?.035:.28;noise.connect(filter);filter.connect(gain);gain.connect(master);noise.start();
 const tap=(at,frequency,length,volume)=>{if(at<start)return;const oscillator=audio.createOscillator(),envelope=audio.createGain(),when=audio.currentTime+at-start;oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency,when);oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*.45),when+length);envelope.gain.setValueAtTime(volume,when);envelope.gain.exponentialRampToValueAtTime(.001,when+length);oscillator.connect(envelope);envelope.connect(master);oscillator.start(when);oscillator.stop(when+length)};
 if(type==='tunnel'){gain.gain.setValueAtTime(.12,audio.currentTime);gain.gain.linearRampToValueAtTime(.38,audio.currentTime+Math.max(0,2.8-start));for(const at of [.15,.5,.85,1.2,1.55,1.9,2.25,2.6])tap(at,90,.10,.6)}
 if(type==='academy')for(const at of [.4,.95,1.5,2.05,6.5,7,7.5,8,8.5,9])tap(at,90,.12,.7);
 if(type==='contract')for(const at of [1.6,1.85,2.15,2.5,2.85,3.2])tap(at,650,.035,.16);
 if(type==='award')for(let i=0;i<18;i++)tap(5.8+i*.16,140+i%3*50,.035,.25);
 audio.resume().catch(()=>{});return()=>{noise.stop();audio.close().catch(()=>{})};
}
