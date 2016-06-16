/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';

$(document).ready(function() {
  var context = '/proxy/api';
  var dialogs = [];
  var conversation = {};

  // jquery DOM nodes
  // dialog nodes
  var $dialogs = $('.dialog-container');
  var $dialogsLoading = $('.dialogs-loading');
  var $dialogsError = $('.dialogs-error');

  // conversation nodes
  var $conversationDiv = $('.conversation-div');
  var $conversation = $('.conversation-container');
  var $information = $('.information-container');
  var $profile = $('.profile-container');
  var $userInput = $('.user-input');

  var getErrorMessageFromResponse = function(response){
    try{
      if(!response.responseText) return '';
      var errorObject = JSON.parse(response.responseText);
      if(!errorObject.error) return '';
      return errorObject.error;
    }catch(e){
      if(e instanceof SyntaxError)
        return ''
      throw e
    }
  }

  /**
   * Loads the dialog-container
   */
  var getDialogs = function() {
    $dialogs.empty();
    $dialogsLoading.show();
    $dialogsError.hide();

    $.get(context + '/v1/dialogs')
    .done(function(data) {
      if (data === '')
        return;
      dialogs = data.dialogs;
      dialogs.forEach(function(dialog, index) {
        createDialogTemplate(dialog, index).appendTo($dialogs);
       });
    }).fail(function(response) {
      var errorText = getErrorMessageFromResponse(response);
      $dialogsError.show();
      $dialogsError.find('.errorMsg').html('Error getting the dialogs' + (errorText?': '+errorText:'.'));
    })
    .always(function(){
      $dialogsLoading.hide();
    });
  };
  // initial load
  getDialogs();

  var startConversation = function(index) {
    var dialog = dialogs[index];

    $conversation.empty();
    $conversationDiv.show();

    var $dialogTemplate =  $('*[data-index="'+index+'"]');
    $dialogTemplate.find('.new-dialog-container').hide();
    $dialogTemplate.find('.dialog-loading').show();

    $.post(context + '/v1/dialogs/' + dialog.dialog_id + '/conversation', {input: ''})
    .done(function(data) {
      $conversation.empty();
      $information.empty();
      $dialogTemplate.find('.new-dialog-container').show();
      $dialogTemplate.find('.dialog-loading').hide();

      // show the dialogs
      $('.dialog-selection').animate({height : '0px'}, 500, function() {
        $('.dialog-selection').hide();
        $('.dialog-selection-link').show();
        //scrollToBottom();
      });
      
      // TODO: Need to either hide all the other stuff or navigate to new page
  
      
      
      // save dialog, client and conversation id
      conversation.conversation_id = data.conversation_id;
      conversation.client_id = data.client_id;
      conversation.dialog_id = dialog.dialog_id;
      $('<div/>').text('Dialog name: ' + dialog.name).appendTo($information);
      $('<div/>').text('Dialog id: ' + conversation.dialog_id).appendTo($information);
      $('<div/>').text('Conversation id: ' + conversation.conversation_id).appendTo($information);
      $('<div/>').text('Client id: ' + conversation.client_id).appendTo($information);



      var text = data.response.join('&lt;br/&gt;');
      
      $('<div class="chat-watson-cont"/>').html($('<p class="chat-watson"/>')
        .html($('<div/>').html(text)
        .text()))
        .appendTo($conversation);
    });
    scrollToBottom();
    $('.margin-bottom.service-container').hide();
  };

  /**
   * Converse function
   */
  var conductConversation = function(){
    // service path and parameters
    var path = context + '/v1/dialogs/' + conversation.dialog_id + '/conversation';
    var params = {
      input: $userInput.val(),
      conversation_id: conversation.conversation_id,
      client_id: conversation.client_id
    };

    $userInput.val('').focus();

    $('<div class="chat-human-cont"/>').html($('<p class="chat-human"/>')
      .html(params.input))
      .appendTo($conversation);

    scrollToBottom();

    //Post input to tone-analyser
    //if more than 3 words then:
    postInputToToneAnalyser(params.input);

    $.post(path, params).done(function(data) {
      var text = data.response.join('&lt;br/&gt;');
      $('<div class="chat-watson-cont"/>').html($('<p class="chat-watson"/>')
        .html($('<div/>').html(text).text()))
        .appendTo($conversation);

      getProfile();
      scrollToBottom();
      findKeywordForImg();
      scrollToBottom();
    });
  };

  $('.input-btn').click(conductConversation);
  $userInput.keyup(function(event){
    if(event.keyCode === 13) {
      conductConversation();
    }
  });

  var deleteDialog = function(dialogIndex) {
    var dialog = dialogs[dialogIndex];
    if (!confirm('Are you sure you wish to delete dialog flow: ' + dialog.name)) {
      return;
    }
    var $dLoading = $('[data-index='+dialogIndex+']').find('.dialog-loading');
    var $dName = $('[data-index='+dialogIndex+']').find('.dialog-info');
    $dLoading.show();
    $dName.hide();
    $.ajax({
      type: 'DELETE',
      url: context + '/v1/dialogs/'+ dialog.dialog_id,
      dataType: 'html'
    })
    .done(function(){
      setTimeout(getDialogs, 2000);
    })
    .fail(function(e){
      var errorText = getErrorMessageFromResponse(response);
      $dialogsError.show();
      $dialogsError.find('.errorMsg').html('Error deleting the dialogs' + (errorText?': '+errorText:'.'));
      $dialogsError.find('.errorMsg').text('Error  the dialogs.');
      $dName.show();
    })
    .always(function(){
      $dLoading.hide();
    });
  };

  var getProfile = function() {
    var path = context + '/v1/dialogs/' + conversation.dialog_id + '/profile';
    var params = {
      conversation_id: conversation.conversation_id,
      client_id: conversation.client_id
    };

    $.get(path, params).done(function(data) {
      $profile.empty();
      data.name_values.forEach(function(par) {
        if (par.value !== '')
          $('<div/>').text(par.name + ': ' + par.value).appendTo($profile);
      });
      console.debug("profile is: " + $profile);
    });
  };

  var replaceDialog = function(dialogIndex) {
    console.log('replace dialog:' + dialogIndex);
  };

  var createDialog = function() {
    if ($('#name').val() === '' || $('#file').val() === '')
      return;

    $('#new-dialog').hide();
    $('#new-dialog-loading').show();

    $('.new-dialog-container').removeClass('selected');
    $.ajax({
      type: 'POST',
      url: context + '/v1/dialogs',
      data: new FormData($('.dialog-form')[0]),
      processData: false,
      contentType: false
    }).done(function(){
      $('.dialog-flow-title').show();
      $('.new-dialog-flow-content').hide();
      $('#new-dialog').removeClass('selected');
      $('#name').val('');
      $('#file').replaceWith($('#file').val('').clone(true));
      getDialogs();
    })
    .fail(function(response){
      var errorText = getErrorMessageFromResponse(response);
      $dialogsError.show();
      $dialogsError.find('.errorMsg').html('Error creating the dialogs' + (errorText?': '+errorText:'.'));
    })
    .always(function(){
      $('#new-dialog-loading').hide();
      $('#new-dialog').show();
    });
  };

  $('.create-btn').click(createDialog);
  $('.dialog-form').on('submit',function(event){
    event.preventDefault() ;
  });

  var scrollToBottom = function(){
    $('body, html').animate({ scrollTop: $('body').height() + 'px' });
  };

  /**
   * show creating a new dialog flow inputs
  */
  $('#new-dialog').click(function(){
    if($('.new-dialog-flow-content').css('display') === 'none'){
      $(this).addClass('selected');
      $('.dialog-flow-title').hide();
      $('.new-dialog-flow-content').show();
    }
  });

  /**
   * Creates a DOM element that represent a dialog in the UI
   * @param  {object} dialog The dialog object {id:'' name:''}
   * @param  {int} index  the index in the dialog array
   * @return {jQuery DOM element} DOM element that represents a dialog
   */
  var createDialogTemplate = function(dialog,index) {
    var $dialogTemplate = $('.dialog-template').last().clone();

    // save the index
    $dialogTemplate.attr('data-index',index);

    // dialog name
    $dialogTemplate.find('.dialog-name-span')
      .text(dialog.name);

    $dialogTemplate.click(function(){
        $dialogTemplate.find('.dialog-loading').show();
        startConversation(index);
      });

    // edit
    $dialogTemplate.find('.edit').click(function(e){
        e.stopPropagation();
        $(this).blur();
        var url = context + '/../ui/designtool/' + dialog.dialog_id;
        window.open(url, '_blank');
    });

    // // replace
    // $dialogTemplate.find('.replace').click(function(e){
    //     e.stopPropagation();
    //     $(this).blur();
    //     replaceDialog(index);
    // });

    // delete
    $dialogTemplate.find('.delete').click(function(e){
        e.stopPropagation();
        $(this).blur();
        deleteDialog(index);
    });

    // dialog actions
    $dialogTemplate.find('.new-dialog-container')
    .hover(function(){
      $dialogTemplate.find('.dialog-links').css('visibility', 'visible');
    },function(){
      $dialogTemplate.find('.dialog-links').css('visibility', 'hidden');
    });

    return $dialogTemplate;
  };


  // show the dialogs
  $('.dialog-selection-link').click(function(){
    var self = this;
    $('.dialog-selection').animate({height : '100%'}, 0, function() {
      $('.dialog-selection').show();
      $(self).hide();
    });
  });

//search function to find response with keyword for img display
//get array of elements
var findKeywordForImg = function(){
  var eleArr = $('.conversation-well :last-child p');
  if(eleArr.text().search('We have a large range of them in different constructions') !== -1){
    attachwoodShedImg();
  }
  else if(eleArr.text().search('use that as your budget') !== -1){
    attachHtmlContent();
  }
};
// search in each
// if find the one then append the img



  //Image of wooden sheds TODO: replace with HTML
  var woodShedImg = '<img class="sugg-chat" src="../images/constructionStyle.png">';
  var attachwoodShedImg = function(){
	  $('.conversation-well').append(woodShedImg);
  };
  
  //HTML for 3 suggested sheds
  // 1. create the container element
  var targetEleId = 'someClass';
  var attachHtmlContent = function(){
	  var htmlContainer = '<div id="' + targetEleId + '"></div>';
	  $('.conversation-well').append(htmlContainer);  
	  //2. load the 
	  $('#' + targetEleId).load('/register .reg-container');
	  //$('.conversation-well').load('/register .reg-container');
  };

  //POST input to tone analysis
  var postInputToToneAnalyser = function(data){
     $.ajax({
             type: "POST",
             url: "https://watson-api-explorer.mybluemix.net/tone-analyzer/api/v3/tone?version=2016-05-19",
             data: JSON.stringify(data),
             contentType: "text/plain",
             success: function (status, result, data) {

                 console.debug(":::::: index.js POST successfully sent to tone-analyzer ::::::::::::");
                 console.debug(data.responseText);
             },

             error: function (jqXHR, status) {
                 // error handler
                 console.log(jqXHR);
                 console.debug('fail' + status.code);
             }
          }).done(function(data){
            var emotion_tones = data.document_tone.tone_categories[0];
            console.log(emotion_tones);
            var profileObj = {
              "client_id": conversation.client_id ,
              "name_values": [
                {
                  "name": "PowerReq",
                  "value": "Some value"
                },
                {
                  "name": "ToneAnger",
                  "value": emotion_tones.tones[0].score
                },
                {
                  "name": "ToneDisgust",
                  "value": emotion_tones.tones[1].score
                },
                {
                  "name": "ToneFear",
                  "value": emotion_tones.tones[2].score
                },
                {
                  "name": "ToneJoy",
                  "value": emotion_tones.tones[3].score
                },
                {
                  "name": "ToneSadness",
                  "value": emotion_tones.tones[4].score
                }
              ]
            };
            updateDialogWithToneAnalysis(data, profileObj);
            console.debug(data);
          });
    };

    var updateDialogWithToneAnalysis = function(data, profileObj){
      $.ajax({
          type: "PUT",
          url: context + "/v1/dialogs/" + conversation.dialog_id +"/profile",
          contentType: "application/json",
          data: JSON.stringify(profileObj),
          success: function (status) {
            console.debug("successful put with: " + status);
          },
          error: function (jqXHR, status){
                  // error handler
                 console.log(jqXHR);
                 console.debug('fail' + status.code);
                 console.debug(data.responseText);
             }

        });
    };


});
