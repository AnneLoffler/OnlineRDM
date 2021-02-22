/*
 * Random-dot motion (RDM) task plug-in 
 */ 


jsPsych.plugins["wl-rdm"] = (function() {

  var plugin = {};

  plugin.info = {
    name: "wl-rdm",
    parameters: {  // Define all input parameters and their corresponding default values
      motion_coherence: {
      	pretty_name: "Motion choherence",
      	type: jsPsych.plugins.parameterType.INT,
      	default: 0 //
      },
      motion_direction: {
      	pretty_name: "Motion direction",
      	type: jsPsych.plugins.parameterType.INT,
      	default: 0 // 0 = left | 1 = right
      },
      color_rgb: {
        type: jsPsych.plugins.parameterType.INT, 
        array: true,
        pretty_name: "Dot color",
        default: [255,255,255], // white
      },
      response_keys: {
        type: jsPsych.plugins.parameterType.KEYCODE, 
        pretty_name: "Choice keys motion",
        array: true,
        default: ['f','j'],
        description: 'Keys for yellow/blue choices.'
      },
      PPD: {
      	pretty_name: "Pixel per degree", // pixels per degree of visual angle 
      	type: jsPsych.plugins.parameterType.INT,
      	default: 30
      },
      aperture_radius: {
        pretty_name: "Aperture radius", // in deg
      	type: jsPsych.plugins.parameterType.INT,
      	default: 2.5
      },
      dot_density: {
      	pretty_name: "Dot density",
      	type: jsPsych.plugins.parameterType.INT,
      	default: 16 // in dots/deg^2/s
      },
      dot_speed: {
      	pretty_name: "Dot speed", // in deg/s
      	type: jsPsych.plugins.parameterType.INT,
      	default: 5
      },
      dot_size: {
      	pretty_name: "Dot size",
      	type: jsPsych.plugins.parameterType.INT,
      	default: 2 // in pix
      },
      refresh_rate: {
        pretty_name: "FPS",
        type: jsPsych.plugins.parameterType.INT, 
        default: null,
        description: "Screen refresh rate" // Hz
      },
      RDM_location: {
        pretty_name: "RDM location",
        type: jsPsych.plugins.parameterType.INT, 
        default: [0, 0],
        array: true,
        description: "x and y coordinates of RDM aperture" // offset from canvas center
      },
      fix_color: {
        type: jsPsych.plugins.parameterType.STRING, 
        pretty_name: "Fixation color",
        default: [255,0,0]
      },
      onset_delay:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Onset delay",
        default: [400,400,800], // drawn randomly from truncated exponential distribution with [mu, lowB, upB]
        array: true,
        description: "RDM onset delay (in ms)"
      },
      feedback_dur:{ // for warning messages in miss trials
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Feedback duration",
        default: 750,
        description: "Feedback duration (in ms)"
      },
      error_timeout:{ // extra delay after errors/misses (in addition to feedback duration)
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Error timeout",
        default: 1750,
        description: "Error timeout duration (in ms)"
      },
      RT_deadline:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "RT deadline",
        default: 3000,
        description: "Deadline for response initiation (in ms)" // = max stim duration
      },
      demo_trial: { // demo trial: slowed-down trial, showing instructions for each step on screen
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "Demo trial",
        default: false,
        description: "Demo trial? (true/false)"
      },
      score:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Current score",
        default: 0,
        description: "Current point score" 
      },
      display_score: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Display score',
        default: false
      },
      requireFullScreen: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "requireFullScreen",
        default: true,
        description: "Require full screen"
      },
      pause: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "Pause",
        default: false,
        description: "Pausing the experiment?"
      },
      pointer_lock: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "PointerLock",
        default: true,
        description: "Enable pointer lock mode"
      }
    }
  };



	//BEGINNING OF TRIAL 
  plugin.trial = function(display_element, trial) {

    t0 = performance.now();
		//--------------------------------------
		//----------- SET UP CANVAS ------------
    //--------------------------------------
    var centerX = null;
    var centerY = null;
    
    if (!trial.pause) { // (trial.inFullScreen || !trial.requireFullScreen) { 

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
      centerX = canvasWidth / 2;
      centerY = canvasHeight / 2;

		  // Get the context of the canvas so that it can be painted on.
		  var ctx = canvas.getContext("2d");
		
		  //console.log('canvas')
    }
    
    
		//--------------------------------------
		//------------- GENERATE DOTS ----------
    //--------------------------------------
    var RDM = {
      coherence: trial.motion_coherence/100,
      density: trial.dot_density, // in dots/deg^2/s
      speed: trial.dot_speed, // in deg/s
      radius: trial.aperture_radius, // in deg
      duration: trial.RT_deadline/1000, // max stim duration in sec
      ppd: trial.PPD, // pixels per degree of visual angle 
      fps: trial.refresh_rate, // monitor frame rate
      size: trial.dot_size,
    };

    if (trial.motion_direction === 1) {
      RDM.direction = 0; // right
    } else {
      RDM.direction = 180; // left
    }
    
    // generate random dots
    RDM = generate_RDM_frames(RDM);
    //console.log(RDM.X[0][0]);
    
    // determine onset time of RDM stimulus
    if (trial.onset_delay.length>1) { // draw randomly from truncated exponential
      RDM.onset = randomNumExp(trial.onset_delay[0],trial.onset_delay[1],trial.onset_delay[2]);
    } else { // if only single value is provided, onset time is fixed
      RDM.onset = trial.onset_delay[0];
    }
    //console.log(RDM.onset)

      
    //--------------------------------------
		//-------- INITIALIZE VARIABLES --------
    //--------------------------------------

    // Initialize variables to be saved in every trial
    var data = {
      RT: null,
      choice_key: null, 
      choice: null,
      accuracy: null,
      dots: [],
      timeArray: [],
      stateArray: [],
      dotCohFlag: [],
      dotX: [],
      dotY: [],
      dotCol: [],
      missTrial: false,
      missTrialMsg: '',  // accumulate miss trial messages
      fullScreenExitTime: [], // time stamps for full-screen exit (if any)
      resizeTime: [] // time stamps for window size change (if any)
    };
            
    // define correct choice of trial
    data.correctChoice = trial.motion_direction;
    
    var fix = {
      x: window.innerWidth/2,
      y: window.innerHeight/2,
      color: trial.fix_color,
      };
    
    // States
    var State = {
      MAPPING: 1, // show mapping on screen
      FIXATE: 2, //
      DELAY: 3,     // delay before stimulus onset (check that no key is pressed)
      RDM_ON: 4,        // RDM onset
      RESPONSE_WAIT: 5,  // wait for participant's response / turn off stimulus
      FEEDBACK: 6,    // present feedback / warning message
      FINISH: 7,  // ends trial/saves data
      
      Current: 1,     // current state
      StartTime: null,  // Time of last state change
      Time: null       // Time since last state change
    };
    
    // Required globals for state_process
    var trialStartTime;
    var currentTime;
    var RDM_Time = 0; // onset of RDM stimulus (will later on be overwritten by actual time stemp, but initialize here in case of early response)
    var prettyTimestamp;
    var previousTime;
    var frameRequest;
    var frameID = 0;
    var feedbackText = '';
    var feedbackCol = 'red';//'rgb(220, 220, 220)';
    var instructionText = '';
    
   
    //--------------------------------------
		//----- INITIALIZE EVENT HANDLERS ------
    //--------------------------------------
    var keyPersist = false; // usually only alloow for single key press in a given trial
    if (trial.demo_trial) {
      keyPersist = true; // in demo trial, allow for 2nd key press in case 1st was too early/late/wrong
    }
    // jsPsych key press listener 
    var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: function(info){
          response = info;
          data.choice_key = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(response.key);
          data.RT = response.rt-RDM_Time;
          //console.log(data.choice_key);
          //console.log(RDM_Time);
        },
        valid_responses: trial.response_keys,
        rt_method: 'performance', // based on performance.now() function
        persist: keyPersist, // only allow for single response in trial
        allow_held_key: false
    });
    
    
    document.addEventListener('fullscreenchange', screenChangeHandler);
    function screenChangeHandler() {
      if (!document.fullscreenElement) { // if not in full screen
        //if (trial.inFullScreen) { // if previously in full screen
          //console.log('full screen exit')
          data.missTrial = true; 
          data.missTrialMsg = data.missTrialMsg + 'exitFullScreen ';
          data.resizeTime.push(performance.now() - t0);
          $('body').css('cursor', 'auto');
          document.exitPointerLock = document.exitPointerLock ||
                                     document.mozExitPointerLock;
          // Attempt to unlock
          document.exitPointerLock();
          
          trial.pause = true;
          end_trial();

      } else { // if back in full screen
        //console.log('full screen enter')
        if (!trial.inFullScreen) { // if previously not in full screen
          data.missTrial = true; 
          data.missTrialMsg = 'enterFullScreen '; // save this as a miss, as we immediately end the trial and properly restart trial routine on next trial again (this ensure the trial will be repeated)
          trial.pause = false;
          display_element.innerHTML=' ';

          setTimeout(function(){ end_trial() },200); // wait so that screen size will be recorded properly upon full screen enter
        } 
      } 
    };


  	//--------------------------------------
		//------------ LAUNCH TRIAL ------------
    //--------------------------------------
    if (!trial.pause) { //(trial.inFullScreen || !trial.requireFullScreen) { // only run trial if full screen is active (or if not required)
      // automatically request pointer lock
      reqPointerLock();

      // Kick off the main loop for the trial
      stateProcess();
    
      // Everything in here is looping
      function stateProcess() {

        frameRequest = window.requestAnimationFrame(stateProcess); // recursive call
      
        // Update global timer
        currentTime = performance.now();
      
        if (trialStartTime === undefined) { trialStartTime = currentTime; } // first Trial frame
        if (State.StartTime === null) { State.StartTime = currentTime; } // first State frame
        State.Time = currentTime - State.StartTime;
      
      
        // instructions for demo trial
        if (trial.demo_trial) {
          if (State.Current < State.RDM_ON) {
            instructionText = 'Look at the red fixation cross\n and wait for the dots to appear.';
          }
          if (State.Current === State.RDM_ON) {
            instructionText = '';
          }
          if ((State.Current === State.RESPONSE_WAIT && State.Time > 750) || (State.Current === State.FEEDBACK )) {
            if (trial.motion_direction === 0) {
              instructionText = 'In this example, the majority of dots move LEFT\n[Press '+trial.response_keys[0].toUpperCase() +']';
            } else if (trial.motion_direction === 1) {
              instructionText = 'In this example, the majority of dots move RIGHT\n[Press '+trial.response_keys[1].toUpperCase() +']';
            }
          }
          if (State.Current === State.FINISH) {
            instructionText = '';
          }
        }


        //--------------------------------------
		    //----------- SWITCH STATES ------------
        //--------------------------------------
      
        switch (State.Current) {
          
          case State.MAPPING: // show mapping on screen
            if (State.Time > 500) {
              advanceState(State.FIXATE); 
            }
            break;
          
      		case State.FIXATE: // show fixation cross
      		    if (!trial.demo_trial || !data.missTrial) { 
      		      advanceState(State.DELAY); 
      		    } else if (trial.demo_trial && data.missTrial && State.Time > trial.feedback_dur) { // in case of previous 'too early' response, wait for feedback
      		      frameID = 0; // reset everything to repeat trial
      		      data.choice_key = null; 
      		      data.RT = null;
      		      data.missTrial = false;
      		      feedbackText = '';
                advanceState(State.DELAY);
      		    } 
      			break;
      			
          case State.DELAY:
      			if (data.choice_key){ // if choice is made
      			  data.missTrial = true;
              data.missTrialMsg = data.missTrialMsg + 'too_early ';
              feedbackText = 'Too early!\n(-1)';
              if (trial.demo_trial) { 
                advanceState(State.FIXATE); // go back to FIXATE
              } else {
                setTimeout(function(){feedbackText = '';}, trial.feedback_dur); // clear the feedback text after 1 second
                advanceState(State.FEEDBACK); // move on to feedback (trial will be repeated)
              }
            } else if (State.Time > RDM.onset){ // AND the delay duration has elapsed
              RDM_Time = currentTime - trialStartTime;
        			advanceState(State.RDM_ON); // advance
        		}
      			break;
    
    		  case State.RDM_ON: // don't really need this extra state
      		  //console.log(RDM_Time);
        		advanceState(State.RESPONSE_WAIT); // advance
      		  break;
      			
    		  case State.RESPONSE_WAIT: // wait for response
    			  if (data.choice_key){ // if choice is made
              data.choice = trial.response_keys.findIndex(x => x === data.choice_key.toUpperCase());
              //console.log(data.choice);
              data.accuracy = data.choice == data.correctChoice;
              if (data.RT < 100) { // if RT < 100 ms, count as too early
                data.missTrial = true;
                data.missTrialMsg = data.missTrialMsg + 'too_early ';
                feedbackText = 'Too early!\n(-1)';
                setTimeout(function(){feedbackText = '';}, trial.feedback_dur); // clear the feedback text after 1 second
                if (trial.demo_trial) {
                  advanceState(State.FIXATE); // go back to FIXATE
                } else {
                  advanceState(State.FEEDBACK); // move on to feedback (trial will be repeated)
                }
              } else {
                if (data.accuracy) {
    				      feedbackText = 'Correct\n(+1)';
    				      feedbackCol = 'green';
    				    } else {
    				      feedbackText = 'Wrong\n(-1)';
    				      feedbackCol = 'red';
    				    }
    				    if (trial.demo_trial && !data.accuracy) {
    				      advanceState(State.FIXATE); // go back to FIXATE
    				    } else {
    				      advanceState(State.FEEDBACK); // advance
    				    }
              }
    			  } else if (State.Time > trial.RT_deadline) { // if no response has been made
              data.missTrial = true; 
              data.missTrialMsg = data.missTrialMsg + 'RT_timeout ';
              feedbackText = 'Too slow!\n(-1)';
              //console.log(data.accuracy);
              if (trial.demo_trial) {
                advanceState(State.FIXATE); // go back to FIXATE
              } else {
                advanceState(State.FEEDBACK); // move on to feedback (trial will be repeated)
              }
            }
    			  break;
    
    		  case State.FEEDBACK: 
    		  
    		    if ((data.accuracy & State.Time > trial.feedback_dur) || ((!data.accuracy || data.missTrial) & State.Time > (trial.feedback_dur+trial.error_timeout))) { // after feedback duration, remove feedback
    		      feedbackText = '';
    		      advanceState(State.FINISH);
    		    }
            break;
          
    		  case State.FINISH:
            if(trial.demo_trial && State.Time>1500){
              end_trial();
              break;
            }else{
              feedbackText = '';
              end_trial();
              break;
            }
    
          }
      
          //*---------- Draw -----------*//

          // Clear previous drawing within canvas
          ctx.clearRect(0, 0, canvasWidth, canvasHeight); 
        
          if (State.Current<=State.FINISH) {
          
            // show response mapping throughout trial
            drawLineWithArrows(centerX-0.25*centerX-20,centerY+0.75*centerY,centerX-0.25*centerX+20,centerY+0.75*centerY,5,8,true,false);
            drawLineWithArrows(centerX+0.25*centerX-20,centerY+0.75*centerY,centerX+0.25*centerX+20,centerY+0.75*centerY,5,8,false,true);
            draw_text(trial.response_keys[0].toUpperCase(),[centerX-0.25*centerX,centerY+0.7*centerY],16,'white',true);
            draw_text(trial.response_keys[1].toUpperCase(),[centerX+0.25*centerX,centerY+0.7*centerY],16,'white',true);
            if (trial.display_score) {
              if (trial.score<0) {
                draw_text('Score: ' + trial.score.toString() + ' points',[centerX-0.75*centerX,centerY+0.7*centerY+16],16,'red',true);
              } else {
                draw_text('Score: ' + trial.score.toString() + ' points',[centerX-0.75*centerX,centerY+0.7*centerY+16],16,'green',true);
              }
            }

            if (State.Current >= State.FIXATE) {
              // Draw fixation cross
              draw_fix(fix.x,fix.y,5,'rgb(' + fix.color + ')',1,1);
          
              // Present dots
              //console.log(RDM.X.length);
              if ((State.Current==State.RDM_ON || State.Current==State.RESPONSE_WAIT) && frameID < RDM.X.length-1) {
                for (i=0; i<RDM.dots_per_channel; i++) {
                  draw_circle(centerX+RDM.X[frameID][i],centerY+RDM.Y[frameID][i],RDM.size,'rgb(' + trial.color_rgb + ')',1,1);
                }
            
                // save presented dot positions and time arrays
                data.timeArray.push(prettyTime(currentTime - RDM_Time));
                data.stateArray.push(State.Current);
                data.dotCohFlag.push(RDM.coherent_move_flag[frameID]);
                data.dotX.push(RDM.X[frameID]);
                data.dotY.push(RDM.Y[frameID]);
                data.dotCol.push(RDM.dot_col[frameID]);

                frameID += 1; // increment draw frame count
                //console.log(frameID)
              }
        
              // Draw feedback text
              draw_text(feedbackText,[centerX,centerY+100],20,feedbackCol,true);
              if(trial.demo_trial){
                // Draw instruction text in demo trial
                draw_text(instructionText,[centerX,centerY-0.5*centerY],16,'rgb(220, 220, 220)',false);
              }
            }
          }
        } // end of state_process() function
    } 


    //--------------------------------------
		//---------- HELPER FUNCTIONS ----------
    //--------------------------------------
    
    // draw fixation cross
    function draw_fix(x,y,radius,color,isFilled, width){
          
      // outer circle
      draw_circle(x,y,8,color,1, width);

      // horizontal line
      ctx.beginPath();
      ctx.moveTo(x-10, y);
      ctx.lineTo(x+10, y);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'black';
      ctx.stroke();
          
      // vertical line
      ctx.beginPath();
      ctx.moveTo(x, y+10);
      ctx.lineTo(x, y-10);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'black';
      ctx.stroke();

      // inner circle
      draw_circle(x,y,2,color,1, width);
    }
        

    // Draw a circle
    function draw_circle(x,y,radius,color,isFilled, width){
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2*Math.PI, false); 
      if (isFilled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.stroke();
    }

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
   
   
    // x0,y0: the line's starting point
    // x1,y1: the line's ending point
    // width: the distance the arrowhead perpendicularly extends away from the line
    // height: the distance the arrowhead extends backward from the endpoint
    // arrowStart: true/false directing to draw arrowhead at the line's starting point
    // arrowEnd: true/false directing to draw arrowhead at the line's ending point
    function drawLineWithArrows(x0, y0,x1,y1,aWidth,aLength,arrowStart,arrowEnd){
      var dx=x1-x0;
      var dy=y1-y0;
      var angle=Math.atan2(dy,dx);
      var length=Math.sqrt(dx*dx+dy*dy);
    
      ctx.translate(x0,y0);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(length,0);
      if(arrowStart){
        ctx.moveTo(aLength,-aWidth);
        ctx.lineTo(0,0);
        ctx.lineTo(aLength,aWidth);
      }
      if(arrowEnd){
        ctx.moveTo(length-aLength,-aWidth);
        ctx.lineTo(length,0);
        ctx.lineTo(length-aLength,aWidth);
      }

      ctx.lineWidth = 5;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.setTransform(1,0,0,1,0,0);
    }

   
    // draw random number from truncated exponential distribution with mean mu, and lower + upper bound
    function randomNumExp(mu,lowB,upB) { 
      var myRandExp = 2*upB;
      while (myRandExp > upB) {
        myRandExp = lowB - mu * Math.log(Math.random());
      }
      return myRandExp;
    }
    
    function prettyTime(rawTime){
      return Math.round((rawTime + Number.EPSILON)*1000)/1000;
    }
    
    function advanceState(nextState){
      State.StartTime = currentTime; // reset state timer
      State.Current = nextState; // advance
      //writeFrameData(currentTime); // input must be the GLOBAL timestamp!
    }


    // Pointer Lock functions -- experimental in progress
    function reqPointerLock(){
      document.getElementById('jspsych-wl-vmr-canvas').style.cursor = "none";
      setTimeout( function(){
        //ctx.clearRect(0, 0, canvas.width, canvas.height); 
        
        // support for firefox
        document.body.requestPointerLock = document.body.requestPointerLock ||
                                           document.body.mozRequestPointerLock;
                                           
        // start pointer lock
        document.body.requestPointerLock();

        // Remove the click engagement listener
        //canvas.removeEventListener('click', reqPointerLock);
          
        }, 0); // wait 1500 ms after pointer lock has been enabled
    }

    

    // -------------------------------------------
    // --------- GENERATE RANDOM DOTS ------------ 
    // -------------------------------------------
    function generate_RDM_frames() {
      
      // function transforming polar to Cartesian coordinates
      function pol2cart(th, r) {
        var x = r * Math.cos(th);
        var y = r * Math.sin(th);
        return [x,y];
      }

      // compute how many dots we have per channel
      var area = Math.PI*Math.pow(RDM.radius, 2);
      var dots_per_channel = Math.round(RDM.density * area / RDM.fps);
      var nbank=3;
      var total_frames = Math.round(RDM.duration * RDM.fps); // total frames
      
      // initialise matrices for dots
      X = Array(total_frames).fill(null).map(() => Array(dots_per_channel).fill(0)); //zeros(total_frames , dots_per_channel);
      Y = Array(total_frames).fill(null).map(() => Array(dots_per_channel).fill(0)); //zeros(total_frames , dots_per_channel);
      col = Array(total_frames).fill(null).map(() => Array(dots_per_channel).fill(0)); //zeros(total_frames , dots_per_channel);
      coherent_move_flag = Array(total_frames).fill(null).map(() => Array(dots_per_channel).fill(0)); //zeros(total_frames , dots_per_channel);
      // console.log(JSON.stringify(X))
      // console.log(X.length)


      // generate dot positions for frames 1 to nbank
      for (f=0; f < nbank;f++) {
        // draw random points uniform in the circular aperture
        // based on the fact that to be uniform in the circle we sample
        // theta=2*pi*rand and r=radius*sqrt(rand)
        for (d=0; d < dots_per_channel; d++) {
          [x,y] = pol2cart(2*Math.PI*Math.random(),RDM.radius * Math.pow(Math.random(),0.5))
          X[f][d] = x; 
          Y[f][d] = y; 
        }
      }
      // console.log(JSON.stringify(X))
      // console.log(JSON.stringify(Y))

      
      // precompute which dots to move coherently in each frame
      for (f=0; f < total_frames; f++) {
        for (d=0; d < dots_per_channel; d++) {
          coherent_move_flag[f][d] = Math.random() < RDM.coherence;
        }
      }
      // console.log(JSON.stringify(coherent_move_flag))
      
      
      // offset for coherent dots
      [x,y] = pol2cart(RDM.direction*Math.PI/180 , nbank * RDM.speed/RDM.fps);
      dx_coh = x;
      dy_coh = y;
      //console.log(dx_coh)
      //console.log(dy_coh)


      // generate dot positions for frames nbank+1 to n_frames
      for (f = nbank; f < total_frames; f++) {
        for (d = 0; d < dots_per_channel; d++) {
          if (coherent_move_flag[f][d]) {   // displace dot coherently
            // there are nbank banks of dots that are interleaved
            X[f][d] = X[f-nbank][d] + dx_coh;
            Y[f][d] = Y[f-nbank][d] + dy_coh;
            //console.log(Y[f-nbank][d])
            // if dot has moved out of aperture, draw a new dot on other edge of
            // aperature
            while (Math.pow(Math.pow(X[f][d],2)+Math.pow(Y[f][d],2),0.5) > RDM.radius) {
              // consider the dots for a leftward motion (direction=180) going out of a unit radius aperture
              // then they should come back in uniformly in the y direction on
              // the other side betwen y=[-1 and 1] and we can convert the y value to
              // the angle as asin(y) which will lie between -90 and 90 (i,e on
              // the right hand side of the apeture)
              // to generate a random angle we uniformly sample y between -1 and 1 and calculate as follows
              ang = Math.asin(2*Math.random()-1);  // angle around the emanating direction (-90,+90)
                
              // if the direction is not leftward (180) we need to offset the angle as follows
              ang = ang + RDM.direction*Math.PI/180 + Math.PI; //center on emanating direction
                
              // put dot at edge of aperature
              [x,y] = pol2cart(ang, RDM.radius);
              X[f][d] = x;
              Y[f][d] = y;

              // displace in motion direction uniformly randomly by motion step
              r=Math.random();
              X[f][d] = X[f][d]+dx_coh*r;
              Y[f][d] = Y[f][d]+dy_coh*r;
            }
          } else { //  replace non-coherent dots at random position in aperture
            [x,y] = pol2cart(2*Math.PI*Math.random(), RDM.radius*Math.pow(Math.random(),0.5));
            X[f][d] = x;
            Y[f][d] = y;
          }
        }
      }
      //console.log(JSON.stringify(X))


      // tranform all coordinates into pixel locations
      for (f = 0; f < total_frames; f++) {
        for (d = 0; d < dots_per_channel; d++) {
          X[f][d] = X[f][d] * RDM.ppd;
          Y[f][d] = Y[f][d] * RDM.ppd;
        }
      }

      // add color to each dot
      // color is independent of motion. E.g., a rightward moving dot should not
      // necessarily be blue on its first and second position. Instead, if it's
      // blue in its first position, it could be either yellow or blue in its
      // second position.
      if (RDM.color == 1) { // majority is blue
        for (f=0; f < total_frames;f++) {
          for (d=0; d < dots_per_channel; d++) {
            if (Math.random() < RDM.color_coh) {
              col[f][d] = 1; // majority blue
            } else {
              col[f][d] = 0; // minority yellow
            }
          }
        }
      } else {  // majority is yellow
        for (f=0; f < total_frames;f++) {
          for (d=0; d < dots_per_channel; d++) {
            if (Math.random() < RDM.color_coh) {
              col[f][d] = 0; // majority yellow
            } else {
              col[f][d] = 1; // minority blue
            }
          }
        }
      }

      //console.log(RDM)
      
      // save full RDM structure
      return RDM = {
        // copy all of these from above so that function also returns the pre-defined values
        coherence: RDM.coherence,
        color: RDM.color,
        color_coh: RDM.color_coh,
        density: RDM.density, // in dots/deg^2/s
        speed: RDM.speed,   // in deg/s
        radius: RDM.radius, // in deg
        duration: RDM.duration, // max stim duration in sec
        ppd: RDM.ppd, // pixels per degree of visual angle 
        fps: RDM.fps, // monitor frame rate
        size: RDM.size, 
        onset: RDM.onset, 
        dots_per_channel: dots_per_channel,
        coherent_move_flag: coherent_move_flag,
        total_frames: total_frames,
        X: X,
        Y: Y,
        dot_col: col
      };
    }



    //--------------------------------------
		//------- END TRIAL & SAVE DATA --------
    //--------------------------------------

    // Collect data for saving and end trial
    function end_trial() {

      //Place all the data to be saved from this trial in one data object
      var trial_data = { 
        "MotCoh": trial.motion_coherence, // motion coherence
        "MotDir": trial.motion_direction, // motion direction
        "ChoiceKey": data.choice_key, // pressed key
        "Choice": data.choice, // choice
        "Accuracy": data.accuracy, // accuracy
        "RT": data.RT, // RT
        "DotCohFlag": data.dotCohFlag,
        "DotX": data.dotX,
        "DotY": data.dotY,
        "DotCol": data.dotCol,
        "TrialTime": data.timeArray, // Array of time stamps for each trajectory data point (time point since trial start)
        "State": data.stateArray, // Array of states since go cue
        "nFrames": frameID, //data.frameRate.length, // Number of frames in this trial
        "FPS": RDM.fps,
        "PPD": RDM.ppd,
        "missTrial": data.missTrial, // miss trial (true/false)
        "missTrialMsg": data.missTrialMsg, // miss trial message/type
        "RDM_location": trial.RDM_location, // center of RDM location
        "onsetDelay": RDM.onset, // RDM onset delay (drawn randomly from truncated exponential)
        "fullScreenExitTime": data.fullScreenExitTime, // time of full-screen exit (if any)
        "winResizeTime": data.resizeTime, // time of window resize
        "canvCenter": [centerX, centerY]
      };

      //Remove the canvas as the child of the display_element element
      if (!trial.pause) { //(trial.inFullScreen) { // if not, don't clear so full-screen instruction/button doesn't disappear
        display_element.innerHTML=' ';
      }
      
      // remove keyboard listener
      jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
      document.removeEventListener('fullscreenchange', screenChangeHandler);
      //canvas.removeEventListener('click', reqPointerLock);
      
      //End this trial and move on to the next trial
      cancelAnimationFrame(frameRequest);

      jsPsych.finishTrial(trial_data); // this function automatically writes all the trial_data

    } //End of end_trial() function
    
    
  }; // End of the plugin's trial() method
  
  return plugin;
})();
