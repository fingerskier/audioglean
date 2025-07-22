// global var to load essentia.js core instance
let essentiaExtractor;
let isEssentiaInstance = false;
// global var for web audio API AudioContext
let audioCtx;
// buffer size microphone stream (bufferSize is high in order to make PitchYinProbabilistic algo to work)
let bufferSize = 4096;
let hopSize = 1024;

let mic, scriptNode, gain;

try {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
} catch (e) {
  throw "Could not instantiate AudioContext: " + e.message;
}

// global var getUserMedia mic stream
let gumStream;

// settings for plotting
let chromaChart;

// minimum brightness percentage for detected notes
const MIN_BRIGHTNESS = 35;

// record native microphone input and do further audio processing on each audio buffer using the given callback functions
function startMicRecordStream(
  audioCtx,
  bufferSize,
  onProcessCallback,
  btnCallback
) {
  // cross-browser support for getUserMedia
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;
  window.URL =
    window.URL || window.webkitURL || window.mozURL || window.msURL;

  if (navigator.getUserMedia) {
    console.log("Initializing audio...");
    navigator.getUserMedia(
      { audio: true, video: false },
      function(stream) {
        gumStream = stream;
        if (gumStream.active) {
          console.log(
            "Audio context sample rate = " + audioCtx.sampleRate
          );
          mic = audioCtx.createMediaStreamSource(stream);
          // We need the buffer size that is a power of two
          if (bufferSize % 2 != 0 || bufferSize < 4096) {
            throw "Choose a buffer size that is a power of two and greater than 4096";
          }
          // In most platforms where the sample rate is 44.1 kHz or 48 kHz,
          // and the default bufferSize will be 4096, giving 10-12 updates/sec.
          console.log("Buffer size = " + bufferSize);
          if (audioCtx.state == "suspended") {
            audioCtx.resume();
          }
          scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
          // onprocess callback (here we can use essentia.js algos)
          scriptNode.onaudioprocess = onProcessCallback;
          // It seems necessary to connect the stream to a sink for the pipeline to work, contrary to documentataions.
          // As a workaround, here we create a gain node with zero gain, and connect temp to the system audio output.
          gain = audioCtx.createGain();
          gain.gain.setValueAtTime(0, audioCtx.currentTime);
          mic.connect(scriptNode);
          scriptNode.connect(gain);
          gain.connect(audioCtx.destination);

          if (btnCallback) {
            btnCallback();
          }
        } else {
          throw "Mic stream not active";
        }
      },
      function(message) {
        throw "Could not access microphone - " + message;
      }
    );
  } else {
    throw "Could not access microphone - getUserMedia not available";
  }
}

function stopMicRecordStream() {
  console.log("Stopped recording ...");
  // stop mic stream
  gumStream.getAudioTracks().forEach(function(track) {
    track.stop();
  });
  $("#recordButton").removeClass("recording");
  $("#recordButton").html(
    'Mic &nbsp;&nbsp;<i class="microphone icon"></i>'
  );
  audioCtx.suspend().then(() => {
    mic.disconnect();
    gain.disconnect();
    scriptNode.disconnect();

    mic, gain, scriptNode = null;
  });
}

// ScriptNodeProcessor callback function to extract pitchyin feature using essentia.js and plotting it on the front-end
function onRecordEssentiaFeatureExtractor(event) {

  let audioBuffer = event.inputBuffer.getChannelData(0);

  // compute RMS for thresholding:
  const rms = essentiaExtractor.RMS(essentiaExtractor.arrayToVector(audioBuffer)).rms;
  // console.info(rms);
  if (rms >= 0.02) {
    // compute hpcp for overlapping frames of audio
    const hpcp = essentiaExtractor.hpcpExtractor(audioBuffer);
    const scaledHPCP = hpcp.map(i => 100 * Math.tanh(Math.pow(i * 0.5, 2)));

    // update hpcp intensity ring (dataset 0)
    chromaChart.data.datasets[0].backgroundColor = KEYS.map((k, i) => {
      const brightness = MIN_BRIGHTNESS + (scaledHPCP[i] * (100 - MIN_BRIGHTNESS)) / 100;
      return `hsl(${PITCH_CLASS_COLORS[k]}, 100%, ${brightness}%)`;
    });

    // detect pitch and octave using PitchYin
    const pitchOut = essentiaExtractor.PitchYin(
      essentiaExtractor.arrayToVector(audioBuffer),
      bufferSize,
      true,
      22050,
      20,
      audioCtx.sampleRate,
      0.10
      );

    let octaveIdx = -1;
    let pitchIdx = -1;
    if (pitchOut.pitch > 0) {
      const midi = Math.round(12 * Math.log2(pitchOut.pitch / 440) + 69);
      const pc = midi % 12;
      pitchIdx = (pc + 3) % 12;
      const octave = Math.floor(midi / 12) - 1;
      octaveIdx = OCTAVES.indexOf(octave);
    }

    OCTAVES.forEach((oct, idx) => {
      chromaChart.data.datasets[idx + 1].backgroundColor = KEYS.map((k, i) => {
        if (idx === octaveIdx && i === pitchIdx) {
          return `hsl(${PITCH_CLASS_COLORS[k]}, 100%, 50%)`;
        }
        return 'rgba(0,0,0,0.1)';
      });
    });

    chromaChart.update();
  } else {
    chromaChart.data.datasets[0].backgroundColor = KEYS.map(
      k => `hsl(${PITCH_CLASS_COLORS[k]}, 100%, ${MIN_BRIGHTNESS}%)`
    );
    OCTAVES.forEach((oct, idx) => {
      chromaChart.data.datasets[idx + 1].backgroundColor = Array(12).fill('rgba(0,0,0,0.1)');
    });
    chromaChart.update();
  }

}

$(document).ready(function() {
  // create essentia plot instance
  chromaChart = new Chart(canvas.getContext('2d'), CHART_CONFIG);

  // add event listeners to ui objects
  $("#recordButton").click(function() {
    let recording = $(this).hasClass("recording");
    if (!recording) {
      $(this).prop("disabled", true);

      // loads the WASM backend and runs the feature extraction
      EssentiaWASM().then(function(essentiaWasmModule) {
        if (!isEssentiaInstance) {
          essentiaExtractor = new EssentiaExtractor(essentiaWasmModule);
          // settings specific to an algorithm
          // essentiaExtractor.profile.HPCP.nonLinear = true;
                    // modifying default extractor settings
          essentiaExtractor.frameSize = bufferSize;
          essentiaExtractor.hopSize = hopSize;
          essentiaExtractor.sampleRate = audioCtx.sampleRate;
          essentiaExtractor.profile.HPCP.normalized = 'none';
          essentiaExtractor.profile.HPCP.harmonics = 0;
          console.log('profile changed')
          isEssentiaInstance = true;
        }
        // start microphone stream using getUserMedia
        startMicRecordStream(
          audioCtx,
          bufferSize,
          onRecordEssentiaFeatureExtractor, // essentia.js feature extractor callback function
          function() {
            // called when the promise fulfilled
            $("#recordButton").addClass("recording");
            $("#recordButton").html(
              'Stop &nbsp;&nbsp;<i class="stop icon"></i>'
            );
            $("#recordButton").prop("disabled", false);
          }
        );
      });
    } else {
      stopMicRecordStream();
    }
  }); // end recordButton onClick
});
