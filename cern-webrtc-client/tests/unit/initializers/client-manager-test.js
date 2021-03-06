import Ember from 'ember';
import ClientManagerInitializer from 'cern-webrtc-client/initializers/client-manager';
import { module, test } from 'qunit';

let application;

module('Unit | Initializer | client manager', {
  beforeEach() {
    Ember.run(function() {
      application = Ember.Application.create();
      application.deferReadiness();
    });
  }
});

// Replace this with your real tests.
test('it works', function(assert) {
  ClientManagerInitializer.initialize(application);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
