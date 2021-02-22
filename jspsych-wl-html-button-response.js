/**
 * jspsych-html-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["wl-html-button-response"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'wl-html-button-response',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The HTML string to be displayed'
      },
      choices: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Choices',
        default: undefined,
        array: true,
        description: 'The labels for the buttons.'
      },
      button_html: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button HTML',
        default: '<button class="jspsych-btn">%choice%</button>', // %choice% is a regexp-friendly string that will be filled later via buttons[i].replace
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
        default: false,
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

    // the stimulus that the buttons are responding to (HTML code specified by user)
    var html = '<div id="jspsych-html-button-response-stimulus">'+trial.stimulus+'</div>';

    // create the display buttons
    var buttons = [];
    if (Array.isArray(trial.button_html)) { // if the html for each button is split up in an array
      if (trial.button_html.length == trial.choices.length) {
        buttons = trial.button_html; // set directly
      } else {
        console.error('Error in html-button-response plugin. The length of the button_html array does not equal the length of the choices array');
      }
    } else { // if the html is a single string (buttons will be identical?)
      for (var i = 0; i < trial.choices.length; i++) { // go through the choices vector
        buttons.push(trial.button_html); // create an array entry for each choice with the same html string
      }
    }
    html += '<div id="jspsych-html-button-response-btngroup">'; // open a button group div in the html
    
    // if no button location specified
    if (trial.button_location_y === null) { 
      for (var i = 0; i < trial.choices.length; i++) { // for each choice
        var str = buttons[i].replace(/%choice%/g, trial.choices[i]); // replace placeholder text with actual choice
        html += '<div class="jspsych-html-button-response-button" disable style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
      } // append a response button div within the button group div, storing the index of the choice in the data-choice attribute
    }
    // if button location provided  
    else { 
      for (var i = 0; i < trial.choices.length; i++) { // for each choice
        var str = buttons[i].replace(/%choice%/g, trial.choices[i]); // replace placeholder text with actual choice
        html += '<div class="jspsych-html-button-response-button" disable style="display: block; position: absolute; top: '+(trial.button_location_y-6)+ 'px; right: 45%; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
      }
    }
    
    html += '</div>'; // close the button group div

    //show prompt if there is one
    if (trial.prompt !== null) {
      html += trial.prompt;
    }
    display_element.innerHTML = html; // put the completed html into the HTMLElement (display_element)
    // start time
    var start_time = performance.now();

    // add event listeners to buttons
    for (var i = 0; i < trial.choices.length; i++) {
      display_element.querySelector('#jspsych-html-button-response-button-' + i).addEventListener('click', 
      function(e){ // callback param (e) = event object, includes the html element it occurred on
        var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
        after_response(choice); // get the data-choice attribute and call after_response()
      });
    }

    // store response
    var response = {
      rt: null,
      button: null
    };
  
    // function to handle responses by the subject
    function after_response(choice) {
  
      // measure rt
      var end_time = performance.now();
      var rt = end_time - start_time;
      response.button = choice; // these will get loaded into a trial_data object later, which goes to finishTrial()...
      response.rt = rt;
      
      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      display_element.querySelector('#jspsych-html-button-response-stimulus').className += ' responded';
  
      // disable all the buttons after a response
      // 1. get a list of all the things in the document matching... (dot notation specifies class, no notation (button) is element (could use h, p, input, etc.))
      var btns = document.querySelectorAll('.jspsych-html-button-response-button button'); 
      for(var i=0; i<btns.length; i++){
        //btns[i].removeEventListener('click');
        btns[i].setAttribute('disabled', 'disabled'); //disabled attribute of button (the attribute is boolean, if it is present it is disabled, but we set to "disabled" to be XHTML-compliant)
      }
  
      if (trial.response_ends_trial) {
        end_trial(); // call end_trial() as needed
      }
    }
  
    // function to end trial when it is time
    function end_trial() {
  
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();
  
      // gather the data to store for the trial
      var trial_data = {
        "rt": response.rt,
        "stimulus": trial.stimulus,
        "button_pressed": response.button,
        "button_labels": trial.choices
      };
  
      // clear the display
      if (trial.clear_html_on_finish){
        display_element.innerHTML = '';
      }
  
      // move on to the next trial
      jsPsych.finishTrial(trial_data);
      
      // finishTrial will call the on_finish callback after the following:
          /* NOTE: DO NOT UNCOMMENT, CODE COPIED FROM jspsych.js
        //                 // write trial_data
        // 1.              jsPsych.data.write(data);
        //                 // get back the data with all of the defaults in
        // 2.              var trial_data = jsPsych.data.get().filter({trial_index: global_trial_index});
        //                 // trial-level callbacks receive a reference to the values of the DataCollection
        // 3.              var trial_data_values = trial_data.values()[0];
        //                 // handle the callback specified at the plugin-level
        // 4.              current_trial.on_finish(trial_data_values);
        //                 // handle the callback specified at the whole-experiment level
        // 5.              opts.on_trial_finish(trial_data_values);
        */
    }
  
    // hide image if timing is set
    if (trial.stimulus_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        display_element.querySelector('#jspsych-html-button-response-stimulus').style.visibility = 'hidden';
      }, trial.stimulus_duration);
    }
  
    // end trial if time limit is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        end_trial();
      }, trial.trial_duration);
    }
    
    // hide then show button if timing is set
    if (trial.hideButtonDuration !== null) {
      var btns = document.querySelectorAll('.jspsych-html-button-response-button button'); 
      for(var i=0; i<btns.length; i++){
        btns[i].setAttribute('disabled', 'disabled'); 
      }
      jsPsych.pluginAPI.setTimeout(function() {
        var btns = document.querySelectorAll('.jspsych-html-button-response-button button'); 
        for(var i=0; i<btns.length; i++){
          btns[i].removeAttribute('disabled', 'disabled'); // disabled attribute
        }
      }, trial.hideButtonDuration);
    }

  };
  // on_load callback is triggered from jsPsych.doTrial() after this trial() method finishes

  return plugin;
})();
