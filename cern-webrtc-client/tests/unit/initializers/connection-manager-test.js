import Ember from 'ember';
import ConnectionManagerInitializer from 'cern-webrtc-client/initializers/connection-manager';
import { module, test } from 'qunit';

let application;

module('Unit | Initializer | connection manager', {
  beforeEach() {
    Ember.run(function() {
      application = Ember.Application.create();
      application.deferReadiness();
    });
  }
});

// Replace this with your real tests.
test('it works', function(assert) {
  ConnectionManagerInitializer.initialize(application);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
