import Ember from 'ember';
import TrackedComponent from '../tracked-component';
import config from '../../config/environment';
import { translationMacro as t } from "ember-i18n";

export default TrackedComponent.extend({
  i18n: Ember.inject.service(),
  isConnected: Ember.computed.alias('connection-manager.isConnected'),
  isDisconnectedFromServer: Ember.computed.alias('connection-manager.disconnectedFromServer'),
  logEnabled: Ember.computed.alias('logger.logEnabled'),
  queryParamManager: Ember.inject.service('query-param-manager'),
  mouseX: null,
  mouseY: null,
  isParticipantsListVisible: true,
  isToolboxVisible: true,
  feedbackUrl: config.feedback_url,
  activeSpeakerDisabledMessage: t('meeting-box.active_speaker_disabled'),
  activeSpeakerEnabledMessage: t('meeting-box.active_speaker_enabled'),
  /**
   * Services attrs
   */
  isMutedMic: Ember.computed.alias('meeting-manager.isMutedMic'),
  isMutedVideo: Ember.computed.alias('meeting-manager.isMutedVideo'),
  isMutedSpeaker: Ember.computed.alias('meeting-manager.isMutedSpeaker'),
  currentPreviewMode: Ember.computed.alias('meeting-manager.currentPreviewMode'),
  numPreferredParticipants: Ember.computed.alias('meeting-manager.numPreferredParticipants'), //Active speaker

  sessionInfo: Ember.computed.alias('meeting-manager.sessionInfo'),
  speakerVolume: 0.5,
  currentClickedVideo: null,

  updateViewWhenConnected: function () {
    var self = this;
    if (this.get('isConnected')) {
      console.debug("currentActiveChat meeting-box");
      console.debug(this.get('chat-manager').get("currentActiveChat"));
      // Fix: With this, the self view is muted in Firefox. It seems HTML muted attr is not working.
      if (config.environment !== "test" && Ember.$("#localVideo").get(0)) {
        Ember.$("#localVideo").get(0).muted = true;
      }

      console.debug("speakerVolume: ", self.get("speakerVolume"));

    }
  }.observes('isConnected'),

  /**
   * If we are expecting disconnection (i.e. user clicked 'disconnect') we redirect user to index page without
   * any feedback. In other case (unexpected disconnection) we will show some information.
   */
  expectDisconnectionFromServer: function () {
    if (!this.get('connection-manager').get('expectDisconnect')) {
      this.clearDataAndRedirectToJoinMeeting();
    }
  }.observes('isDisconnectedFromServer'),

  switchVideoStreams(thisVideoContainerParam){

    let thisVideoContainer;

    if (!thisVideoContainerParam) {
      thisVideoContainer = this.get("currentClickedVideo");
      this.set("currentClickedVideo", null);
    } else {
      thisVideoContainer = thisVideoContainerParam;
    }

    if (thisVideoContainer) {
      var mainStreamSrc;

      var mainVideoContainer = Ember.$('#mainVideoContainer');
      // var mainPaticipantDivId = 'participantDiv0';
      var mainVideoContainerId = mainVideoContainer.attr('id');
      var mainLabel = mainVideoContainer.find('.participant-title:first');
      var mainLabelId = mainLabel.attr('id');
      let mainVideo = mainVideoContainer.find('video:first')[0];
      let mainVideoId = mainVideoContainer.find('video:first').attr('id');
      var mainLabelContent = mainLabel.text();

      mainStreamSrc = mainVideo.srcObject;

      let thisVideoContainerId = thisVideoContainer.attr('id');
      var clickedLabel = thisVideoContainer.find('.participant-title:first');
      var thisLabelId = clickedLabel.attr('id');
      let thisVideo = thisVideoContainer.find('video:first')[0];
      let thisVideoId = thisVideoContainer.find('video:first').attr('id');
      var clickedLabelContent = clickedLabel.text();

      var thisStreamSrc;

      thisStreamSrc = thisVideo.srcObject;

      if (thisStreamSrc !== undefined && mainStreamSrc !== undefined) {

        mainVideo.srcObject = thisStreamSrc;
        thisVideo.srcObject = mainStreamSrc;

        //Label
        mainLabel.attr('id', thisLabelId);
        clickedLabel.attr('id', mainLabelId);
        mainLabel.text(clickedLabelContent);
        clickedLabel.text(mainLabelContent);

        //Video ID
        mainVideoContainer.find('video:first').attr('id', thisVideoId);
        thisVideoContainer.find('video:first').attr('id', mainVideoId);

        //Container
        let thisVideoDiv = thisVideoContainer.find('div:first').attr("id");
        thisVideoContainer.find('div:first').attr("id", Ember.$('#mainVideoContainer>div').attr('id'));
        Ember.$('#mainVideoContainer>div').attr('id', thisVideoDiv);

        mainVideo.play();
        thisVideo.play();
      }
    }

  },

  setPreferedView(){
    this._trackEvent('meeting-box', 'numPreferredToggle');
    var self = this;
    this.get('meeting-manager').setNumPreferredParticipantsToggle();
    this.get('vidyo-requests-api').clientLayoutSet(this.get('numPreferredParticipants'));
    if (this.get('numPreferredParticipants') === 1) {
      Ember.$('.status-changed.nag').text(self.get('activeSpeakerEnabledMessage'));

      self.switchVideoStreams(null);

    } else {
      Ember.$('.status-changed.nag').text(self.get('activeSpeakerDisabledMessage'));
    }
    Ember.$('.status-changed.nag').nag('show');
    Ember.run.later(function () {
      Ember.$('.status-changed.nag').nag('hide');
    }, 2000);
  },

  actions: {
    /**
     * Displays the feedback modal to send feedback
     */
    displayFeedbackModal(){
      console.debug("Display feedback modal");
      Ember.$('.modal-feedback').modal("show");
    },
    /**
     * Hides the small video streams
     */
    clientPreviewModeToggle(){
      this._trackEvent('meeting-box', 'clientPreviewModeToggle');
      this.get('meeting-manager').clientPreviewModeToggle();
      this.get('vidyo-requests-api').clientPreviewModeSet(this.get('currentPreviewMode'));

      Ember.$('#smallStreams').transition('fade down');
    },

    /**
     * Disconnects the meeting. If its triggered manually it is marked as expected, so it won't display an error message
     */
    disconnect() {
      console.debug("Component meeting-box: disconnect");
      this.get('connection-manager').setExpectDisconnect(true);
      if (this.get('vidyo-requests-api').disconnectMeeting()) {
        var self = this;
        Ember.run.later(function () {
          self.disconnectFromMeeting();
        }, 500);

      } else {
        console.debug("Component meeting-box: disconnect -> Cannot disconnect");
      }
    },

    /**
     * Mutes the local camera
     */
    muteLocalVideo(){
      this._trackEvent('meeting-box', 'muteLocalVideo');
      this.get('vidyo-requests-api').clientVideoMute(!this.get('isMutedVideo'));
    },
    /**
     * Mutes the local microphone
     */
    muteLocalMic(){
      this._trackEvent('meeting-box', 'muteLocalMic');
      this.get('vidyo-requests-api').clientMicrophoneMute(!this.get('isMutedMic'));

      var result = this.get('vidyo-requests-api').clientRequestGetVolumeAudioIn();
      console.debug("VOLUMEN IN: ", result);

    },
    /**
     * Mutes the speakers
     */
    muteSpeaker(){
      this._trackEvent('meeting-box', 'muteSpeaker');
      this.get('vidyo-requests-api').clientSpeakerMute(!this.get('isMutedSpeaker'));
    },

    /**
     * Changes the actual view to active or compact. This means that the active speaker will be switched automatically.
     */
    togglePreferedView(){
      this.setPreferedView();
    },

    /**
     * Opens the help modal
     */
    openHelpModal(){
      Ember.$('#modal-help').modal("show");
    },

  },

  /**
   * UI is initialized here
   */
  didInsertElement(){
    this._super(...arguments);
    var self = this;

    console.debug('didInsert Meeting Box');
    console.debug("currentActiveChat didInsert meeting-box");

    this.initializeClickableVideoEvents();

    Ember.run.later(function () {
      Ember.$('body').bind('mousemove', function (e) {
        if (self.get('isConnected')) {
          self.set('mouseX', e.pageX);
          self.set('mouseY', e.pageY);

          self.showToolbox();
          self.showParticipantsList();
          Ember.run.later(function () {
            if (self.get('isConnected')) {
              var x = e.pageX;
              var y = e.pageY;
              if (x === self.get('mouseX') && y === self.get('mouseY')) {
                self.hideToolbox();
                self.hideParticipantsList();
              }
            }
          }, 3000);
        }
      });
    }, 100);

    Ember.$('.tooltipped').popup();
    Ember.$('.dropdown.button').dropdown({
      on: 'hover'
    });

    Ember.$('.volume-popup')
      .popup({
        inline: true,
        hoverable: true,
        position: 'bottom left',
        delay: {
          show: 100,
          hide: 800
        },
        onShow: function () {
          Ember.run.later(function () {
            console.debug("Changing volume to " + self.get("speakerVolume"));
            Ember.$('#speaker-range').range('set value', self.get("speakerVolume"));
          }, 400);
        }
      });

    Ember.$('#speaker-range').range({
      min: 0,
      max: 1,
      start: self.get("speakerVolume"),
      step: 0.1,
      input: "#speaker-value",
      onChange: function (val) {
        self.set("speakerVolume", val);
        console.debug(self.get("onChange"));
        self.get('vidyo-requests-api').clientRequestSetVolumeAudioOut(val);

        // console.debug("VOLUME Out: ", val);
        Ember.$('audio,video').each(function () {
          // console.debug(Ember.$(this));
          Ember.$(this)[0].volume = val;
        });
      }
    });
  },

  showToolbox() {
    this.set('isToolboxVisible', true);
  },

  hideToolbox() {
    this.set('isToolboxVisible', false);
  },

  hideParticipantsList(){
    this.set('isParticipantsListVisible', false);
  },
  showParticipantsList(){
    this.set('isParticipantsListVisible', true);
  },

  /**
   * For now this only works on Chrome. It swaps the main video with the clicked one to make it fullscreen.
   */
  initializeClickableVideoEvents() {

    var self = this;

    Ember.$('.clickable-video').on('click', function () {
      var previousPreferredParticipantsNumber = self.get('numPreferredParticipants');
      console.debug("Previous participants number: " + previousPreferredParticipantsNumber);
      if (previousPreferredParticipantsNumber !== 0) {
        console.debug("Changing preferred participants number");
        self.get('meeting-manager').setNumPreferredParticipants(0);
        self.get('vidyo-requests-api').clientLayoutSet(self.get('numPreferredParticipants'));

        Ember.$('.status-changed.nag').text('Active speaker disabled');
        Ember.$('.status-changed.nag').nag('show');
        Ember.run.later(function () {
          Ember.$('.status-changed.nag').nag('hide');
        }, 2000);
      }
      console.debug("maindiv: " + Ember.$('#participantDiv0').find('video:first').attr('id'));
      console.debug("maindiv: " + Ember.$(this).find('video:first').attr('id'));

      if (Ember.$('#participantDiv0').find('video:first').attr('id') !== Ember.$(this).find('video:first').attr('id')) {
        console.debug("Not ClickedMainDiv");
        self.set("currentClickedVideo", Ember.$(this));
      } else {
        console.debug("ClickedMainDiv");
        self.set("currentClickedVideo", null);
      }
      self.switchVideoStreams(Ember.$(this));

    });
  },

  /**
   * This will send an action to the parent element of the component (another component or a route).
   * This reference should be passed on the template.
   */
  disconnectFromMeeting() {
    if (this.get('shareWindow')) {
      this.get('shareWindow').close();
    }
    this.clearDataAndRedirectToJoinMeeting();
    this.get('sharing-manager').setDefaultValues();
  },

  /**
   * The meeting data can be removed here and then it will redirect to the index by sending an action to its parent.
   */
  clearDataAndRedirectToJoinMeeting() {
    console.debug('clearDataAndRedirectToJoinMeeting');
    Ember.$('.tooltipped').popup("hide all");
    this.sendAction('redirectToJoinMeeting');
  }

});
