/**
 * jspsych-wl-html-keyboard-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["wl-html-keyboard-response"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'wl-html-keyboard-response',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Stimulus',
        default: ''
      },
      block_break: { // is this screen indicating a block break?
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Block break',
        default: false
      },
      block: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Block',
        default: 0,
        description: 'Current block number' 
      },
      blocks_total: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'n Blocks',
        default: 1,
        description: 'Total number of blocks' 
      },
      final_block: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Final block',
        default: false,
        description: 'Is current block final block' 
      },
      score: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Score',
        default: 0,
        description: 'Current point score' 
      },
      choice_labels: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Choices',
        default: 'continue',
        array: true,
        description: 'The labels for the buttons.'
      },
      choice_keys: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Keys',
        default: 'enter',
        array: true,
        description: 'Keys for each choice option.'
      },
      button_html: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button HTML',
        default: '<button class="jspsych-btn-key" >%choice%</button>', // %choice% is a regexp-friendly string that will be filled later via buttons[i].replace
        array: true,
        description: 'The html of the button. Can create own style.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed under the button.'
      },
      stimulus_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Stimulus duration',
        default: null,
        description: 'How long to hide the stimulus.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'How long to show the trial.'
      },
      trial_iti: { // how long to wait after trial
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial ITI',
        default: 2000,
        description: 'How long to wait before next trial.'        
      },
      margin_vertical: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin vertical',
        default: '0px',
        description: 'The vertical margin of the button.'
      },
      margin_horizontal: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin horizontal',
        default: '8px',
        description: 'The horizontal margin of the button.'
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, then trial will end when user responds.'
      },
      clear_html_on_finish: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Clear HTML on response',
        default: true,
        description: 'If true, then the page is cleared before next trial (standard behavior).'
      },
      requireFullScreen: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Check full-screen mode',
        default: true,
        description: 'Check if participant stays in full-screen mode.'
      },
      hideButtonDuration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Button delay',
        default: null,
        description: 'Time in milliseconds before button is displayed.'
      },
      button_location_y: { // only in WL version!: y-location of buttons (specify array if more than 1 button)
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Button location Y',
        default: null,
        array: true,
        description: 'Absolute button y-coordinates in pixels.' 
      }

    }
  };

  // on_start callback is triggered before jsPsych.doTrial() calls this trial method
  plugin.trial = function(display_element, trial) {

    // store response
    var data = {
      choice_key: null,
      RT: null,
      button_pressed: null
    };
    
    // add keyboard listener
    var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
      callback_function: function(info){
          response = info;
          if (response.rt > trial.hideButtonDuration) {
            data.RT = response.rt;
            data.choice_key = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(response.key);
            choice = trial.choice_keys.findIndex(x => x === data.choice_key.toUpperCase());
            if (choice === -1) {
              choice = 0;
            }
            //console.log(choice)
            simulateClick(choice);
          }
      },
      valid_responses: trial.choice_keys,
      rt_method: 'performance',
      persist: true,
      allow_held_key: false
    });

    // window resize event handler
    window.onresize = function(){
      //$('body').css('cursor', 'auto');
      document.exitPointerLock = document.exitPointerLock ||
                                     document.mozExitPointerLock;
      // Attempt to unlock
      document.exitPointerLock();
    };
    
    $('body').css('cursor', 'none');

    
    // define what to display
    var reward = Math.round(100*trial.score/100)/100; 
    var html;
    // the stimulus that the buttons are responding to (HTML code specified by user)
    if(trial.block_break) {
      if (!trial.final_block) {
        html = '<div id="jspsych-html-button-response-stimulus">'+
          '<h3 align=center>End of block ' + trial.block.toString() + '/' + trial.blocks_total.toString() + '.<br><br>' +
          'You can take a short break now.<br><br></h3>';
        html += 'Current score: ' + trial.score.toString() + ' Points ($' + reward.toString() + ')<br><br><br>';
        html += 'Press space bar to start the next block.<br><br></h3>' +
          '<p class="instructions-text"></p><br><br>' + '</div>';
      } else if (trial.final_block) {
        html = '<div id="jspsych-html-button-response-stimulus">'+
          '<h3 align=center>End of last block!<br><br>';
        
        html += 'Well done, your final score is ' + trial.points.toString() + ' Points ($' + reward.toString() + ')</h3>' +
          '<p class="instructions-text"></p><br><br>' + '</div>';
      }
    } else {
        html = '<div id="jspsych-html-button-response-stimulus">'+trial.stimulus+'</div>';
    }
    
    
    // create the display buttons
    var buttons = [];
    if (Array.isArray(trial.button_html)) { // if the html for each button is split up in an array
      if (trial.button_html.length == trial.choice_labels.length) {
        buttons = trial.button_html; // set directly
      } else {
        console.error('Error in html-button-response plugin. The length of the button_html array does not equal the length of the choices array');
      }
    } else { // if the html is a single string (buttons will be identical?)
      for (var i = 0; i < trial.choice_labels.length; i++) { // go through the choices vector
        buttons.push(trial.button_html); // create an array entry for each choice with the same html string
      }
    }
    html += '<div id="jspsych-html-button-response-btngroup">'; // open a button group div in the html
    
    // if no button location specified
    if (trial.button_location_y === null) { 
      for (var i = 0; i < trial.choice_labels.length; i++) { // for each choice
        var str = buttons[i].replace(/%choice%/g, trial.choice_labels[i]); // replace placeholder text with actual choice
        html += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
      } // append a response button div within the button group div, storing the index of the choice in the data-choice attribute
    }
    // if button location provided  
    else { 
      for (var i = 0; i < trial.choice_labels.length; i++) { // for each choice
        var str = buttons[i].replace(/%choice%/g, trial.choice_labels[i]); // replace placeholder text with actual choice
        html += '<div class="jspsych-html-button-response-button" style="display: block; position: absolute; top: '+(trial.button_location_y-6)+ 'px; right: 45%; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
      }
    }
    html += '</div>'; // close the button group div
    
    //show prompt if there is one
    if (trial.prompt !== null) {
      html += trial.prompt;
    }

    display_element.innerHTML = html; // put the completed html into the HTMLElement (display_element)
    
    
    // add event listeners to buttons
    for (var i = 0; i < trial.choice_labels.length; i++) {
      display_element.querySelector('#jspsych-html-button-response-button-' + i).addEventListener('click', 
      function(e){ // callback param (e) = event object, includes the html element it occurred on
        var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
        // switch to full screen (just in case - if they are not in full screen, it should have already been caught, but to be safe)
        var element = document.documentElement;
        if (element.requestFullscreen) { element.requestFullscreen(); }
        else if (element.mozRequestFullScreen) { element.mozRequestFullScreen(); }
        else if (element.webkitRequestFullscreen) { element.webkitRequestFullscreen(); }
        else if (element.msRequestFullscreen) { element.msRequestFullscreen(); }
        //console.log(choice)
        after_response(choice); // get the data-choice attribute and call after_response()
      });
      display_element.querySelector('#jspsych-html-button-response-button-' + i).className  += ' key';
    }



    // function to handle responses by the subject
    function after_response(choice) {
      //simulateClick();
      
      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      //display_element.querySelector('#jspsych-html-button-response-button-0').className += ' responded';

      jsPsych.pluginAPI.setTimeout(function() {
            display_element.innerHTML = ''; 
      }, 500);
      
      jsPsych.pluginAPI.setTimeout(function() {
            end_trial(); // call end_trial() as needed
      }, trial.trial_iti);
    
    }
  
    // function to end trial when it is time
    function end_trial() {
  
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // kill keyboard listeners
      jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);

      
      // gather the data to store for the trial
      var trial_data = {
        "rt": data.RT,
        "block": trial.block,
        "button_pressed": choice
      };
  
      // clear the display
      if (trial.clear_html_on_finish){
        display_element.innerHTML = '';
      }
  
      // move on to the next trial
      jsPsych.finishTrial(trial_data);
      
    }
  
    
    // hide then show button if timing is set
    if (trial.hideButtonDuration !== null) {
      var btns = document.querySelectorAll('.jspsych-html-button-response-button button'); 
      for(var i=0; i<btns.length; i++){
        btns[i].setAttribute('disabled', 'disabled'); //disabled attribute 
      }
      jsPsych.pluginAPI.setTimeout(function() {
        var btns = document.querySelectorAll('.jspsych-html-button-response-button button'); 
        for(var i=0; i<btns.length; i++){
          btns[i].removeAttribute('disabled', 'disabled'); // disabled attribute
        }
      }, trial.hideButtonDuration);
    }
    
       
    function simulateClick(choice) {
      var event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        isTrusted: true
      });
      display_element.querySelector('#jspsych-html-button-response-button-'+choice).dispatchEvent(event);
      event.target.textContent = event.target.textContent;
      event.target.className = 'jspsych-btn-key-resp';
    }
  };
  
  // on_load callback is triggered from jsPsych.doTrial() after this trial() method finishes

  return plugin;
})();
