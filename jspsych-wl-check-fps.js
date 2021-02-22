/*
 * Check monitor frame rate plug-in 
 */ 


jsPsych.plugins["wl-check-fps"] = (function() {

  var plugin = {};

  plugin.info = {
    name: "wl-check-fr",
    parameters: {  // Define all input parameters and their corresponding default values
      stop_criterion: {
        pretty_name: "When to stop trial",
      	type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE...
      	default: 'frameN', // EITHER duration OR frameN
      },
      duration: {
        pretty_name: "Test duration",
      	type: jsPsych.plugins.parameterType.INT, 
      	default: 3000, // duration of trial in ms -> IMPORTANT: This does not seem to work as reliably as fixing it based on frame N. For some people, only 1 frame will be acquired (maybe due to background activity???)
      },
      frameN: {
        pretty_name: "N test frames",
      	type: jsPsych.plugins.parameterType.INT, 
      	default: 300, // 500 
      },
      requireFullScreen: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "PointerLock",
        default: false,
        description: "Enable pointer lock mode"
      }
    }
  };



	//BEGINNING OF TRIAL 
  plugin.trial = function(display_element, trial) {

		//--------------------------------------
		//----------- SET UP CANVAS ------------
    //--------------------------------------
    
		//The document body IS 'display_element' (i.e. <body class="jspsych-display-element"> .... </body> )
		var body = document.getElementsByClassName("jspsych-display-element")[0];
		
		// Document body style
		body.style.margin = 0;
		body.style.padding = 0;
		body.style.overflow = 'hidden';
		body.style.width = '100%';
		body.style.height = '100%';
		body.style.backgroundColor = 'black'; // Should match canvas to prevent flickers

		// Setup canvas element
		var canvas = document.createElement("canvas"); // Create
		canvas.setAttribute('id','jspsych-wl-vmr-canvas'); // Give it an id so we reference it
    display_element.appendChild(canvas);  // Append to the DOM
    
    // Canvas style
    canvas.style.position= 'absolute';
    canvas.style.top= '-9999px';
    canvas.style.bottom= '-9999px';
    canvas.style.left= '-9999px';
    canvas.style.right= '-9999px';
		canvas.style.margin = 'auto';
		canvas.style.backgroundColor = 'black'; // Should match body to prevent flickers
		
		// Get width and height & set canvas dimensions
		var canvasWidth = canvas.width = window.innerWidth;
		var canvasHeight = canvas.height = window.innerHeight;
    var centerX = canvasWidth / 2;
    var centerY = canvasHeight / 2;

		// Get the context of the canvas so that it can be painted on.
		var ctx = canvas.getContext("2d");
		
		document.getElementById('jspsych-wl-vmr-canvas').style.cursor = "none";
  
  
  	//--------------------------------------
		//------------ LAUNCH TRIAL ------------
    //--------------------------------------
    // declare global variables (will be used in end_trial function)
    var data;
    var frameRequest;
    var t0;
    var currentTime;
    var frameID;
    var stop;
    var tTrialStart;
    
    // add event listener for full-screen exit
    var exitedFullScreen = false;
    document.addEventListener('fullscreenchange', screenChangeHandler);
      
    // Kick off the main loop for the trial
    runTrial();
    function runTrial() {
 
      if (!exitedFullScreen) {     
        
        data = {
          trialTime: [],
          trialTimeDiff: [],
          trialDur: null,
          resizeTime: []
        }

        t0 = performance.now(); // reset after every frame
        frameID = 0;
        stop = false;
        tTrialStart = performance.now();
        
        stateProcess();
        function stateProcess() {
          frameRequest = window.requestAnimationFrame(stateProcess); // recursive call
      
          // Update time stemps
          currentTime = performance.now();

          // Clear previous drawing within canvas
          ctx.clearRect(0, 0, canvasWidth, canvasHeight); 
      
          // 'Please wait' while computing FPS
          if (trial.stop_criterion === 'duration') {
            stop = (currentTime-tTrialStart) > trial.duration;
          } else if (trial.stop_criterion === 'frameN') {
            stop = frameID > trial.frameN;
          }
      
          if (!stop) {
            // Draw some text
            draw_text('Please wait...',[centerX,centerY],18,'rgb(220, 220, 220)',false);
            if (frameID > 0) {
              data.trialTime.push(prettyTime(currentTime));
              data.trialTimeDiff.push(prettyTime(currentTime-t0));
              t0 = currentTime;
            }
          } else {
            data.trialDur = prettyTime(currentTime-tTrialStart);
            if (!exitedFullScreen) {
              end_trial();
            }
          }

          frameID += 1;
        }
      }
    }
    
    //--------------------------------------
		//---------- HELPER FUNCTIONS ----------
    //--------------------------------------
    
    // Draw some text
    function draw_text(string,[xpos,ypos],fontSize,color,bold){
      ctx.font = fontSize.toString() + 'pt Helvetica';
      if (bold){
        ctx.font = 'bold ' + fontSize.toString() + 'pt Helvetica';
      }
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      var lines = string.split('\n'); // in case of multiple lines of text, split at '\n'
      for(var j = 0; j<lines.length;j++){
        ctx.fillText(lines[j],xpos,ypos+(j*2*fontSize));
      }
    }


    //--------------------------------------
		//------- END TRIAL & SAVE DATA --------
    //--------------------------------------

    // Collect data for saving and end trial
    function end_trial() {
      
      //Place all the data to be saved from this trial in one data object
      var trial_data = { 
        "TrialTime": data.trialTime,
        "trialTimeDiff": data.trialTimeDiff,
        "FPS_avg": Math.round(1000/(data.trialTimeDiff.reduce((a, b) => a + b) / data.trialTimeDiff.length)),
        "FPS_med": Math.round(1000/getMedian(data.trialTimeDiff)),
        "FPS_mode": Math.round(1000/getMode(data.trialTimeDiff)),
        "TrialDur": data.trialDur,
        "winResizeTime": data.resizeTime // time of window resize
        };
        //console.log(trial_data)

      
      //Remove the canvas as the child of the display_element element
      display_element.innerHTML='';
      document.removeEventListener('fullscreenchange', screenChangeHandler);
      
      //End this trial and move on to the next trial
      cancelAnimationFrame(frameRequest);
      jsPsych.finishTrial(trial_data); // this function automatically writes all the trial_data

    } //End of end_trial() function
    
    
    
    function screenChangeHandler() {
      if (!document.fullscreenElement) { // if not in full screen
        data.resizeTime.push(prettyTime(performance.now()));
        exitedFullScreen = true;
        cancelAnimationFrame(frameRequest);
        
        var canvasElement = document.getElementById('jspsych-wl-vmr-canvas');
        canvasElement.style.display = 'none'; // hide canvas
        
        var trial_content_container = document.getElementById("jspsych-content");
        fullScreen = document.createElement('div');
        fullScreen.innerHTML = '<h3>This experiment must be run in full-screen.</h3><br>' +
          '<button id="jspsych-fullscreen-btn" class="jspsych-btn">Enter full screen mode</button>';
      
        trial_content_container.appendChild(fullScreen);
        var fullScreenButton = $('#jspsych-fullscreen-btn')[0];
      
        fullScreenButton.addEventListener('click', function(){
          var element = document.documentElement;
          if (element.requestFullscreen) { element.requestFullscreen(); }
          else if (element.mozRequestFullScreen) { element.mozRequestFullScreen(); }
          else if (element.webkitRequestFullscreen) { element.webkitRequestFullscreen(); }
          else if (element.msRequestFullscreen) { element.msRequestFullscreen(); }
          
          trial_content_container.removeChild(fullScreen);
          $('body').css('cursor', 'none');
            
          setTimeout( function(){
            exitedFullScreen = false;
            if(canvasElement!==null){
              canvasElement.style.removeProperty('display'); // stop hiding the canvas
            }
            runTrial(); // re-run trial after full-screen enter
          }, 200);
        });
      }
    }
    
    
    // get mode
    function getMode(myArray) {
      var counter = {};
      var mode = [];
      var max = 0;
      var myArray_round = [];
      for (i = 0; i< myArray.length; i++) {
        myArray_round[i] = Math.round(10*myArray[i])/10;
      }
      //console.log(myArray)
      for (i = 0; i< myArray_round.length; i++)  {
        if (!(myArray_round[i] in counter))
            counter[myArray_round[i]] = 0;
            counter[myArray_round[i]]++;
 
        if (counter[myArray_round[i]] == max) 
            mode.push(myArray_round[i]);
        else if (counter[myArray_round[i]] > max) {
            max = counter[myArray_round[i]];
            mode = [myArray_round[i]];
        }
      }
      if (mode.length > 1) { // if 2 (or more) values with equal frequency, take mean
        //console.log(mode)
        mode = mode.reduce((a, b) => a + b) / mode.length;
      }
      return mode; 
    }
    
    function getMedian(values) {
      values.slice().sort( function(a,b) {return a - b;} ); // slice() ensures that order of original array is maintained
      var half = Math.floor(values.length/2);
      if(values.length%2) {
        return values[half];
      } else {
        return (values[half-1] + values[half]) / 2.0;
      }
    }
      
    function prettyTime(rawTime){
      return Math.round((rawTime + Number.EPSILON)*1000)/1000;
    } 
      
  }; // End of the plugin's trial() method
  
  return plugin;
})();
